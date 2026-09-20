// ─────────────────────────────────────────────────────────────────────────────
// Voter Hub dynamic location data
// ─────────────────────────────────────────────────────────────────────────────
// Extracted verbatim from index.html (it began at line 31265 of the pre-split
// document) as part of the first-paint pass. Not a rewrite: the code below is
// byte-for-byte what was inline, and the <script src> that replaced it sits at
// the same position in the document, so execution order and global scope are
// unchanged. It moved out so the HTML stops carrying it on every single visit —
// external scripts are cached and V8-code-cached across loads; inline script in
// a revalidated document is re-downloaded and re-compiled every time.
// ─────────────────────────────────────────────────────────────────────────────
  // ═══ Voter Hub Dynamic Location Data (now fully dynamic/national — no hardcoded state defaults) ═══
  window._vhCountyData = {};
  window._vhCurrentCounty = '';

  // ═══ Incumbent vs Candidate status ═══
  // Single source of truth for whether a politician currently holds the seat
  // ("Currently in Office") or is running for one ("Candidate"). Status is read
  // from the office string (and optional rank field), so the same logic powers
  // both the JS-rendered cards and the static Power Map cards.
  window._pdxOfficeStatusFromText = function(officeText) {
    var o = String(officeText || '').toLowerCase();
    if (o.indexOf('former') !== -1 || o.indexOf('ex-') !== -1) return 'former';
    if (o.indexOf('candidate') !== -1 || o.indexOf('nominee') !== -1 || o.indexOf('challenger') !== -1) return 'candidate';
    return 'office';
  };
  window._pdxOfficeStatus = function(d) {
    if (!d) return 'office';
    var rank = String(d.rank || '').toLowerCase();
    if (rank === 'candidate' || rank === 'nominee') return 'candidate';
    return window._pdxOfficeStatusFromText(d.office);
  };

  // ── PDXStatus — canonical politician status / candidacy model ────────────────
  // One clear, small vocabulary for "where is this person, politically, right
  // now", resolved from the fields a record ALREADY carries (office text, rank,
  // candidacyStatus/status, nextElection). No new data or schema — this just
  // reads the existing signals and speaks a single language so the profile
  // header, cards, team chips, My Team and Compare all label someone the same
  // way instead of the old vague "Former Office" / bare "Candidate" tags.
  //
  // Six states (LOCKED):
  //   incumbent          — currently holds the office
  //   current_candidate  — actively running right now (on the ballot this cycle)
  //   former_candidate   — ran before, not currently running (lost / withdrew too)
  //   exploring          — signaling interest, not officially launched
  //   not_running        — publicly sitting this cycle out
  //   retired            — out of elected politics / a former officeholder
  window.PDXStatus = (function () {
    var STATES = {
      incumbent:         { key:'incumbent',         label:'Incumbent',         ico:'✅', color:'#4ade80',
                           bg:'rgba(34,197,94,0.22)',  bd:'rgba(34,197,94,0.75)',  fg:'#4ade80' },
      current_candidate: { key:'current_candidate', label:'Current Candidate', ico:'🗳️', color:'#93c5fd',
                           bg:'rgba(59,130,246,0.18)', bd:'rgba(59,130,246,0.5)',  fg:'#93c5fd' },
      former_candidate:  { key:'former_candidate',  label:'Former Candidate',  ico:'↩', color:'#c4b5fd',
                           bg:'rgba(139,92,246,0.16)', bd:'rgba(167,139,250,0.5)', fg:'#c4b5fd' },
      exploring:         { key:'exploring',         label:'Exploring',         ico:'🔎', color:'#fcd34d',
                           bg:'rgba(245,200,66,0.15)', bd:'rgba(245,200,66,0.5)',  fg:'#fcd34d' },
      not_running:       { key:'not_running',       label:'Not Running',       ico:'—', color:'#9fb4d4',
                           bg:'rgba(148,163,184,0.14)',bd:'rgba(148,163,184,0.5)', fg:'#cbd5e1' },
      retired:           { key:'retired',           label:'Retired',           ico:'⏳', color:'#cbd5e1',
                           bg:'rgba(148,163,184,0.15)',bd:'rgba(148,163,184,0.4)', fg:'#cbd5e1' }
    };
    var ORDER = ['incumbent', 'current_candidate', 'former_candidate', 'exploring', 'not_running', 'retired'];

    // A record may also carry a concluded-race flag (lost_primary / withdrew /
    // eliminated). Those are all FORMER-candidate states, but the specific label
    // is a more useful current-cycle read, so keep it for the badge.
    function concludedShort(cs) {
      if (cs === 'lost_primary' || cs === 'eliminated_primary') return 'Lost Primary';
      if (cs === 'withdrew' || cs === 'withdrawn' || cs === 'suspended') return 'Withdrew';
      // A defeated incumbent / former officeholder reads better as "Defeated" than
      // the candidate-flavored "Out of Race" (still resolves to former_candidate).
      if (cs === 'defeated' || cs === 'voted_out' || cs === 'former_officeholder') return 'Defeated';
      if (cs === 'eliminated' || cs === 'lost' || cs === 'conceded') return 'Out of Race';
      return null;
    }

    // resolve(d) → one of the six canonical keys. `d` may be a record OR one of
    // the legacy office-status strings ('office' | 'candidate' | 'former').
    function resolve(d) {
      if (d == null) return 'incumbent';
      if (typeof d === 'string') {
        var v = d.toLowerCase().trim();
        if (v === 'office' || v === 'incumbent' || v === 'in_office') return 'incumbent';
        if (v === 'candidate' || v === 'nominee' || v === 'running' || v === 'active') return 'current_candidate';
        if (v === 'former') return 'retired';
        return STATES[v] ? v : 'incumbent';
      }
      var cs = String(d.candidacyStatus || d.status || '').toLowerCase().trim();
      if (cs) {
        if (cs === 'incumbent' || cs === 'office' || cs === 'in_office') return 'incumbent';
        if (cs === 'retired') return 'retired';
        if (cs === 'not_running' || cs === 'not_seeking' || cs === 'retiring') return 'not_running';
        if (cs === 'exploring' || cs === 'exploratory' || cs === 'potential' || cs === 'considering') return 'exploring';
        if (cs === 'former_candidate' || cs === 'ran_before') return 'former_candidate';
        if (concludedShort(cs)) return 'former_candidate';
        if (cs === 'active' || cs === 'running' || cs === 'candidate' || cs === 'nominee') return 'current_candidate';
      }
      // Fall back to the office text / rank signals.
      var office = String(d.office || '').toLowerCase();
      var rank = String(d.rank || '').toLowerCase();
      var isCand = rank === 'candidate' || rank === 'nominee' ||
        office.indexOf('candidate') !== -1 || office.indexOf('nominee') !== -1 || office.indexOf('challenger') !== -1;
      var isFormer = office.indexOf('former') !== -1 || office.indexOf('ex-') !== -1;
      if (isFormer && isCand) return 'former_candidate';   // e.g. "Former U.S. Senate Candidate"
      if (isCand) return 'current_candidate';
      if (isFormer) return 'retired';
      return 'incumbent';
    }

    function state(keyOrRecord) {
      var k = (typeof keyOrRecord === 'string' && STATES[keyOrRecord]) ? keyOrRecord : resolve(keyOrRecord);
      return STATES[k] || STATES.incumbent;
    }

    // The clearest short label for a record. For a concluded 2026 candidate the
    // precise outcome (Lost Primary / Withdrew) reads better than the generic
    // "Former Candidate"; for an on-the-ballot candidate, "2026 Candidate".
    function label(d) {
      var k = resolve(d);
      if (typeof d !== 'string') {
        var cs = String((d && (d.candidacyStatus || d.status)) || '').toLowerCase().trim();
        var cShort = concludedShort(cs);
        if (k === 'former_candidate' && cShort) return cShort;
        if (k === 'current_candidate' && typeof window._pdx2026Candidate === 'function' && window._pdx2026Candidate(d)) return '2026 Candidate';
      }
      return STATES[k].label;
    }

    return { STATES: STATES, ORDER: ORDER, resolve: resolve, state: state, label: label };
  })();

  // Returns the badge HTML. Accepts either a politician data object or a
  // pre-computed status string ('office' | 'candidate' | 'former').
  window._pdxStatusBadge = function(statusOrData, opts) {
    opts = opts || {};
    var sm = opts.size === 'sm';
    var fs = sm ? '0.5rem' : '0.6rem';
    var pad = sm ? '0.1rem 0.42rem' : '0.16rem 0.5rem';
    var base = 'display:inline-flex;align-items:center;gap:0.25rem;vertical-align:middle;font-family:\'Barlow Condensed\',sans-serif;font-weight:700;letter-spacing:0.07em;text-transform:uppercase;border-radius:999px;white-space:nowrap;line-height:1.15;font-size:' + fs + ';padding:' + pad + ';';

    // Canonical status via the shared window.PDXStatus model, so every surface
    // that calls this badge speaks the same six-state vocabulary (Incumbent /
    // Current Candidate / Former Candidate / Exploring / Not Running / Retired).
    var _key = window.PDXStatus.resolve(statusOrData);
    var _lbl = window.PDXStatus.label(statusOrData);
    var _st = window.PDXStatus.state(_key);
    var _ico = _st.ico, _bg = _st.bg, _bd = _st.bd, _fg = _st.fg, _extra = '';

    // Incumbent keeps the elevated green treatment (glow + heavier weight) so
    // "actually holds the seat" stays the strongest signal on any card.
    if (_key === 'incumbent') _extra = 'box-shadow:0 0 10px rgba(34,197,94,0.4);font-weight:800;';

    // A concluded 2026 race (lost primary / withdrew / out) is a former-candidate
    // state, but the precise outcome is a more honest current-cycle read than a
    // generic "Former Candidate": warm red for an elimination, ✖ for a withdrawal.
    if (_key === 'former_candidate') {
      var _cs = (typeof statusOrData !== 'string') ? String(statusOrData.candidacyStatus || statusOrData.status || '').toLowerCase().trim() : '';
      if (_cs === 'lost_primary' || _cs === 'eliminated_primary' || _cs === 'eliminated' || _cs === 'lost' || _cs === 'defeated' || _cs === 'conceded') {
        _bg = 'rgba(220,38,38,0.14)'; _bd = 'rgba(248,113,113,0.45)'; _fg = '#fca5a5'; _ico = '✖';
      } else if (_cs === 'withdrew' || _cs === 'withdrawn' || _cs === 'suspended') {
        _ico = '✖';
      }
    }

    return '<span class="pdx-status-badge pdx-status-' + _key + '" style="' + base +
      'background:' + _bg + ';border:1px solid ' + _bd + ';color:' + _fg + ';' + _extra + '">' +
      _ico + ' ' + _lbl + '</span>';
  };

  // Unified "full field for this seat" header. Given the counts of people who
  // currently hold the seat, who are running for it, and who held it before, it
  // returns a single compact header that frames the one combined grid below —
  // a title, a one-line tally, and a colour legend (green = current officeholder,
  // blue = candidate). This is what lets a district seat show the incumbent and
  // every challenger together, in one place, with the roles still obvious at a
  // glance. Returns '' when there is nothing meaningful to frame (a single record
  // with no contest), so simple one-person seats stay uncluttered.
  //   opts.openSeat  — true when candidates are running but no incumbent holds it
  //   opts.compact   — smaller heading (used inside dense All-Politicians districts)
  window._pdxSeatFieldHead = function(nOffice, nCand, nFormer, opts) {
    opts = opts || {};
    nOffice = nOffice || 0; nCand = nCand || 0; nFormer = nFormer || 0;

    // The header earns its space only when there are two roles to tell apart: a
    // sitting officeholder AND at least one challenger, or an open-seat field of
    // two or more candidates. A lone record, or a list that is purely sitting
    // officeholders (e.g. both U.S. Senators), needs no "who's who" key, so we
    // return nothing and let the cards' own status badges speak.
    var isMix = nOffice > 0 && nCand > 0;
    var isOpenField = opts.openSeat && nCand > 1;
    if (!isMix && !isOpenField) return '';

    var title, ico;
    if (opts.openSeat) { ico = '🗳️'; title = 'Open Seat — The Full Field'; }
    else { ico = '⚔️'; title = 'This Seat — Incumbent & Challengers'; }

    var tally = [];
    if (nOffice) tally.push('<b style="color:#4ade80;">' + nOffice + '</b> currently in office');
    if (nCand) tally.push('<b style="color:#93c5fd;">' + nCand + '</b> running' + (opts.openSeat ? ' (open seat)' : ''));
    var sub = tally.length ? '<div class="pdx-field-head-sub">' + tally.join(' · ') + ' — shown together so you can see the whole race at once.</div>' : '';

    var keys = '';
    if (nOffice) keys += '<span class="pdx-field-key pdx-field-key-office"><span class="pdx-field-dot"></span>Current officeholder' + (nOffice > 1 ? 's' : '') + '</span>';
    if (nCand) keys += '<span class="pdx-field-key pdx-field-key-cand"><span class="pdx-field-dot"></span>Candidate' + (nCand > 1 ? 's' : '') + ' running</span>';
    var legend = '<div class="pdx-field-legend">' + keys + '</div>';

    var titleStyle = opts.compact ? ' style="font-size:0.8rem;"' : '';
    var headCls = 'pdx-field-head'
      + (opts.openSeat ? ' pdx-field-head--open' : '')
      + (opts.compact ? ' pdx-field-head--compact' : '');
    return '<div class="' + headCls + '">' +
        '<div class="pdx-field-head-title"' + titleStyle + '><span class="pdx-field-head-ico" aria-hidden="true">' + ico + '</span><span>' + title + '</span></div>' +
        sub +
        legend +
      '</div>';
  };

  // A labeled, colour-coded rail that separates one role tier from the next
  // INSIDE a single unified seat section — "🏛 Currently holds this seat" (green)
  // above the incumbent grid, "🗳️ Running for this seat" (blue) above the
  // challenger grid. It keeps the incumbent and every candidate in one place
  // while making the who-holds-it / who's-running split obvious at a glance,
  // without the voter having to read each card's status badge. Pairs with the
  // existing former-holders divider so all three role rails read as one family.
  //   kind  — 'office' | 'cand'
  //   n     — count shown in the rail
  //   opts.openSeat — true to label the challenger rail as an open-seat field
  window._pdxSeatRoleDivider = function(kind, n, opts) {
    opts = opts || {};
    n = n || 0;
    var ico, label, cls;
    if (kind === 'office') {
      cls = 'is-office'; ico = '🏛';
      label = 'Currently holds this seat';
    } else {
      cls = 'is-cand'; ico = '🗳️';
      label = opts.openSeat ? 'On the ballot for this open seat' : 'Running for this seat';
    }
    var nTxt = n ? ' <span class="pdx-field-role-n">(' + n + ')</span>' : '';
    return '<div class="pdx-field-role-divider ' + cls + '">' +
        '<span class="pdx-field-role-pill"><span class="pdx-field-role-dot"></span>' +
          '<span aria-hidden="true">' + ico + '</span> ' + label + nTxt + '</span>' +
        '<span class="pdx-field-role-rule"></span>' +
      '</div>';
  };

  // ─── Thin / early-stage record classifiers ──────────────────────────────
  // Shared signals used across cards, lists and the profile modal so a
  // politician with little tracked data reads as *intentional and honest*
  // ("2026 Candidate", "Limited Record", "Early in Term") instead of broken.

  // True when the seat is on the 2026 ballot, read only from structured fields
  // (office title, election label/date, rank) — never the freeform bio, so an
  // officeholder who merely mentions 2026 in their story isn't mislabeled.
  window._pdx2026Candidate = function(d) {
    if (!d) return false;
    if (d.nextElection && /^2026/.test(String(d.nextElection))) return true;
    var hay = ((d.office || '') + ' ' + (d.electionLabel || '') + ' ' + (d.rank || '')).toLowerCase();
    return hay.indexOf('2026') !== -1;
  };

  // ─── Candidacy / race status ─────────────────────────────────────────────
  // Single source of truth for whether a politician is still a live choice in
  // the current cycle, or has dropped out of the race. Reads ONLY the
  // structured `candidacyStatus` flag (a record may also carry it as `status`),
  // never the freeform bio, so nothing is inferred. Returns null for active /
  // normal candidates and sitting officeholders (the default — "still running"),
  // or a small descriptor object for any CONCLUDED state so every surface —
  // profile, modal, Relevant-to-Me, browse card — labels it identically.
  //   eliminated_primary / lost_primary → "Lost Primary" (the June 2026 case)
  //   withdrew / withdrawn / suspended   → "Withdrew"
  //   not_running                         → "Not Running"
  //   eliminated / lost / defeated / conceded → generic "Out of Race"
  window._pdxCandidacyState = function(d) {
    var cs = String((d && (d.candidacyStatus || d.status)) || '').toLowerCase().trim();
    if (!cs || cs === 'active' || cs === 'running' || cs === 'office' || cs === 'incumbent') return null;
    if (cs === 'eliminated_primary' || cs === 'lost_primary')
      return { key: 'eliminated_primary', kind: 'eliminated', ico: '✖', short: 'Lost Primary',
        title: 'Lost Primary — not advancing to the general election',
        banner: 'Lost the 2026 primary — not advancing to the November general election' };
    if (cs === 'withdrew' || cs === 'withdrawn' || cs === 'suspended')
      return { key: 'withdrew', kind: 'withdrew', ico: '✖', short: 'Withdrew',
        title: 'Withdrew — no longer a candidate',
        banner: 'Withdrew from the 2026 race — no longer a candidate' };
    if (cs === 'not_running' || cs === 'retiring' || cs === 'not_seeking')
      return { key: 'not_running', kind: 'inactive', ico: '—', short: 'Not Running',
        title: 'Not running in 2026',
        banner: 'Not running in the 2026 election' };
    // Ran in a past cycle, not currently a candidate. Calm/neutral (never a red
    // "out" alarm) — this is a steady state, not a fresh elimination. Pairs with
    // the "Former Candidate" status badge.
    if (cs === 'former_candidate' || cs === 'ran_before')
      return { key: 'former_candidate', kind: 'inactive', ico: '↩', short: 'Former Candidate',
        title: 'Former candidate — not currently running',
        banner: 'Ran in a previous cycle — not currently a candidate' };
    if (cs === 'exploring' || cs === 'exploratory' || cs === 'potential' || cs === 'considering')
      return { key: 'exploring', kind: 'inactive', ico: '🔎', short: 'Exploring',
        title: 'Exploring a run — not yet officially a candidate',
        banner: 'Signaling interest in a future run — not yet an official candidate' };
    if (cs === 'retired')
      return { key: 'retired', kind: 'inactive', ico: '⏳', short: 'Retired',
        title: 'Retired from elected politics',
        banner: 'Retired — no longer in elected politics' };
    // generic concluded — convention elimination, a general-election loss, conceded
    return { key: 'eliminated', kind: 'eliminated', ico: '✖', short: 'Out of Race',
      title: 'Out of the race — did not advance',
      banner: 'No longer running in 2026 — did not advance past the nominating stage' };
  };

  // Prominent, self-contained candidacy-status banner for the top of the full
  // profile, the medium-card modal, and (with high emphasis) the Relevant-to-Me
  // / My Home Team cards. Inline-styled so it renders identically on every
  // surface regardless of each grid's scoped card CSS, matching the dark
  // patriotic palette used elsewhere.
  //   opts.emphasis === 'high' → stronger treatment (brighter border, accent
  //       rail, glow) for the "your politicians" surfaces.
  //   opts.showActive === true → renders a small, subtle "Active Candidate"
  //       note for live candidates (off by default so browse stays uncluttered).
  // Returns '' for active officeholders so nothing is added where it isn't needed.
  window._pdxStatusBanner = function(d, opts) {
    opts = opts || {};
    var st = window._pdxCandidacyState(d);
    if (!st) {
      if (!opts.showActive) return '';
      var statusMode = (typeof window._pdxOfficeStatus === 'function') ? window._pdxOfficeStatus(d) : '';
      if (statusMode !== 'candidate') return '';
      var is2026 = (typeof window._pdx2026Candidate === 'function') && window._pdx2026Candidate(d);
      return '<div role="note" style="display:flex;align-items:center;gap:0.4rem;font-family:\'Barlow Condensed\',sans-serif;font-weight:700;letter-spacing:0.05em;text-transform:uppercase;font-size:0.62rem;color:#93c5fd;background:rgba(59,130,246,0.12);border:1px solid rgba(59,130,246,0.34);border-radius:8px;padding:0.34rem 0.62rem;margin:0 0 0.6rem;">' +
        '<span aria-hidden="true">🗳️</span><span>Active Candidate' + (is2026 ? ' — on the 2026 ballot' : '') + '</span></div>';
    }
    var emph = opts.emphasis === 'high';
    var outcome = (d && d.candidacyOutcome) ? String(d.candidacyOutcome) : '';
    // Eliminated / withdrew read as a clear, warm-red "out" state (brighter when
    // emphasised); not_running stays neutral slate.
    var pal = (st.kind === 'inactive')
      ? { bg: 'rgba(148,163,184,0.14)', bd: 'rgba(148,163,184,0.5)', fg: '#cbd5e1', ac: '#94a3b8' }
      : { bg: emph ? 'rgba(220,38,38,0.18)' : 'rgba(220,38,38,0.11)',
          bd: emph ? 'rgba(248,113,113,0.7)' : 'rgba(248,113,113,0.45)',
          fg: '#fca5a5', ac: '#f87171' };
    var pad = emph ? '0.6rem 0.8rem' : '0.46rem 0.7rem';
    var titleSize = emph ? '0.82rem' : '0.72rem';
    var shadow = emph ? 'box-shadow:0 0 16px rgba(220,38,38,0.18);' : '';
    var accent = 'border-left:' + (emph ? '4px' : '3px') + ' solid ' + pal.ac + ';';
    return '<div role="note" style="display:flex;align-items:flex-start;gap:0.5rem;background:' + pal.bg + ';border:1px solid ' + pal.bd + ';' + accent + 'border-radius:10px;padding:' + pad + ';margin:0 0 0.6rem;' + shadow + '">' +
        '<span aria-hidden="true" style="font-size:' + (emph ? '1rem' : '0.85rem') + ';line-height:1.2;color:' + pal.ac + ';flex-shrink:0;">' + st.ico + '</span>' +
        '<span style="min-width:0;">' +
          '<span style="display:block;font-family:\'Barlow Condensed\',sans-serif;font-weight:800;letter-spacing:0.03em;text-transform:uppercase;font-size:' + titleSize + ';color:' + pal.fg + ';line-height:1.18;">' + st.banner + '</span>' +
          (outcome ? '<span style="display:block;margin-top:0.2rem;font-size:0.66rem;line-height:1.4;color:#cbd5e1;font-weight:400;">' + outcome + '</span>' : '') +
        '</span>' +
      '</div>';
  };

  // Classify how much real record a profile carries:
  //   'none'    — no published score and nothing tracked at all
  //   'limited' — a sparse record (a score with very few promises, or only a
  //               handful of pending items and no score)
  //   'full'    — enough of a record to stand on its own
  window._pdxRecordDepth = function(d) {
    if (!d) return 'full';
    var hasScore = (d.score !== null && d.score !== undefined);
    var k = d.kept || 0, b = d.broken || 0, pn = d.pending || 0;
    var resolved = k + b;
    var tracked = resolved + pn;
    var promCount = (d.promises && d.promises.length) ? d.promises.length : tracked;
    if (!hasScore && tracked === 0 && promCount === 0) return 'none';
    if (!hasScore && resolved === 0) return 'limited';
    if (hasScore && resolved <= 1 && tracked <= 2 && promCount <= 2) return 'limited';
    return 'full';
  };

  // A small, secondary status chip for genuinely sparse *officeholder* records.
  // Candidates/former members are left to the primary status badge (which already
  // says "2026 Candidate"/"Candidate"/"Former Office"), so this never double-labels.
  //   • in office, nothing tracked        → "🌱 Early in Term"
  //   • in office, only a sliver tracked   → "📋 Limited Record"
  window._pdxDepthBadge = function(d, opts) {
    if (!d) return '';
    opts = opts || {};
    var status = (typeof window._pdxOfficeStatus === 'function') ? window._pdxOfficeStatus(d) : 'office';
    if (status !== 'office') return '';
    var depth = window._pdxRecordDepth(d);
    if (depth === 'full') return '';
    // "EARLY IN TERM" HAS TO AGREE WITH THE TERM. _pdxRecordDepth reads pledge
    // columns and a score, never a date, so it returned 'none' for a legislator
    // seated in 2015 whose ledger happens to be empty and this badge then said
    // they had just arrived. Where the roster knows the seat has been held for
    // more than a term's opening, the record is limited — which is true — and
    // not early, which was not. The sprout is kept for the case it was written
    // for: someone who really did just take office.
    if (depth === 'none') {
      var tn = (typeof window._pdxTenure === 'function') ? window._pdxTenure(d) : null;
      if (tn && tn.current && isFinite(tn.years) && tn.years >= 2) depth = 'limited';
    }
    var sm = opts.size === 'sm';
    var fs = sm ? '0.5rem' : '0.6rem';
    var pad = sm ? '0.1rem 0.42rem' : '0.16rem 0.5rem';
    var base = 'display:inline-flex;align-items:center;gap:0.25rem;vertical-align:middle;font-family:\'Barlow Condensed\',sans-serif;font-weight:700;letter-spacing:0.07em;text-transform:uppercase;border-radius:999px;white-space:nowrap;line-height:1.15;font-size:' + fs + ';padding:' + pad + ';';
    if (depth === 'none')
      return '<span class="pdx-status-badge pdx-depth-early" style="' + base + 'background:rgba(167,139,250,0.15);border:1px solid rgba(167,139,250,0.45);color:#c4b5fd;">🌱 Early in Term</span>';
    return '<span class="pdx-status-badge pdx-depth-limited" style="' + base + 'background:rgba(148,163,184,0.13);border:1px solid rgba(148,163,184,0.4);color:#cbd5e1;">📋 Limited Record</span>';
  };

  // ─── Office tenure ───────────────────────────────────────────────────────
  // How long a politician has actually held their office — important
  // accountability context the status badge alone ("In Office") doesn't convey.
  // Driven entirely by structured data (d.termStart / d.termEnd); when no start
  // date is recorded the helpers return nothing rather than guess a date.
  //
  // termStart / termEnd accept a plain year ("2019"), a month-year ("2023-01"),
  // or a full ISO date ("2019-01-07"). A present termEnd marks a FORMER office
  // ("Served 2015 – 2023"); its absence means the seat is still held today
  // ("In office since 2019"). Years served are whole completed years.
  var _PDX_TENURE_MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  function _pdxParseTermDate(v) {
    if (v === null || v === undefined || v === '') return null;
    var m = String(v).trim().match(/^(\d{4})(?:-(\d{1,2}))?/);
    if (!m) return null;
    var year = parseInt(m[1], 10);
    if (!year || year < 1776 || year > 2100) return null;
    var month = m[2] ? parseInt(m[2], 10) : null;
    if (month !== null && (month < 1 || month > 12)) month = null;
    return { year: year, month: month };
  }
  function _pdxFmtTermDate(p) {
    if (!p) return '';
    return p.month ? (_PDX_TENURE_MONTHS[p.month - 1] + ' ' + p.year) : String(p.year);
  }
  // Returns { current, years, text, start, end } or null when no start is known.
  window._pdxTenure = function(d) {
    if (!d) return null;
    var start = _pdxParseTermDate(d.termStart);
    if (!start) return null;
    var end = _pdxParseTermDate(d.termEnd);
    var current = !end;
    var nowY = 2026, nowM = 6;
    try { var nd = new Date(); nowY = nd.getFullYear(); nowM = nd.getMonth() + 1; } catch (e) {}
    var endY = end ? end.year : nowY;
    var endM = end ? (end.month || 12) : nowM;
    var years = endY - start.year;
    if (endM < (start.month || 1)) years -= 1;   // anniversary not yet reached
    if (years < 0) years = 0;
    var yrTxt = years >= 1 ? ' (' + years + ' year' + (years === 1 ? '' : 's') + ')' : '';
    var startTxt = _pdxFmtTermDate(start);
    var text = current
      ? ('In office since ' + startTxt + yrTxt)
      : ('Served ' + startTxt + ' – ' + _pdxFmtTermDate(end) + yrTxt);
    return { current: current, years: years, text: text, start: start, end: end };
  };
  // The pill HTML for a card / profile. Returns '' when there is no tenure data.
  window._pdxTenurePill = function(d, opts) {
    var t = window._pdxTenure(d);
    if (!t) return '';
    var cls = t.current ? 'pdx-tenure--current' : 'pdx-tenure--former';
    return '<span class="pdx-tenure ' + cls + '" title="' + t.text + '">' +
      '<span class="pdx-tenure-ico">🗓️</span>' + t.text + '</span>';
  };

  // Graceful, consistent stand-in for the focus / key-issue chip row when a
  // politician has no tracked issues yet. Instead of leaving a blank gap (which
  // reads as a broken or half-built card), the card shows a clean, muted
  // "being compiled" micro-line in the same place — honest about the thin data
  // while keeping the layout intentional. Returns '' whenever issues exist, so
  // full profiles are never touched.
  //   opts.center  — center the note (for centered card layouts)
  //   opts.label   — override the note text
  window._pdxFocusEmptyNote = function(d, opts) {
    if (!d) return '';
    if (d.issues && d.issues.length) return '';
    opts = opts || {};
    var status = (typeof window._pdxOfficeStatus === 'function') ? window._pdxOfficeStatus(d) : 'office';
    // A candidate who is off the ballot (withdrew / eliminated) will never have
    // positions "added," so promising that would be dishonest. Show an accurate
    // "Limited public record" note instead, matching the profile's empty state.
    var _cs = String(d.candidacyStatus || d.status || '').toLowerCase();
    var _inactive = (_cs === 'eliminated_primary' || _cs === 'lost_primary' || _cs === 'eliminated' || _cs === 'withdrew' || _cs === 'withdrawn' || _cs === 'lost' || _cs === 'defeated' || _cs === 'suspended' || _cs === 'conceded');
    var txt = opts.label || (_inactive ? 'Limited public record' : (status === 'candidate') ? 'Key positions being added' : 'Focus areas being compiled');
    var align = opts.center ? 'center' : 'flex-start';
    return '<div style="display:flex;justify-content:' + align + ';width:100%;">' +
      '<span style="font-family:\'Barlow Condensed\',sans-serif;font-size:0.6rem;letter-spacing:0.05em;text-transform:uppercase;color:#647a9c;font-style:italic;display:inline-flex;align-items:center;gap:0.3rem;">' +
        '<span style="opacity:0.8;">🧭</span>' + txt +
      '</span></div>';
  };

  // ═══ Unopposed race status ═══
  // True when a politician/candidate is running with no challenger. Driven purely
  // from the data flag (d.unopposed === true) or a "unopposed" rank string, so it
  // stays factual and easy to extend as more uncontested races are confirmed.
  window._pdxIsUnopposed = function(d) {
    if (!d) return false;
    if (d.unopposed === true) return true;
    return String(d.rank || '').toLowerCase() === 'unopposed';
  };
  // Prominent bright red/orange "UNOPPOSED" badge for uncontested races.
  window._pdxUnopposedBadge = function(opts) {
    opts = opts || {};
    var sm = opts.size === 'sm';
    var fs = sm ? '0.5rem' : '0.6rem';
    var pad = sm ? '0.1rem 0.42rem' : '0.16rem 0.5rem';
    var base = 'display:inline-flex;align-items:center;gap:0.25rem;vertical-align:middle;font-family:\'Barlow Condensed\',sans-serif;font-weight:800;letter-spacing:0.08em;text-transform:uppercase;border-radius:999px;white-space:nowrap;line-height:1.15;font-size:' + fs + ';padding:' + pad + ';';
    return '<span class="pdx-unopposed-badge" style="' + base + 'background:linear-gradient(135deg,#dc2626,#f97316);border:1.5px solid rgba(249,115,22,0.9);color:#ffffff;box-shadow:0 0 12px rgba(239,68,68,0.5);">🚨 Unopposed</span>';
  };

  // Dynamic User Voter Location State. Starts empty/neutral. Populated only from
  // saved localStorage (city, county, state, district). Fully national — no state defaults.
  // When no location saved, UI shows neutral "Set Your Location to see your representatives".
  window._currentVoterLocation = {
    state: '',
    city: '',
    county: '',
    district: ''
  };

  // Tracks whether the user has actually chosen/saved a location.
  window._hasUserLocation = false;

  // ── WHAT COUNTS AS THIS READER'S PLACE, AND WHAT IS ONLY A GUESS ──────────
  // WHAT THE READER SAW. A signed-out first paint of / read "You are set to
  // Utah", with Who Represents Me showing three of six seats — the two U.S.
  // Senate rows and the Governor, which are exactly the seats that resolve from
  // a state name alone. Nobody had told us Utah. detectVoterLocation() ran on
  // load, and where the browser's geolocation was unavailable or declined it fell
  // through to a silent ipapi.co lookup whose answer it wrote straight into this
  // key through saveVoterLocation() — so an approximate region derived from an IP
  // address became "you are set to", persisted, and survived every later visit.
  // A reader in Ohio behind a Utah-routed VPN was "set to Utah" too, and the
  // sentence that told them so was the app's own.
  //
  // THE RULE NOW: THIS RECORD IS A CHOICE, OR IT IS NOT READ. Every writer that
  // runs off a real gesture — the picker, the map, the address search, the Detect
  // button, a curated-area pick, the Home Base anchor — goes through
  // saveVoterLocation(), which stamps PDX_LOC_SRC. Nothing else may claim to be where
  // this reader votes: an inference is welcome to OFFER a place through the CTA,
  // and it may not answer the question on the reader's behalf.
  //
  // AND THE RULE IS APPLIED TO RECORDS ALREADY IN BROWSERS, because a writer
  // removed today does not un-write what it wrote last month. A legacy record
  // (saved before the stamp existed) is accepted only where its SHAPE is one a
  // gesture produces: a district, a map pin, or a municipality distinct from the
  // county. The detector wrote exactly two shapes — a bare state (the IP path) and
  // a state whose city and county are the same string with no district (the
  // reverse-geocode path) — and neither carries any of those marks. Where the two
  // are indistinguishable the record is not read, which costs a reader who set
  // only a state one tap on a CTA and costs a reader who set nothing the false
  // sentence they have been reading.
  var PDX_LOC_KEY = 'politidex_voter_location';
  var PDX_LOC_SRC = 'set';
  function _pdxLocWasChosen(parsed) {
    if (!parsed || typeof parsed !== 'object') return false;
    if (parsed.src === PDX_LOC_SRC) return true;
    if (parsed.src) return false;            // stamped as something else — not a choice
    var city = String(parsed.city || '').trim();
    var county = String(parsed.county || '').trim();
    return !!(String(parsed.district || '').trim() ||
              String(parsed.stateHouseDistrict || '').trim() ||
              String(parsed.stateSenateDistrict || '').trim() ||
              parsed.mapSelected ||
              (city && city.toLowerCase() !== county.toLowerCase()));
  }

  window.loadVoterLocation = function() {
    window._hasUserLocation = false;
    try {
      var saved = localStorage.getItem(PDX_LOC_KEY);
      if (saved) {
        var parsed = JSON.parse(saved);
        // Only treat this as a real saved location when an actual state / region is
        // present AND this reader chose it (see above). A blank or malformed record
        // (e.g. left over from clearing the form), or one no gesture stands behind,
        // falls back to the neutral "Set Your Location" prompt — never to a default
        // state.
        if (parsed && typeof parsed === 'object' && (parsed.state || '').trim() && _pdxLocWasChosen(parsed)) {
          window._currentVoterLocation = {
            state: parsed.state || '',
            city: parsed.city || '',
            county: parsed.county || '',
            district: (parsed.district == null ? '' : String(parsed.district)).replace(/[^0-9]/g, ''),
            // Exact State House / State Senate districts when the voter pinpointed
            // them on the interactive map. Kept distinct from `district` (which is
            // the U.S. House / congressional seat) so all three can coexist.
            stateHouseDistrict: (parsed.stateHouseDistrict == null ? '' : String(parsed.stateHouseDistrict)).replace(/[^0-9]/g, ''),
            stateSenateDistrict: (parsed.stateSenateDistrict == null ? '' : String(parsed.stateSenateDistrict)).replace(/[^0-9]/g, ''),
            // True when the active districts were chosen on the map — drives the
            // small "set via map" indicator across the location surfaces.
            mapSelected: !!parsed.mapSelected,
            // THE SEATS THIS PLACE ALREADY RESOLVED, on whichever document had the
            // curated tables to resolve them. Restored here so a document without
            // those tables reads the same answer instead of a thinner one — see
            // _pdxResolvedRead() and pdxRepsForMe().
            resolved: (parsed.resolved && typeof parsed.resolved === 'object') ? parsed.resolved : null,
            src: PDX_LOC_SRC
          };
          window._hasUserLocation = true;
        } else {
          window._currentVoterLocation = { state: '', city: '', county: '', district: '' };
        }
      } else {
        window._currentVoterLocation = { state: '', city: '', county: '', district: '' };
      }
    } catch(e) {
      window._currentVoterLocation = { state: '', city: '', county: '', district: '' };
    }
    if (typeof window._updateTeamPositionsForLocation === 'function') window._updateTeamPositionsForLocation();
    if (typeof window._pdxRefreshMapIndicators === 'function') window._pdxRefreshMapIndicators();
  };

  // Arm the location-confirmation toast only after the first real user
  // interaction, so a load-time geolocation auto-detect or key-races
  // auto-establish (both of which call saveVoterLocation without a gesture) never
  // fires a toast on page load. Restoring a saved location doesn't call
  // saveVoterLocation at all, so that path is already silent.
  (function () {
    function arm() {
      window._pdxLocToastArmed = true;
      window.removeEventListener('pointerdown', arm, true);
      window.removeEventListener('keydown', arm, true);
    }
    window.addEventListener('pointerdown', arm, true);
    window.addEventListener('keydown', arm, true);
  })();

  // ── window.PDXReturn — ONE OWNER OF "WHERE WAS THIS READER GOING" ──────────
  // THE BUG THIS CLOSES. Every door in the app that says "set your location so
  // you can use District Voice" pointed at /#who-represents-me, which is where a
  // reader READS their seats and was, at the time, also the only place to SET
  // them — and the wrong place to be left standing once they had. A reader tapped
  // "Open District Voice" on /me, landed on the front page's finder, set their
  // districts, watched the finder repaint — and was still on the finder, a
  // megabyte and a half deep, with no way back to the thing they had asked for
  // except to find the nav again. The intent was thrown away at the door.
  //
  // AND THE FINDER HAS ITS OWN ADDRESS NOW, which is the second half of the same
  // bug and the reason FINDER below reads /find. Sending a reader to the front
  // page to set a location meant parsing the entire archive homepage — hero, work
  // layer, evidence template, ballot workspace, listings — before the picker
  // could move, and then rebuilding all of it behind the modal when they picked.
  // /find is that picker and nothing else. The parameter, the allow-list and the
  // spending rule below did not change with the move: only the door's address
  // did, in exactly one place.
  //
  // So the intent travels WITH them, as one query parameter, and this module
  // owns it end to end because it is the module that is loaded on every document
  // that has a location door: /, /me, /voice, /ballot, /district/ut-sd-3 and
  // /p/. A second copy of the parameter name, the allow-list or the finder's
  // address on any one of those would be a second answer, and the one that
  // drifts is always the one nobody is looking at.
  //
  // THE ALLOW-LIST IS THE WHOLE OF THE SAFETY, and it is an allow-list on
  // purpose rather than a "does it start with /" test. `next` arrives in a URL,
  // which means it arrives from anywhere — an email, a QR code, somebody else's
  // page — and location.assign() on an attacker-chosen string is an open
  // redirect. OK_RE admits four shapes and nothing else: /voice, /me, /ballot
  // and /district/<slug>. Anything carrying a scheme, a backslash or a leading
  // // is rejected outright before the pattern is even asked, so //evil.example
  // (a protocol-relative URL that leaves this origin) and javascript:… cannot
  // reach the test. A rejected value is not an error and does not strand
  // anybody: it degrades to /voice, which is this lane's home.
  //
  // IT CANNOT NAVIGATE WITHOUT A SAVE. consume() returns false unless BOTH
  // _pdxLocSaved (a real gesture came through saveVoterLocation on this page
  // view) and _hasUserLocation (there is a location to have saved) are true — so
  // a reader who opens the picker with ?next= in the URL and presses Escape stays
  // exactly where they are. And it never navigates to the address it is already
  // on, because a reader on /voice who updates their location wants the page to
  // repaint, not to reload.
  //
  // NO PARAMETER, NO JUMP. Absent `next` means nobody expressed an intent, and
  // inventing one — sending every reader who touched the front page's picker to
  // /voice — would be this module deciding where somebody was going. The default
  // in sanitize() is the fallback for a `next` that is PRESENT and unusable, not
  // a default destination for a location save.
  window.PDXReturn = (function () {
    var HOME = '/voice';
    var PARAM = 'next';
    // THE FINDER'S ADDRESS, IN ONE PLACE. It is a path and no longer a fragment,
    // and losing the fragment took a bug with it: the old href composed
    // '/?next=…' + '/#who-represents-me', which put FINDER's own leading slash
    // INSIDE the query value, so the intent read back as '/voice/' rather than
    // '/voice'. There is nothing to compose now — the query goes on the end of a
    // path with no fragment behind it.
    var FINDER = '/find';
    // AND THE BAND THAT SHOWS THE ANSWER, which is a different place from the
    // picker that sets it and always was. #who-represents-me is still on the
    // front page, still lists the reader's seats, and is where settled() returns
    // a reader who finished on /find without carrying an intent. The nav rows
    // across the app point at it for the same reason: reading is not setting.
    var FRAGMENT = '#who-represents-me';
    // THE ALLOW-LIST. /voice, /me, /ballot, /district/<slug> — and '/', because
    // the front page is a real destination for this lane: a reader whose door was
    // the homepage's own "set my location" control is going back to the band that
    // shows the answer. It is safe to admit for the same reason it is needed:
    // consume() refuses to navigate to the address it is already standing on, so
    // '/' can only ever move a reader who is NOT on the front page.
    //
    // /find IS DELIBERATELY NOT IN HERE. The finder is where this lane starts,
    // never where it ends; a next=/find would be a door that leads back to the
    // door, and a save that lands on the picker that made it is a loop.
    var OK_RE = /^\/(?:voice|me|ballot|district\/[a-z0-9][a-z0-9-]{0,63})?\/?$/;

    function strip(p) {
      return String(p == null ? '' : p).replace(/\.html$/, '').replace(/\/+$/, '') || '/';
    }

    function sanitize(raw) {
      var s = String(raw == null ? '' : raw);
      if (!s) return '';
      try { s = decodeURIComponent(s); } catch (e) {}
      s = s.trim();
      if (s.indexOf('//') === 0) return '';        // protocol-relative: off-origin
      if (s.indexOf(':') >= 0) return '';          // any scheme at all
      if (s.indexOf('\\') >= 0) return '';         // a backslash some engines read as /
      var cut = s.search(/[?#]/);
      if (cut >= 0) s = s.slice(0, cut);
      s = s.toLowerCase();
      return OK_RE.test(s) ? s : '';
    }

    // The intent in THIS page's URL, or '' when there is none. A `next` that is
    // present and does not survive sanitize() lands on HOME rather than on '',
    // because somebody did ask to go somewhere and /voice is where this lane
    // lives — '' would silently strand a reader who followed a mangled link.
    function read() {
      var m = null;
      try { m = /[?&]next=([^&#]*)/.exec(String(window.location.search || '')); } catch (e) { m = null; }
      if (!m) return '';
      return sanitize(m[1]) || HOME;
    }

    // Where a door on THIS document should send the reader back to: the address
    // they are standing on when it is one of ours, and /voice otherwise. This is
    // the rule that makes a location CTA on /district/ut-sd-3 return to that
    // board instead of to the hub.
    function here() {
      var p = '';
      try { p = String(window.location.pathname || ''); } catch (e) { p = ''; }
      return sanitize(strip(p)) || HOME;
    }

    // THE DOOR ITSELF, built in one place. A real anchor to a real address —
    // never href="#", never a button that needs JavaScript to mean anything. The
    // address is the finder's own document, so following this link costs the
    // finder and not the archive homepage that used to host it.
    function finderHref(next) {
      return FINDER + '?' + PARAM + '=' + encodeURIComponent(sanitize(next) || HOME);
    }

    function consume() {
      var next = read();
      if (!next) return false;
      if (!window._pdxLocSaved || !window._hasUserLocation) return false;
      var at = '';
      try { at = strip(window.location.pathname); } catch (e) { at = ''; }
      if (at === strip(next)) return false;
      try { window.location.assign(next); return true; } catch (e) { return false; }
    }

    // ── settled() — consume(), PLUS THE ONE DOCUMENT THAT CANNOT STAY ────────
    // "NO PARAMETER, NO JUMP" IS THE RIGHT RULE EVERYWHERE THE PICKER IS PART OF
    // A PAGE, and /find is the one place it is not. On the front page, on /me, on
    // a board, a save with no `next` means "the reader chose to be here and
    // changed their location while they were" — moving them would be this module
    // deciding where they were going. On /find there is nothing to stay for: the
    // page is a tool with one job, the job just finished, and leaving a reader
    // standing on a picker they have already used is the dead end the move would
    // otherwise have introduced.
    //
    // SO THE FALLBACK IS GATED ON THE DOCUMENT SAYING IT IS THE FINDER, not on a
    // pathname test — /find, /find/ and a preview server's /find.html are three
    // spellings of one page, and window.__PDX_FIND_DOC is declared exactly once,
    // in find.html's head. On every other document settled() IS consume(), byte
    // for byte, which is why both callers can spell it this way.
    //
    // AND IT STILL CANNOT FIRE WITHOUT A SAVE. Same two flags consume() checks,
    // for the same reason: a reader who opened the finder and pressed Escape has
    // expressed no intent and is owed no navigation.
    function settled() {
      if (consume()) return true;
      if (!window.__PDX_FIND_DOC) return false;
      if (!window._pdxLocSaved || !window._hasUserLocation) return false;
      // The band that SHOWS the seats, which is where the answer is read. It is
      // not in OK_RE's business — this is a literal destination, not an
      // attacker-supplied one.
      try { window.location.assign('/' + FRAGMENT); return true; } catch (e) { return false; }
    }

    return {
      HOME: HOME, PARAM: PARAM, FINDER: FINDER, OK_RE: OK_RE, FRAGMENT: FRAGMENT,
      sanitize: sanitize, read: read, here: here,
      finderHref: finderHref, consume: consume, settled: settled
    };
  })();

  window.saveVoterLocation = function() {
    window._hasUserLocation = true;
    // A GESTURE HAPPENED ON THIS PAGE VIEW. PDXReturn.consume() will not
    // navigate without it, which is what keeps an Escape out of the picker
    // from carrying somebody to /voice. Set here rather than in the modal
    // closers for the same reason the src stamp is: every gesture that sets a
    // location comes through this function and nothing that is not one does.
    window._pdxLocSaved = true;
    try {
      // THE STAMP IS APPLIED HERE AND NOWHERE ELSE, because every gesture that
      // sets a location already comes through this function and nothing that is
      // not a gesture is allowed to. It is what loadVoterLocation() reads back to
      // tell a choice from an inference — see the block over PDX_LOC_SRC.
      if (window._currentVoterLocation && typeof window._currentVoterLocation === 'object') {
        window._currentVoterLocation.src = PDX_LOC_SRC;
      }
      localStorage.setItem(PDX_LOC_KEY, JSON.stringify(window._currentVoterLocation));
    } catch(e) {}
    // Persist to the signed-in member's account so their location follows them
    // across devices (My Team, Relevant to Me, ballot slots all read from it).
    try {
      if (typeof auth !== 'undefined' && auth.currentUser && !auth.currentUser.isAnonymous && typeof db !== 'undefined') {
        db.collection('users').doc(auth.currentUser.uid).set({
          voter_location: window._currentVoterLocation
        }, { merge: true }).then(function() {
          if (typeof _showAccountSaveToast === 'function') _showAccountSaveToast();
        }).catch(function(e) { console.warn('Firestore save voter_location failed:', e); });
      }
    } catch(e) { /* never let persistence break the location UI */ }
    // Immediate, explicit confirmation that the location took effect. The banner
    // and ballot update in place, but a brief toast affirms the change for anyone
    // who set their location from the nav or the map and might not see the banner
    // shift on a small screen. Only fires after a user gesture (see arming above)
    // and only when the location actually changed, debounced so a multi-field
    // change (state → county → district) confirms just once.
    try {
      var _lc = window._currentVoterLocation || {};
      var _sig = [_lc.state, _lc.county, _lc.city, _lc.district].join('|');
      if (window._pdxLocToastArmed && _sig !== window._pdxLastLocToastSig) {
        window._pdxLastLocToastSig = _sig;
        var _where = ([ (_lc.city || _lc.county || ''), _lc.state ].filter(Boolean).join(', ') || 'your area');
        clearTimeout(window._pdxLocToastTimer);
        window._pdxLocToastTimer = setTimeout(function() {
          if (typeof window._showToast !== 'function') return;
          window._showToast(_lc.state === 'National'
            ? '📍 Showing federal offices'
            : '📍 Location set — showing your ballot for ' + _where);
        }, 350);
      }
    } catch(e) { /* a toast must never break saving */ }
  };

  window.toggleChangeLocation = function() {
    var form = document.getElementById('change-location-form');
    // NO FORM MEANS THE PICKER IS AT /find, AND "toggle" HAS NOTHING TO TOGGLE.
    // There is no open state to close on a document that does not carry the
    // markup, so the only honest reading of this gesture is the one it always
    // had — put the picker in front of this reader — and openLocationModal is
    // the single place that knows how. This used to be a bare `return`, which
    // after the move would have made "🗺️ Change on map" a dead control on every
    // page in the app.
    if (!form) { window.openLocationModal(); return; }
    var isOpen = form.style.display !== 'none' && form.style.display !== '';
    if (isOpen) {
      window.closeLocationModal();
    } else {
      window.openLocationModal();
    }
  };

  window.openLocationModal = function(opts) {
    opts = opts || {};
    var loc = window._currentVoterLocation || { state: '', city: '', county: '', district: '' };

    // ── Map-first routing ────────────────────────────────────────────────────
    // The address + map picker is the primary, most accurate way to set a location
    // — it resolves the exact districts even where a city is split across several
    // seats (like Layton). For Utah (the map's coverage) or a visitor who hasn't
    // chosen a state yet, open it directly with the address search focused. The
    // caller can force the manual form instead (the "use city/county instead"
    // escape hatch, or a Leaflet load failure) via opts.forceForm.
    if (!opts.forceForm && (!loc.state || loc.state === 'Utah') &&
        typeof window.openDistrictMapModal === 'function') {
      window.openDistrictMapModal();
      return;
    }

    // ── THE PICKER LIVES AT /find, SO A MISSING FORM IS A DESTINATION ────────
    // This used to be a bare `return`, and it was correct when the picker markup
    // was on the front page: every document that loaded this file either had the
    // form or had deliberately left it out, and failing silently was better than
    // throwing. Now the form is on exactly ONE document, and every other page —
    // /me, /ballot, /voice, a board, a person file — reaches this line the moment
    // a reader asks to set a location.
    //
    // SO THE OWNER ANSWERS FOR IT, IN ONE PLACE, and that is the whole reason
    // this pass did not have to rewrite a few dozen inline onclick handlers.
    // Every `openLocationModal()` call site in the app already meant "put the
    // picker in front of this reader"; the picker having moved makes that a
    // navigation rather than a style change, and the call sites do not need to
    // know which. The intent travels: PDXReturn carries where they were standing
    // so the save can bring them back.
    var form = document.getElementById('change-location-form');
    if (!form) {
      var to = '/find';
      try {
        if (window.PDXReturn) to = window.PDXReturn.finderHref(window.PDXReturn.here());
      } catch (e) { to = '/find'; }
      try { window.location.assign(to); } catch (e) {}
      return;
    }
    var stateSel = document.getElementById('voter-state-sel');
    var countyInput = document.getElementById('voter-county-input');
    var distSel = document.getElementById('voter-district-sel');
    if (stateSel) stateSel.value = loc.state || '';
    if (countyInput) countyInput.value = loc.city || loc.county || '';
    if (distSel) distSel.value = loc.district || '';

    // When the caller explicitly wants the manual selector (came from "use
    // city/county instead"), expand it and remember that intent for this view so
    // the layout sync below doesn't re-collapse it.
    var manualSection = document.getElementById('voter-manual-section');
    if (manualSection) {
      if (opts.expandManual) {
        manualSection.classList.remove('is-collapsed');
        manualSection.dataset.userToggled = '1';
      } else {
        delete manualSection.dataset.userToggled;
        manualSection.classList.add('is-collapsed');
      }
    }
    window._syncLocationModalLayout();

    form.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    if (opts.expandManual && countyInput) { try { countyInput.focus(); } catch(e) {} }
    else if (stateSel) { try { stateSel.focus(); } catch(e) {} }
  };

  // Arrange the location form for the current state: show the primary map card and
  // collapse the manual selector where the map is available (Utah / no state yet),
  // or hide the map and expand the manual fields everywhere else. Centralizes the
  // layout so openLocationModal and voterLocationStateChanged stay in sync.
  window._syncLocationModalLayout = function() {
    var loc = window._currentVoterLocation || {};
    var state = loc.state || '';
    var mapAvailable = (!state || state === 'Utah');

    var mapPrimary = document.getElementById('voter-map-primary');
    var mapUnavailable = document.getElementById('voter-map-unavailable');
    var manualSection = document.getElementById('voter-manual-section');
    var manualToggle = document.getElementById('voter-manual-toggle');
    var manualWarn = document.getElementById('voter-manual-warn');
    var countyWrap = document.getElementById('voter-county-wrap');
    var distWrap = document.getElementById('voter-district-wrap');

    if (mapPrimary) mapPrimary.style.display = mapAvailable ? 'flex' : 'none';
    if (manualToggle) manualToggle.style.display = mapAvailable ? 'inline-flex' : 'none';
    if (manualWarn) manualWarn.style.display = mapAvailable ? 'block' : 'none';
    // Explain the missing map for a specific out-of-coverage state (a real state
    // that isn't Utah). "National" is a deliberate federal-only choice, so it needs
    // no map explanation.
    if (mapUnavailable) mapUnavailable.style.display = (!mapAvailable && state && state !== 'National') ? 'flex' : 'none';

    // Field visibility mirrors the original rules: nothing until a state is picked,
    // city only for National, city + congressional district for a real state.
    if (!state) {
      if (countyWrap) countyWrap.style.display = 'none';
      if (distWrap) distWrap.style.display = 'none';
    } else if (state === 'National') {
      if (countyWrap) countyWrap.style.display = 'flex';
      if (distWrap) distWrap.style.display = 'none';
    } else {
      if (countyWrap) countyWrap.style.display = 'flex';
      if (distWrap) distWrap.style.display = 'flex';
    }

    // Collapse state: the manual block starts collapsed when the map is on offer
    // (unless the user expanded it), and is always open when there's no map.
    if (manualSection) {
      if (mapAvailable) {
        if (!manualSection.dataset.userToggled) manualSection.classList.add('is-collapsed');
      } else {
        manualSection.classList.remove('is-collapsed');
      }
    }
  };

  // Reveal / hide the secondary "use city/county instead" selector.
  window.toggleManualLocationSection = function() {
    var sec = document.getElementById('voter-manual-section');
    if (!sec) return;
    sec.dataset.userToggled = '1';
    var collapsed = sec.classList.toggle('is-collapsed');
    var caret = sec.querySelector('.loc-manual-toggle-caret');
    var label = sec.querySelector('.loc-manual-toggle-label');
    var toggle = document.getElementById('voter-manual-toggle');
    if (caret) caret.textContent = collapsed ? '▾' : '▴';
    if (label) label.textContent = collapsed ? 'Use city/county instead' : 'Hide city/county selector';
    if (toggle) toggle.setAttribute('aria-expanded', String(!collapsed));
    if (!collapsed) {
      var c = document.getElementById('voter-county-input');
      if (c) { try { c.focus(); } catch(e) {} }
    }
  };

  // Escape hatch from the map modal: open the manual city/county form directly.
  window.openManualLocationForm = function() {
    if (typeof window.closeDistrictMapModal === 'function') window.closeDistrictMapModal();
    window.openLocationModal({ forceForm: true, expandManual: true });
  };

  // One-shot welcome→ballot handoff, shared by both the location form and the map
  // modal so a brand-new visitor who sets their location via either path is carried
  // down to their now-personalized ballot.
  window._pdxRunWelcomeBallotHandoff = function() {
    if (!window._pdxWelcomeAwaitingBallot) return;
    window._pdxWelcomeAwaitingBallot = false;
    if (!window._hasUserLocation) return;
    var dest = document.getElementById('voter-hub') || document.getElementById('relevant-section');
    if (dest) {
      setTimeout(function() {
        try { dest.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch (e) { dest.scrollIntoView(); }
      }, 120);
    }
  };

  // Fall back to the address + map picker (its whole purpose is precise district
  // detection) when automatic detection can't determine a location.
  window._pdxFallbackToMap = function() {
    setTimeout(function() {
      if (typeof window.openDistrictMapModal === 'function') {
        window.openDistrictMapModal();
      } else if (typeof window.openLocationModal === 'function') {
        window.openLocationModal({ forceForm: true });
      }
    }, 350);
  };

  // ── window.openDistrictMapModal — THE DEFAULT, FOR DOCUMENTS WITHOUT A MAP ──
  // THE MAP IS ON ONE DOCUMENT NOW. find.html carries the modal markup and the
  // controller IIFE that publishes the real openDistrictMapModal; every other
  // page in the app carries call sites for it — the Relevant-to-Me card, the
  // homepage's "Change on map", the manual picker's address card,
  // _pdxFallbackToMap when automatic detection gives up — and every one of them
  // is written as `window.openDistrictMapModal && window.openDistrictMapModal()`,
  // which after the move would quietly do NOTHING rather than open a map.
  //
  // So the owner publishes a default that goes where the map went. Not a stub and
  // not a warning: the reader asked for the map, and the map is at /find, so they
  // are taken to it with their return intent in hand. That is what makes every
  // one of those unedited call sites correct again.
  //
  // THE GUARD IS THE WHOLE OF THE ORDERING PROBLEM, and it works in both
  // directions. On find.html the controller is inline and runs before this
  // deferred file, so a real openDistrictMapModal already exists and this
  // declaration is skipped. If that ever reverses — the controller moved into a
  // deferred file, a bundler reordered the tags — the controller's own assignment
  // simply overwrites this one, because it is an unconditional assignment and
  // this is the conditional one. Either order ends with the real map winning on
  // the document that has a map.
  if (typeof window.openDistrictMapModal !== 'function') {
    window.openDistrictMapModal = function() {
      var to = '/find';
      try {
        if (window.PDXReturn) to = window.PDXReturn.finderHref(window.PDXReturn.here());
      } catch (e) { to = '/find'; }
      try { window.location.assign(to); } catch (e) {}
    };
  }

  window.closeLocationModal = function() {
    var form = document.getElementById('change-location-form');
    if (!form) return;
    form.style.display = 'none';
    document.body.style.overflow = '';
    // Welcome→ballot handoff (strictly one-shot and scoped to that flow — returning
    // users who simply tweak their location are never auto-scrolled).
    window._pdxRunWelcomeBallotHandoff();
    // THE INTENT, HONOURED AT THE END OF THE FLOW AND NOT DURING IT.
    // saveVoterLocation() fires on every field change (state, then county, then
    // district), so a jump hung off the save would carry a reader away from the
    // form mid-sentence. Closing the picker is the completion, so this is where
    // the return happens — and it is a no-op for the reader who arrived with no
    // `next` at all on any document that is not the finder itself, which is
    // nearly all of them. settled() is consume() plus the one case consume()
    // cannot answer: the picker's own page, which nobody stays on.
    try { if (window.PDXReturn && window.PDXReturn.settled()) return; } catch (e) {}
  };

  // Close the location modal with the Escape key.
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      var form = document.getElementById('change-location-form');
      if (form && form.style.display === 'flex') window.closeLocationModal();
    }
  });

  // ── THE DISTRICT FINDER'S GATE, AND ITS NETWORK MANNERS ─────────────────────
  // This file already owns the location record, the modal that changes it and the
  // reaction below, so it owns the two rules the finder needs and index.html's
  // map controller only calls:
  //
  //   DON'T REBUILD THE PAGE NOBODY IS LOOKING AT. Every district pick used to
  //   run _triggerLocationReaction() immediately, and that rebuilds the entire
  //   front page — Key Races, the Relevant-to-Me slate, the team grid and browse
  //   lane, the H.R.1 receipts grid, Local Issues, the ballot, the politician
  //   manager, and through _vhSyncBanner the Who Represents Me band and the six
  //   seats pdxRepsForMe() resolves. A city search picks a House district and
  //   then a Senate district, so the whole rebuild ran TWICE, behind a modal
  //   covering the page it was rebuilding, in the same frames that were drawing
  //   district polygons. That is the tab that stopped responding. So a rebuild
  //   asked for while the finder is open is RECORDED and replayed ONCE on close.
  //   Deferred, never dropped, and the location itself is still saved on every
  //   pick by its own owner — no key moves and nothing gains a second writer.
  //
  //   AND DON'T LEAVE WORK ON THE WIRE. Every request the finder makes registers
  //   a canceller here, so a second search, or closing the modal, takes the
  //   previous attempt off the network instead of letting it land on a surface
  //   that has moved on. fetch() gets a per-request ceiling and deadline() gets
  //   one over a whole provider chain, because five geocoders head-to-tail with
  //   no timeout is a spinner with nothing left to cancel.
  (function () {
    var pending = false;
    var inflight = [];
    var DEFAULT_MS = 20000;
    window.PDXFinder = {
      isOpen: function () {
        var m = document.getElementById('district-map-modal');
        return !!(m && m.style.display === 'flex');
      },
      markPending: function () { pending = true; },
      flush: function () {
        if (!pending) return;
        pending = false;
        if (typeof window._triggerLocationReaction === 'function') window._triggerLocationReaction();
      },
      track: function (cancel) { inflight.push(cancel); },
      abort: function () {
        var list = inflight; inflight = [];
        for (var i = 0; i < list.length; i++) { try { list[i](); } catch (e) {} }
      },
      // fetch with a ceiling and a canceller.
      fetch: function (url, opts, ms) {
        var ctrl = (typeof AbortController === 'function') ? new AbortController() : null;
        var o = {}, k, timer;
        if (opts) { for (k in opts) o[k] = opts[k]; }
        if (ctrl) o.signal = ctrl.signal;
        function kill() { clearTimeout(timer); if (ctrl) { try { ctrl.abort(); } catch (e) {} } }
        timer = setTimeout(kill, ms || DEFAULT_MS);
        this.track(kill);
        return fetch(url, o).then(function (r) { clearTimeout(timer); return r; },
                                  function (e) { clearTimeout(timer); throw e; });
      },
      // One ceiling over a whole chain; on expiry the wire is cleared and the
      // caller is told, rather than left holding a spinner.
      deadline: function (p, ms) {
        var self = this;
        return new Promise(function (resolve) {
          var done = false, t;
          function fin(v) { if (done) return; done = true; clearTimeout(t); resolve(v); }
          t = setTimeout(function () { self.abort(); fin({ timedOut: true, hit: null }); }, ms);
          p.then(function (v) { fin({ timedOut: false, hit: v || null }); },
                 function () { fin({ timedOut: false, hit: null }); });
        });
      }
    };
  })();

  window._triggerLocationReaction = function() {
    var loc = window._currentVoterLocation || { state: '', city: '', county: '', district: '' };
    var state = loc.state || '';

    // NOT WHILE THE FINDER IS OPEN. Everything below this line rebuilds the
    // front page: Key Races, the Relevant-to-Me slate, the team grid and browse
    // lane, the H.R.1 receipts grid, Local Issues, the ballot, the politician
    // manager, and — through _vhSyncBanner — who-represents-me's six-seat band
    // and its pdxRepsForMe() preview. None of it is visible behind the district
    // modal, and a city search sets a house district and then a senate district,
    // so it used to run the whole rebuild TWICE over a page nobody was looking
    // at. That is the "Page Unresponsive" in the report.
    //
    // The work is deferred, not dropped: the finder records that a rebuild is
    // owed and closeDistrictMapModal() flushes it once, over a page the reader
    // can actually see. The location itself is already saved by the caller —
    // this gate changes WHEN the page repaints, never what is stored, and no
    // location key or chooser flag is touched here.
    try {
      if (window.PDXFinder && window.PDXFinder.isOpen()) {
        window.PDXFinder.markPending();
        // The finder's own chrome is the one surface that IS on screen.
        if (typeof window._pdxRefreshMapIndicators === 'function') window._pdxRefreshMapIndicators();
        return;
      }
    } catch (e) {}

    if (typeof window._updateTeamPositionsForLocation === 'function') window._updateTeamPositionsForLocation();
    if (typeof window.updateRelevantLocationText === 'function') window.updateRelevantLocationText();
    if (typeof window._vhSyncBanner === 'function') window._vhSyncBanner();
    if (typeof window.updateRacesAndPositions === 'function') window.updateRacesAndPositions();
    if (typeof window._vhBallotRerender === 'function') window._vhBallotRerender();
    if (typeof window._mypolBuildGrid === 'function') window._mypolBuildGrid();
    // Repaint Your Key Races too. Its area is inferred from _currentVoterLocation,
    // so a location set via the map (or any other path) must re-render it or the
    // overview's districts/officeholders would silently disagree with the map and
    // the Relevant-to-Me ballot below it. Keeps all three surfaces locked together.
    if (typeof window.renderKeyRaces === 'function') window.renderKeyRaces();
    if (typeof window.renderRelevantToMe === 'function') window.renderRelevantToMe();
    if (typeof window.myteamBrowseFilter === 'function') window.myteamBrowseFilter();
    // Local Issues is location-gated: reveal (and re-filter to the voter's state)
    // as soon as a location is set or changed, and hide it again if cleared.
    if (typeof window._pdxRenderLocalIssues === 'function') window._pdxRenderLocalIssues();
    // The H.R.1 Showcase receipts grid puts the voter's own members of Congress
    // first, so re-render it when the location changes to re-sort around the new area.
    if (window.PDXHR1 && typeof window.PDXHR1.refresh === 'function') { try { window.PDXHR1.refresh(); } catch (e) {} }
    if (typeof window._renderElectionDates === 'function') window._renderElectionDates();
    if (typeof window._renderVoterHubCountdown === 'function') window._renderVoterHubCountdown();
    if (typeof window._pdxRefreshMapIndicators === 'function') window._pdxRefreshMapIndicators();
    
    var pmStateSel = document.getElementById('pm-state-sel');
    if (pmStateSel) pmStateSel.value = (state === 'National' ? 'national' : 'all');
    if (typeof window.pmFilterLocation === 'function') window.pmFilterLocation();
  };

  window.voterLocationStateChanged = function() {
    var stateSel = document.getElementById('voter-state-sel');
    var distSel = document.getElementById('voter-district-sel');
    if (!stateSel) return;
    var state = stateSel.value;
    window._currentVoterLocation.state = state;

    // The modal is now the source of truth for the voter's location, so drop any
    // earlier explicit "Key Races" area pick. That stale pick would otherwise keep
    // pinning the "Relevant to Me" ballot to the old area and stop it from updating
    // when the voter changes their state/county/district here. Clearing it lets the
    // area re-infer from the new location.
    try { localStorage.removeItem('politidex_keyraces_location'); } catch(e) {}

    if (!state) {
      window._currentVoterLocation = { state: '', city: '', county: '', district: '' };
      window._hasUserLocation = false;
      try { localStorage.removeItem(PDX_LOC_KEY); } catch(e) {}
    } else if (state === 'National') {
      window._currentVoterLocation.city = '';
      window._currentVoterLocation.county = '';
      window._currentVoterLocation.district = '';
      window.saveVoterLocation();
    } else {
      window._currentVoterLocation.district = (distSel && distSel.value) ? distSel.value.replace(/[^0-9]/g, '') : '';
      window.saveVoterLocation();
    }

    // Re-arrange the modal (map card vs. manual selector, field visibility) for the
    // newly chosen state.
    if (typeof window._syncLocationModalLayout === 'function') window._syncLocationModalLayout();

    window._triggerLocationReaction();
  };

  window.voterLocationDistrictChanged = function() {
    var distSel = document.getElementById('voter-district-sel');
    if (!distSel) return;
    var num = (distSel.value || '').replace(/[^0-9]/g, '');
    window._currentVoterLocation.district = num;
    // A manual edit supersedes any earlier map pinpoint, so drop the map flag and
    // the exact State House/Senate numbers it had set.
    window._currentVoterLocation.mapSelected = false;
    window._currentVoterLocation.stateHouseDistrict = '';
    window._currentVoterLocation.stateSenateDistrict = '';
    // Modal location wins over any earlier explicit Key Races pick (see above).
    try { localStorage.removeItem('politidex_keyraces_location'); } catch(e) {}
    window.saveVoterLocation();

    window._triggerLocationReaction();
  };

  window.voterLocationCountyChanged = function() {
    var countyInput = document.getElementById('voter-county-input');
    if (!countyInput) return;
    var val = (countyInput.value || '').trim();
    // Store both city and county as the free-text value for 100% dynamic national use
    window._currentVoterLocation.city = val;
    window._currentVoterLocation.county = val;
    // A typed city/county supersedes a map pinpoint — clear it for an honest indicator.
    window._currentVoterLocation.mapSelected = false;
    window._currentVoterLocation.stateHouseDistrict = '';
    window._currentVoterLocation.stateSenateDistrict = '';
    // Modal location wins over any earlier explicit Key Races pick (see above).
    try { localStorage.removeItem('politidex_keyraces_location'); } catch(e) {}
    window.saveVoterLocation();

    window._triggerLocationReaction();
  };

  window.updateRelevantLocationText = function() {
    var textEl = document.getElementById('relevant-location-text');
    if (!textEl) return;
    // Keep the "which team am I viewing" tag in sync whenever the location line
    // repaints (it lives just below it in the same header).
    try { if (typeof window._homeRenderRelevantTag === 'function') window._homeRenderRelevantTag(); } catch (e) {}

    // When the focused, exact-district ballot applies (a matched Key Races area, or
    // no saved location yet), let renderRelevantToMe own this line so the header and
    // the grid stay in sync.
    var _krLT = (typeof window.keyRacesRelevantData === 'function') ? window.keyRacesRelevantData() : null;
    if (_krLT && (!window._hasUserLocation || _krLT.matched)) {
      return;
    }

    if (!window._hasUserLocation) {
      textEl.innerHTML = '📍 Set your location to see your representatives — <button type="button" onclick="window.toggleChangeLocation()" style="background:none;border:none;padding:0;cursor:pointer;font:inherit;color:#fbbf24;text-decoration:underline;">choose location</button> to personalize this list.';
      return;
    }

    var loc = window._currentVoterLocation || { state: '', city: '', county: '', district: '' };
    var userCounty = loc.county || loc.city || '';
    var normalizedCounty = '';
    if (userCounty) {
      var ucLower = userCounty.toLowerCase();
      if (ucLower.includes('davis') || ucLower.includes('layton')) normalizedCounty = 'Davis County';
      else if (ucLower.includes('utah') || ucLower.includes('provo') || ucLower.includes('orem')) normalizedCounty = 'Utah County';
      else if (ucLower.includes('washington') || ucLower.includes('st. george') || ucLower.includes('st george')) normalizedCounty = 'Washington County';
      else if (ucLower.includes('weber') || ucLower.includes('ogden')) normalizedCounty = 'Weber County';
      else normalizedCounty = userCounty;
    }
    var areaName;
    if (normalizedCounty) {
      var cityRaw = (loc.city || '').trim();
      var cityClean = (cityRaw && cityRaw.toLowerCase() !== normalizedCounty.toLowerCase() && cityRaw.toLowerCase().indexOf('county') === -1)
        ? cityRaw.replace(/\b\w/g, function(c) { return c.toUpperCase(); })
        : '';
      areaName = cityClean ? (cityClean + ' / ' + normalizedCounty) : normalizedCounty;
    } else {
      areaName = 'your area';
    }
    // NO STATE STANDS IN FOR A MISSING ONE. This line used to read
    // `loc.state || 'Utah'`, which meant a located reader whose state field was
    // somehow blank was told they were being shown Utah's politicians. There is
    // no honest substitute for a state we do not have, so the clause naming it is
    // dropped and the area stands alone.
    var stateDisplay = String(loc.state || '').trim();
    textEl.innerHTML = '📍 Showing politicians for <strong class="text-blue-300">' + areaName + '</strong>' + (stateDisplay ? (', ' + stateDisplay) : '') + ' – your direct representatives. ' +
      '<button type="button" onclick="window.toggleChangeLocation()" style="background:none;border:none;color:#60a5fa;text-decoration:underline;cursor:pointer;padding:0;font:inherit;">change area</button>';
  };

  window._vhUpdateLocationText = function() {
    window._vhSyncBanner();
    if (typeof window._vhBallotRerender === 'function') window._vhBallotRerender();
  };

  // Drop the location map badge's pin on the voter's Utah county. Coordinates are
  // county centroids (lat/lng) projected into the same 100×116 viewBox the inline
  // Utah outline uses, so the pin lands where the county actually is — a quick,
  // honest visual confirmation of the detected location. When the county isn't a
  // recognized Utah county (unset location, or a non-Utah state) the pin rests at
  // the state's center, slightly dimmed, rather than implying false precision.
  window._vhPositionLocPin = function(loc) {
    var pin = document.getElementById('vh-loc-mappin');
    if (!pin) return;
    loc = loc || window._currentVoterLocation || {};
    var state = (loc.state || '').toLowerCase();
    var county = (loc.county || loc.city || '').toLowerCase().replace(/\bcounty\b/g, '').trim();
    // County centroids, keyed by lowercase name (matches on city too via substring).
    var UT = {
      'beaver':[38.36,-113.24],'box elder':[41.52,-112.74],'cache':[41.72,-111.74],
      'carbon':[39.65,-110.59],'daggett':[40.88,-109.51],'davis':[41.02,-112.10],
      'duchesne':[40.30,-110.42],'emery':[38.99,-110.70],'garfield':[37.85,-111.44],
      'grand':[38.98,-109.57],'iron':[37.86,-113.29],'juab':[39.70,-112.05],
      'kane':[37.28,-111.89],'millard':[39.07,-113.10],'morgan':[41.09,-111.57],
      'piute':[38.34,-112.12],'rich':[41.63,-111.24],'salt lake':[40.67,-111.92],
      'san juan':[37.63,-109.81],'sanpete':[39.37,-111.58],'sevier':[38.75,-111.80],
      'summit':[40.87,-110.96],'tooele':[40.45,-113.13],'uintah':[40.13,-109.52],
      'utah':[40.12,-111.67],'wasatch':[40.33,-111.17],'washington':[37.28,-113.51],
      'wayne':[38.32,-110.87],'weber':[41.27,-111.91]
    };
    // Well-known cities → county, so a city-only location still resolves.
    var CITY = {
      'layton':'davis','farmington':'davis','bountiful':'davis','clearfield':'davis','kaysville':'davis',
      'salt lake':'salt lake','sandy':'salt lake','west valley':'salt lake','murray':'salt lake','draper':'salt lake',
      'provo':'utah','orem':'utah','lehi':'utah','american fork':'utah',
      'ogden':'weber','roy':'weber','st. george':'washington','st george':'washington','saint george':'washington',
      'logan':'cache','park city':'summit','moab':'grand','cedar':'iron','tooele':'tooele'
    };
    var key = '';
    if (state === 'utah' || (!state && county)) {
      if (UT[county]) key = county;
      else {
        for (var c in CITY) { if (county.indexOf(c) !== -1) { key = CITY[c]; break; } }
        if (!key) { for (var k in UT) { if (county.indexOf(k) !== -1) { key = k; break; } } }
      }
    }
    var x, y, precise = !!key;
    if (precise) {
      var ll = UT[key];
      // Project lat/lng into the viewBox: lng −114..−109 → x 8..92; lat 42..37 → y 6..110.
      x = 8 + ((ll[1] + 114) / 5) * 84;
      y = 6 + ((42 - ll[0]) / 5) * 104;
      x = Math.max(12, Math.min(88, x));
      y = Math.max(14, Math.min(104, y));
    } else {
      x = 50; y = 62; // Utah's rough center as a neutral resting spot.
    }
    pin.setAttribute('transform', 'translate(' + x.toFixed(1) + ',' + y.toFixed(1) + ')');
    pin.style.opacity = precise ? '1' : (window._hasUserLocation ? '0.8' : '0.5');
  };

  // Sync the prominent "YOUR LOCATION" banner (Power Map) — 100% dynamic from localStorage saved city/county/state/district.
  // No hardcoded state or default city. Purely reflects whatever the user saved.
  window._vhSyncBanner = function() {
    // FIRST, WRITE DOWN WHAT THIS PLACE RESOLVES TO. This is the location-sync
    // signal — it fires when a location is established at load, restored from an
    // account, or changed — and it is therefore the write path for the per-chamber
    // district memory the OTHER documents read. It has to run before the paints
    // below rather than after, because they are the readers: the homepage card
    // resolves from the curated tables it has, /me resolves from this record, and
    // the record has to be current by the time anything asks.
    try { if (typeof window.pdxRememberResolved === 'function') window.pdxRememberResolved(); } catch (e) {}
    try { if (typeof window._vhPositionLocPin === 'function') window._vhPositionLocPin(); } catch (e) {}
    try { if (typeof window._vhSyncDistrictStrip === 'function') window._vhSyncDistrictStrip(); } catch (e) {}
    // The homepage front door reads the same resolver as the strip above, so it
    // re-paints on the same signal. Guarded like the rest: a missing module must
    // never stop the banner from syncing.
    try { if (window.PDXWhoRepresentsMe && window.PDXWhoRepresentsMe.sync) window.PDXWhoRepresentsMe.sync(); } catch (e) {}
    // The Team Builder's "start one step earlier" strip retires itself once step ①
    // is behind the visitor, which is exactly this signal.
    try { if (typeof window._myteamFindRepsSync === 'function') window._myteamFindRepsSync(); } catch (e) {}
    // The homepage ballot band shows "Set where you vote" until there is a
    // location and the saved place after that, so it is a reader of this signal
    // too. It polls a few times on its own as a backstop, but this is the edge
    // that makes the band flip the instant the location is saved.
    try { if (typeof window._pdxBallotBandSync === 'function') window._pdxBallotBandSync(); } catch (e) {}
    try { if (typeof window._vhSyncPathSteps === 'function') window._vhSyncPathSteps(); } catch (e) {}
    try { if (typeof window._pdxFirstRunSync === 'function') window._pdxFirstRunSync(); } catch (e) {}
    var loc = window._currentVoterLocation || { state: '', city: '', county: '', district: '' };
    var grad = '<span style="background:linear-gradient(90deg,#ef4444,#ffffff,#3b82f6);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;">';
    var cityEl    = document.getElementById('vh-loc-city');
    var subEl     = document.getElementById('vh-loc-subdesc');
    var titleEl   = document.getElementById('pm-loc-title');
    var areaEl    = document.getElementById('pm-area-desc');
    var labelEl   = document.getElementById('pm-location-label');
    var eduEl     = document.getElementById('vh-ballot-edu');
    var pmStateSel  = document.getElementById('pm-state-sel');
    var pmCountySel = document.getElementById('pm-county-sel');

    // WHICH FACE THE ONE SETTER WEARS. The card at the top of Who Represents Me
    // offers three doors while there is nothing to change and one door once
    // there is, and this attribute is what decides between them (the CSS is in
    // index.html). It is set here rather than in the band's own module because
    // the question it answers — is there a stamped location — is this file's to
    // answer, and two owners would be two answers.
    var locBar = document.getElementById('wrm-locbar');
    if (locBar) locBar.setAttribute('data-pdxloc', window._hasUserLocation ? 'set' : 'empty');

    if (!window._hasUserLocation) {
      if (cityEl) cityEl.innerHTML = 'Your ' + grad + 'Area</span>';
      // NOT "your representatives" — "who holds your seats". The band below
      // this line names six seats and fills the ones it can resolve; the
      // instruction is for the reader who has not told us where they vote, and
      // it says what setting a location buys them in the band's own words.
      if (subEl)  subEl.textContent = 'Set your location to see who holds your seats';
      if (labelEl) labelEl.innerHTML = '📍 Set your location to see who holds your seats';
      if (pmStateSel)  pmStateSel.value = '';
      if (pmCountySel) pmCountySel.value = 'all';
      if (typeof window.pmFilterLocation === 'function') window.pmFilterLocation();
      return;
    }

    var city = loc.city || loc.county || '';
    var state = loc.state || '';
    var displayLoc = [city, state].filter(Boolean).join(', ') || 'Your Area';
    var districtText = loc.district ? ' · District ' + loc.district : '';

    // Prominent header = "City / County, State" so the voter sees both the place
    // they picked and the county that anchors it. The sub-line then names the
    // three exact districts they actually vote in — resolved from the same Key
    // Races data the ballot uses — instead of a vague "the county sets your
    // districts". A split county like Davis never determines districts on its
    // own, so we show the real seat numbers rather than implying the county does.
    var countyRaw = (loc.county || '').trim();
    var countyDisp = countyRaw ? (/county/i.test(countyRaw) ? countyRaw : countyRaw + ' County') : '';
    var placeName = city || 'Your Area';
    var _dnum = function(v) { return String(v == null ? '' : v).replace(/[^0-9]/g, ''); };

    // Resolve the voter's three districts exactly as the strip below does.
    var _hdrKrd = (typeof window.keyRacesRelevantData === 'function') ? window.keyRacesRelevantData() : null;
    var _hdrMatched = !!(_hdrKrd && _hdrKrd.matched && state.toLowerCase() === 'utah');
    var _hdrHouse  = (_hdrMatched && _hdrKrd.byRace && _hdrKrd.byRace.house)       ? _hdrKrd.byRace.house.district       : (loc.district || null);
    var _hdrSenate = (_hdrMatched && _hdrKrd.byRace && _hdrKrd.byRace.statesenate) ? _hdrKrd.byRace.statesenate.district : null;
    var _hdrLower  = (_hdrMatched && _hdrKrd.byRace && _hdrKrd.byRace.statehouse)  ? _hdrKrd.byRace.statehouse.district  : null;

    if (cityEl) {
      var _countyTail = (countyDisp || state)
        ? ' <span style="font-size:0.42em;font-weight:700;letter-spacing:0.04em;color:#9fb4d4;white-space:nowrap;">/ ' + [countyDisp, state].filter(Boolean).join(', ') + '</span>'
        : '';
      cityEl.innerHTML = '<span style="color:#fff;">' + placeName + '</span>' + _countyTail;
    }
    if (subEl) {
      var _distSeg = function(label, num, color) {
        return '<span style="white-space:nowrap;"><span style="color:' + color + ';font-weight:800;">' + label + '</span> <span style="color:#e2e8f0;font-weight:700;">District ' + num + '</span></span>';
      };
      var _segs = [];
      if (_dnum(_hdrHouse))  _segs.push(_distSeg('U.S. House',   _dnum(_hdrHouse),  '#60a5fa'));
      if (_dnum(_hdrSenate)) _segs.push(_distSeg('State Senate', _dnum(_hdrSenate), '#a78bfa'));
      if (_dnum(_hdrLower))  _segs.push(_distSeg('State House',  _dnum(_hdrLower),  '#2dd4bf'));
      if (_segs.length) {
        subEl.innerHTML = '<span style="color:#9fb4d4;font-weight:700;letter-spacing:0.05em;">YOUR DISTRICTS:</span> ' +
          _segs.join('<span style="color:#475569;margin:0 0.15rem;"> • </span>');
      } else {
        subEl.innerHTML = (countyDisp || state)
          ? '<span style="color:#ef4444;">📍</span> <strong style="color:#fff;">' + [countyDisp, state].filter(Boolean).join(', ') + '</strong> — your districts are mapped below'
          : 'Set your location to see who holds your seats';
      }
    }
    if (titleEl) titleEl.textContent = displayLoc + districtText;
    if (areaEl)  areaEl.innerHTML = 'These are the politicians who directly affect <strong style="color:#fbbf24;">YOUR daily life</strong> in ' + displayLoc + '. Know their record. Hold them accountable.';
    if (labelEl) labelEl.innerHTML = '📍 Showing: <strong>' + displayLoc + districtText + '</strong> — politicians who represent you';
    if (eduEl) {
      var _posCount = (window.TEAM_POSITIONS && window.TEAM_POSITIONS.length) || 6;
      eduEl.innerHTML = 'As a voter in <strong style="color:#fbbf24;">' + displayLoc + '</strong>, you\'ll vote for <strong style="color:#e2e8f0;">' + _posCount + ' key position' + (_posCount === 1 ? '' : 's') + '</strong>. Select your preferred candidate for each race below to build your personal <strong style="color:#4ade80;">"My Voting Team"</strong> slate.';
    }

    if (pmStateSel) pmStateSel.value = (state === 'National' ? 'national' : 'all');
    if (pmCountySel) pmCountySel.value = 'all';

    if (typeof window.pmFilterLocation === 'function') window.pmFilterLocation();
  };

  // Expand / collapse one of the "other races" disclosure panels (Statewide /
  // Federal) inside the Your Voting Districts strip. These stay collapsed by
  // default so the local district cards remain the clear focus; the toggle is a
  // gentle reminder that other levels of government are on the ballot too.
  window._vhToggleRacePanel = function(btn, panelId) {
    var p = document.getElementById(panelId);
    if (!p) return;
    var open = (p.style.display === 'none' || !p.style.display);
    p.style.display = open ? 'block' : 'none';
    if (btn) {
      var chev = btn.querySelector('.vh-bx-chev');
      if (chev) chev.textContent = open ? '▲' : '▼';
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    }
  };

  // The four "Your Voting Districts" level keys, in display order. Kept as a
  // shared list so the accordion logic can walk every level without re-deriving
  // it from the DOM (and so U.S. House stays the canonical default-open level).
  window._vhLevelKeys = ['house', 'statesenate', 'statehouse', 'local'];

  // Paint a single level's open/closed state — panel visibility plus the button's
  // tinted background, ring, border and ▲/▼ chevron. Split out of the toggle so
  // the accordion can close every other level and open the target in one pass.
  window._vhSetLevelOpen = function(levelKey, open) {
    var panel = document.getElementById('vh-level-panel-' + levelKey);
    var btn = document.getElementById('vh-level-btn-' + levelKey);
    if (!panel) return;
    panel.style.display = open ? 'block' : 'none';
    if (btn) {
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      var c = btn.getAttribute('data-color') || '#60a5fa';
      var chev = btn.querySelector('.vh-lv-chev');
      if (chev) chev.textContent = open ? '▲' : '▼';
      btn.style.borderColor = open ? c : (c + '80');
      btn.style.background = open
        ? ('linear-gradient(135deg,' + c + '40,' + c + '17)')
        : ('linear-gradient(160deg,' + c + '24,rgba(9,13,26,0.74) 72%)');
      btn.style.boxShadow = open
        ? ('0 0 0 1.5px ' + c + '8c,0 0 24px ' + c + '33,0 10px 24px rgba(0,0,0,0.44)')
        : ('0 3px 12px rgba(0,0,0,0.42),inset 0 0 0 1px ' + c + '2b,inset 0 1px 0 rgba(255,255,255,0.06)');
    }
  };

  // Expand / collapse one level of the "Your Voting Districts" directory as a true
  // accordion: only ONE level can be open at a time, so the section never feels
  // cluttered. Opening a closed level collapses whichever level was open; clicking
  // the already-open level collapses it (leaving none open). U.S. House starts
  // expanded by default at render time. The button carries its accent color in
  // data-color so the open state (tinted background + ring + ▲ chevron) reads
  // clearly without a stylesheet. Modeled on _vhToggleRacePanel above.
  window._vhToggleLevel = function(levelKey) {
    var panel = document.getElementById('vh-level-panel-' + levelKey);
    if (!panel) return;
    var wasOpen = !(panel.style.display === 'none' || !panel.style.display);
    var keys = window._vhLevelKeys || ['house', 'statesenate', 'statehouse', 'local'];
    for (var i = 0; i < keys.length; i++) {
      // Close every level; re-open the clicked one only if it was closed.
      window._vhSetLevelOpen(keys[i], keys[i] === levelKey ? !wasOpen : false);
    }
  };

  // ── window._pdxStatewideSeats(state) — the two seats with no district math ───
  // A voter's U.S. Senators and their Governor are elected by the WHOLE state, so
  // naming them needs nothing but the state the visitor already gave us — no
  // district geometry, no curated area, no map pin. PolitiDex holds those records
  // nationally (a Governor for every state, and at least one U.S. Senator for
  // every state), and until now the front door named none of them, because the
  // only seats it knew how to resolve were the three that need districts and the
  // only districts it curates are Utah's. That is the gap this closes.
  //
  // Resolution is from roster metadata ONLY — a person's `office` string and
  // their `state` — and it is deliberately conservative, because a mis-assigned
  // senator is worse than a blank row:
  //
  //   · Governor is matched on the office string EXACTLY. "Lieutenant Governor"
  //     and "Governor Candidate" are different offices and are never matched.
  //   · The U.S. Senate is matched by ruling state offices OUT first, then
  //     letting federal ones in. It has to work this way because a sitting U.S.
  //     Senator's office string is frequently a leadership or committee title
  //     rather than "U.S. Senator" — Thune reads "U.S. Senate Majority Leader",
  //     Grassley "Senate Judiciary Chair & President pro tempore", Luján
  //     "Assistant Senate Democratic Leader". Matching only the plain title would
  //     silently drop one of a state's two senators and print a blank beside a
  //     record the app holds in full.
  //   · A state that somehow resolves MORE than two senators is a data fault, not
  //     a seat we get to guess at. Both rows go blank and `ambiguous` is set, so
  //     the surface says "not resolved" rather than picking two of three.
  //
  // Memoized per state: the two callers below run on every location change and on
  // several deferred re-syncs, and this walks the whole roster.
  //
  // THE CACHE IS KEYED ON THE ROSTER, NOT JUST THE STATE, AND THAT IS THE WHOLE
  // POINT OF THE `n` FIELD. This file is a PLAIN script in the middle of the
  // document; cmp-data.js is DEFERRED. So the first resolution of a returning
  // visitor's seats runs while window.CMP_DATA does not exist yet, finds no
  // senators and no governor, and — before this pass — wrote that emptiness into
  // the cache permanently. Every later re-sync, long after the roster had landed,
  // read the poisoned entry back. That is exactly the live failure this fixes: a
  // Layton voter read "3 of 6 seats resolved" with both U.S. Senate rows and the
  // Governor row printing "no record on file yet" over Mike Lee, John Curtis and
  // Spencer Cox — three people this app holds full files for at /p/lee, /p/curtis
  // and /p/cox. A memo that outlives the reason its answer was empty is not a
  // cache, it is a wrong answer with a long lease.
  //
  // So an entry records the roster size it was computed from and is reused only
  // while that size holds, and an empty roster is never cached at all. Both
  // clauses matter: the second stops the pre-load blank from being stored, the
  // first re-resolves after profiles-full.js and the expansion controller merge
  // more records into the same global.
  var _pdxStatewideCache = {};

  // ── AND A LEDGER THE MEMO CANNOT UNDO: ONCE NAMED, NEVER UN-NAMED ──────────
  // The size key above fixes a memo that remembered an emptiness. It does not fix
  // the opposite direction, which is the failure a Layton reader met on a live
  // phone: the band painted SIX of six with John Curtis and Mike Lee, and then a
  // second roster payload landed and the same rows became "No record on file yet
  // — we'd rather leave this blank than name the wrong person", with the count
  // dropping to three. The names were not wrong and then corrected. They were
  // right, and then deleted.
  //
  // A second payload is a MERGE into the same global, so it can only ever add
  // records or overwrite fields of records already there — and the fields that
  // decide a statewide seat are two strings, `office` and `state`. A payload that
  // arrives without them (a light Firestore stub for a record the bundle already
  // described in full) blanks the very metadata this walk matches on, the walk
  // finds no senators and no governor for Utah, and every surface downstream
  // faithfully repaints that as a coverage admission over three people with full
  // files at /p/curtis, /p/lee and /p/cox.
  //
  // Growing the roster invalidates the memo by design, so the size key does not
  // protect against this. Nothing does, unless the resolver keeps its own record
  // of what it has already answered — so it does:
  //
  //   `_pdxStatewideBest[state]` holds the last NON-EMPTY statewide answer for a
  //   state. It is only ever written by a walk that found somebody, it is never
  //   cleared by a roster arrival (the pill that says "Loading the latest roster…"
  //   is a toast, and a toast may not delete a human), and an empty walk is
  //   carried back to it seat by seat rather than overwriting it.
  //
  // WHAT RELEASES A REMEMBERED HOLDER, because "sticky forever" would be its own
  // kind of lie. Exactly two things:
  //
  //   · A DIFFERENT PID. A walk that resolves somebody wins outright and is
  //     recorded in their place — the ledger never competes with an answer.
  //   · THE PERSON LEAVING THE ROSTER. A pid still on file whose office string a
  //     partial payload flattened is a loading state; a pid the roster no longer
  //     holds at all is the roster genuinely no longer knowing them, and that
  //     empty is honoured. `_pdxRosterKeeps()` is the whole test, and it declines
  //     to answer at all while the roster is empty — a page with no roster in the
  //     window yet has no opinion about who left office.
  //
  // The ledger lives for one page load and is never persisted, so a real change
  // of officeholder is picked up on the next visit rather than being cached into
  // the reader's browser — and within a session a fresh answer always beats it.
  var _pdxStatewideBest = {};

  // ── WHICH INDEX IS "THE ROSTER" ON THIS DOCUMENT ──────────────────────────
  // Every read below used to name window.CMP_DATA directly, and that one word is
  // why /me printed "No officeholder on file" on all six ballot rows for a Davis
  // County reader while Who Represents Me named the same reader's senators on the
  // homepage. CMP_DATA is created by cmp-data.js, and cmp-data.js is not on /me:
  // me.html gates its whole PROFILES-into-CMP_DATA merge on
  // `typeof CMP_DATA !== 'undefined'`, so on that document the global is never
  // created, `_pdxRosterSize()` answered 0 forever, the statewide walk never ran,
  // and six honest-looking blanks were painted over three people the product
  // holds full files for.
  //
  // The roster is not a GLOBAL NAME, it is whichever people index the document
  // actually carries, and there are two of them: the bundled roster (CMP_DATA,
  // on the shells that load cmp-data.js) and the live Firestore roster
  // (window.PROFILES, on every shell that boots Firebase, /me included). Both
  // hold the same record shape — the `office` and `state` strings the statewide
  // walk matches on, and the pid the row links to — because me.html and
  // index.html merge one into the other where both exist.
  //
  // So this file asks ONE question in ONE place: what is the roster here? The
  // bundle wins where it has rows, because on the shells that carry it the live
  // index has already been merged into it; the live index answers where the
  // bundle is absent. Nothing here is a second seat-holder table and nothing here
  // names a person: it is the same walk over the same records, pointed at the
  // index this document has rather than at the one it does not.
  function _pdxRosterTable() {
    var r = null;
    try {
      r = window.CMP_DATA;
      if (r && typeof r === 'object') { for (var k in r) { if (Object.prototype.hasOwnProperty.call(r, k)) return r; } }
    } catch (e) {}
    try {
      r = window.PROFILES;
      if (r && typeof r === 'object') { for (var j in r) { if (Object.prototype.hasOwnProperty.call(r, j)) return r; } }
    } catch (e2) {}
    return null;
  }

  // One record, looked up across both indexes. A lookup is asked in the
  // generous direction on purpose: every caller of it either NAMES somebody or
  // declines to un-name them, so a pid that either index still holds is a pid
  // this page still knows.
  function _pdxRosterRaw(pid) {
    if (!pid) return null;
    try {
      var c = window.CMP_DATA;
      if (c && c[pid]) return c[pid];
    } catch (e) {}
    try {
      var p = window.PROFILES;
      if (p && p[pid]) return p[pid];
    } catch (e2) {}
    return null;
  }

  // ── AND UNDER WHICHEVER KEY THE ROW IS ACTUALLY FILED ─────────────────────
  // The lookup above is a RAW key lookup, and on a document whose only roster is
  // the live Firestore index that is not the same question as "do we hold this
  // person". For a handful of officeholders the live document is filed under the
  // slug of their display name and the roster record under the legislative id
  // the seat resolves to: `scott_chew` holds the document, `chew_h68` holds the
  // record and the 90-act formal file. Ask window.PROFILES for `chew_h68` on a
  // document with no cmp-data.js and the answer is nothing — which
  // _pdxRosterKeeps() below then reads as the member having left the roster.
  //
  // That is how /voice printed "No sitting member on hand for this seat" on the
  // Utah State House card for a Lapoint reader whose front-page band named Scott
  // Chew in the same session, off the same pdxRepsForMe() seat list, out of the
  // same remembered district. The seat resolved; the gate un-named it.
  //
  // So the raw miss is JOINED, not trusted. window.PDX_PROFILE_ALIAS is this
  // repo's standing assertion that the id on its left names the same officeholder
  // as the id on its right — the table profile-evidence.js declares, person-file's
  // canonId, PDXPersonLink's href and data-hygiene's _hyCanonId all already read,
  // and that profile-alias.js puts on the lean documents in 2 KB. Read in reverse
  // it answers exactly the question a key lookup cannot: which OTHER keys a row
  // for this pid may be filed under. If one of them has a row, the row exists and
  // this page holds the person.
  //
  // THIS IS NOT A SECOND SEAT-HOLDER TABLE AND IT NAMES NOBODY. The join maps id
  // to id; every pid it can reach came from the seat list, every pair it walks is
  // a ruling made somewhere else, and the direction is one-hop — a canonical id
  // to the retired spellings of itself, never a chain. Where the table is absent
  // the gate behaves exactly as it did before it: a raw lookup, failing open
  // through _pdxRosterKeeps().
  var _PDX_NO_ALIAS = [];
  var _pdxAliasRev = null, _pdxAliasSrc = null;
  function _pdxAliasKeys(pid) {
    if (!pid) return _PDX_NO_ALIAS;
    var t = null;
    try { t = window.PDX_PROFILE_ALIAS; } catch (e) {}
    if (!t || typeof t !== 'object') return _PDX_NO_ALIAS;
    // Rebuilt only when the table itself is replaced, so a per-seat gate check
    // stays a hash lookup however many times a repaint asks it.
    if (t !== _pdxAliasSrc) {
      _pdxAliasSrc = t;
      _pdxAliasRev = {};
      try {
        for (var k in t) {
          if (!Object.prototype.hasOwnProperty.call(t, k)) continue;
          var v = t[k];
          if (!v || v === k) continue;
          v = String(v);
          (_pdxAliasRev[v] = _pdxAliasRev[v] || []).push(k);
        }
      } catch (e2) { _pdxAliasRev = {}; }
    }
    return _pdxAliasRev[pid] || _PDX_NO_ALIAS;
  }

  // ── AND IT IS THE ROW THAT CAN NAME THEM, NOT MERELY THE FIRST ROW ────────
  // The walk below stops on the row that carries a display name rather than on
  // the first row it finds, because on the live index those are not always the
  // same row. A bulk Firestore load writes a `__lite` record for every document
  // it lists, and the retired spelling is the one that holds the full document:
  // for Utah House District 68 the named record is filed under `scott_chew` and
  // the canonical key can be holding a thin row with no `name` on it at all.
  // First-row-wins then answered the gate correctly and the card wrongly — the
  // seat kept its member and the hallway printed "The member who holds this
  // seat is on file" over a person whose name was one key away.
  //
  // EXISTENCE SEMANTICS ARE UNCHANGED, WHICH IS WHY THIS STAYS ONE FUNCTION.
  // `first` keeps whatever row was seen, so the return value is non-null for
  // exactly the same pids as before: every key that had a row still has one and
  // the gate's truthiness test reads the same answer it always did. What changed
  // is only WHICH of two rows for one officeholder comes back, and that question
  // only ever mattered to the caller that prints a name.
  function _pdxRosterName(rec) {
    if (!rec || typeof rec !== 'object') return '';
    try { return String(rec.name == null ? '' : rec.name).trim(); } catch (e) { return ''; }
  }

  function _pdxRosterRec(pid) {
    if (!pid) return null;
    var first = _pdxRosterRaw(pid);
    if (_pdxRosterName(first)) return first;
    var keys = _pdxAliasKeys(pid);
    for (var i = 0; i < keys.length; i++) {
      var alt = _pdxRosterRaw(keys[i]);
      if (_pdxRosterName(alt)) return alt;
      if (alt && !first) first = alt;
    }
    return first || null;
  }

  // PUBLISHED, BECAUSE THE NAME AND THE GATE MUST BE ONE READ. voice-room.js
  // prints the sitting member's name on a document that has no cmp-data.js and no
  // _pdxPersonById, so its only source for a display record is the same live index
  // this gate keys — and if it keyed it rawly while the gate joined, the resolver
  // would keep a pid the hallway could not name and the card would fall back to
  // "The member who holds this seat is on file". One function, asked twice: is
  // this pid still a person here, and what record is that person. No caller
  // composes a label, and nothing here decides which pid holds a seat.
  window.pdxRosterRec = function (pid) { return _pdxRosterRec(pid) || null; };

  function _pdxRosterSize() {
    try {
      var r = _pdxRosterTable();
      return r ? Object.keys(r).length : 0;
    } catch (e) { return 0; }
  }

  // ── IS THE ROSTER HERE YET? PUBLISHED, BECAUSE A BLANK HAS TWO MEANINGS ────
  // "This seat resolved nobody" and "the index this page resolves seats from has
  // not arrived" are different sentences, and only the surface printing the row
  // can choose between them. pdxSeatHolders() below carries the answer on every
  // reply it makes; this is the same fact for a caller that has no seat in hand.
  window.pdxRosterWarm = function () {
    return !!_pdxRosterSize();
  };

  // Is this pid still a record in the roster at all? The one question that
  // separates "a payload flattened their office string" from "we no longer hold
  // this person" — and therefore the one thing that may un-name a seat.
  function _pdxRosterHas(pid) {
    if (!pid) return false;
    return !!_pdxRosterRec(pid);
  }

  // …AND THE ROSTER ONLY GETS A VOTE WHILE IT HAS ROWS. An empty roster is a page
  // mid-load, not a page whose officeholders resigned, so "is this pid gone?" is
  // a question it is not entitled to answer yet. Every carry-forward
  // below asks THIS, not the raw lookup: absence of a roster is never evidence of
  // absence of a person.
  function _pdxRosterKeeps(pid) {
    if (!pid) return false;
    if (!_pdxRosterSize()) return true;
    return _pdxRosterHas(pid);
  }

  function _pdxStateName(v) {
    // Roster `state` fields are not uniformly clean — a U.S. Representative reads
    // "Utah · UT-1" and a state legislator "UT District 6". Statewide seats are
    // only ever matched on the leading state name, and anything that does not
    // reduce to a plain state name matches nothing.
    return String(v == null ? '' : v).split('·')[0].split('-')[0].trim().toLowerCase();
  }

  function _pdxIsUsSenatorOffice(office) {
    var o = String(office == null ? '' : office).trim();
    if (!o) return false;
    // Rule out, in order: every state upper chamber, every Utah-specific variant,
    // and anything marked former. "State Senator", "Ohio State Senator", "State
    // Senate President", "UT State Senator", "Utah Senate President", "Former UT
    // State Senator" all leave here.
    if (/\bstate\s+senat/i.test(o)) return false;
    if (/^(utah|ut)\s+senate\b/i.test(o)) return false;
    if (/\bformer\b/i.test(o)) return false;
    // Then let the federal chamber in: the plain title, the four elected floor
    // leaders, and the committee chairs / ranking members that only U.S. Senators
    // hold. Every one of these is a seat in the United States Senate.
    if (/\bu\.s\.\s*senat/i.test(o)) return true;
    if (/\bsenate\b/i.test(o)) return true;
    return false;
  }

  function _pdxIsGovernorOffice(office) {
    return String(office == null ? '' : office).trim().toLowerCase() === 'governor';
  }

  // ── AND WHEN THE OFFICE STRING STOPS AGREEING WITH THE ARCHIVE ─────────────
  // Everything above resolves a statewide seat from two roster strings, with its
  // own matchers. Door 1's archive resolves the SAME people from the SAME roster
  // with DIFFERENT matchers — window._pdxBrowseType (which chamber is this?) and
  // window._pdxBrowseStateOf (which state?) in compare-hub.js — and those two are
  // tolerant in ways the regexes above are not:
  //
  //   · An office of plain "Senator" is a U.S. Senate seat to the archive. To
  //     _pdxIsUsSenatorOffice it is nothing: /\bsenate\b/ does not match
  //     "Senator", and neither does the "u.s. senat" clause.
  //   · "Governor of Utah" is the Governor to the archive. To
  //     _pdxIsGovernorOffice, which compares the whole string, it is not.
  //   · A `state` field rewritten to "UT" reduces to "ut" here and matches no
  //     state name, while _pdxBrowseStateOf reads window._originalStates first —
  //     the state the BUNDLE shipped — and still says Utah.
  //
  // That is the Layton failure this pass closes, and it is worth being precise
  // about what kind of failure it is. The page printed, in the same scroll: an
  // archive band listing John Curtis and Mike Lee, in office, under "U.S. Senate
  // · Utah", and three seat rows reading "No record on file yet — we'd rather
  // leave this blank than name the wrong person". One document, one roster, two
  // classifiers, two answers. The blank sentence is an admission about OUR
  // coverage; printing it beside the archive's own listing of the same people is
  // the app calling its own true answer a mistake.
  //
  // So the seat walk gets a second pass that asks the archive's own question, and
  // it only ever FILLS A SEAT THE FIRST WALK LEFT EMPTY. The office-string
  // matchers stay exactly as they are and stay authoritative — nothing below can
  // displace a pid they resolved, reorder them, or overrule their refusals for
  // any other state.
  //
  // Two narrowings, because the archive's buckets are wider than a ballot seat:
  //
  //   · IN OFFICE ONLY. The archive files a challenger under the seat they are
  //     running for ("Candidate for U.S. Senate" is `senator`), which is right
  //     for a roster listing and wrong for a seat. _pdxOfficeStatus is the app's
  //     one owner of incumbent-vs-candidate, so it is the gate here.
  //   · THE GOVERNOR BUCKET IS NOT THE GOVERNOR. Door 1 files Lt. Governor,
  //     Attorney General, Treasurer and Auditor with the Governor under one
  //     statewide-executive bucket. Only an office that actually reads as the
  //     governorship may fill the Governor row.
  function _pdxArchiveReady() {
    try {
      return typeof window._pdxBrowseType === 'function' &&
             typeof window._pdxBrowseStateOf === 'function' &&
             !!_pdxRosterSize();
    } catch (e) { return false; }
  }

  function _pdxArchiveInOffice(rec) {
    if (typeof window._pdxOfficeStatus !== 'function') return true;
    try { return window._pdxOfficeStatus(rec) === 'office'; } catch (e) { return true; }
  }

  // "Governor" and not one of the four offices filed beside it. A lieutenant
  // governor is a different seat and must never fill this row.
  function _pdxIsGovernorProper(office) {
    var o = String(office == null ? '' : office).toLowerCase();
    if (!/\bgovernor\b/.test(o)) return false;
    if (/\blieutenant\b|\blt\.?\s*governor\b|\bdeputy\b|\bacting\b/.test(o)) return false;
    return true;
  }

  // The archive's answer for one state: who it lists, in office, under "U.S.
  // Senate · <state>" and as that state's governor. Reads nothing but the roster
  // and the two shared classifiers, so by construction it cannot name somebody
  // the archive band on the same page does not list.
  function _pdxArchiveStatewideWalk(st) {
    var res = { senators: [], governor: null };
    if (!_pdxArchiveReady()) return res;
    try {
      var roster = _pdxRosterTable();
      if (!roster) return res;
      for (var pid in roster) {
        if (!Object.prototype.hasOwnProperty.call(roster, pid)) continue;
        var rec = roster[pid];
        if (!rec) continue;
        var pstate = '';
        try { pstate = String(window._pdxBrowseStateOf(pid) || ''); } catch (e) { pstate = ''; }
        if (pstate.trim().toLowerCase() !== st) continue;
        var chamber = '';
        try { chamber = String(window._pdxBrowseType(pid) || ''); } catch (e) { chamber = ''; }
        if (chamber !== 'senator' && chamber !== 'governor') continue;
        if (!_pdxArchiveInOffice(rec)) continue;
        if (chamber === 'senator') { res.senators.push(pid); continue; }
        if (_pdxIsGovernorProper(rec.office) && !res.governor) res.governor = pid;
      }
    } catch (e) {}
    // Three senate seats is the archive disagreeing with the Constitution, not a
    // seat to guess at — the same refusal the office-string walk makes.
    if (res.senators.length > 2) res.senators = [];
    return res;
  }

  // ── THE CANONICAL UTAH STATEWIDE OCCUPANTS ─────────────────────────────────
  // The floor under both walks, for the one state PolitiDex curates end to end.
  // These are pids that already exist in the bundled roster with full files at
  // /p/lee, /p/curtis and /p/cox — NOT a second identity for anybody, and not a
  // name typed into this file: if the roster stops holding the pid, the pin is
  // not applied, and any walk that resolves a DIFFERENT pid for a seat wins
  // outright, so a real change of officeholder is never overridden by it.
  //
  // It exists because the two walks above both depend on metadata a live payload
  // can rewrite, and Utah is the state whose statewide seats the archive, the
  // ballot, the district rooms and the state voting record all already name. A
  // blank row here is never a coverage limit — it is only ever a classifier that
  // lost its grip on a string.
  var _PDX_UTAH_STATEWIDE = { senators: ['curtis', 'lee'], governor: 'cox' };

  // A pinned pid still has to be somebody the roster holds and does not describe
  // as gone. "Former" or "candidate" in their own office string is the record
  // itself saying they no longer hold the seat, and that is honoured.
  function _pdxPinnable(pid) {
    if (!pid || !_pdxRosterKeeps(pid)) return false;
    try {
      var rec = _pdxRosterRec(pid);
      if (!rec) return true;
      var o = String(rec.office || '');
      if (!o) return true;
      if (/\bformer\b|\bex-/i.test(o)) return false;
      if (typeof window._pdxOfficeStatus === 'function' &&
          window._pdxOfficeStatus(rec) !== 'office') return false;
    } catch (e) {}
    return true;
  }

  window._pdxStatewideSeats = function (stateName) {
    var st = _pdxStateName(stateName);
    if (!st || st === 'national') return { senators: [], governor: null, ambiguous: false };
    var rn = _pdxRosterSize();
    // The memo is keyed on the roster size AND on whether the archive's
    // classifiers were loaded when the answer was computed. compare-hub.js is
    // deferred like cmp-data.js, so a read taken before it executes cannot run
    // the agreement walk below — and remembering that answer after it lands
    // would be the same mistake as caching a pre-roster blank.
    var ar = _pdxArchiveReady() ? 1 : 0;
    var hit = _pdxStatewideCache[st];
    if (hit && hit.n === rn && hit.a === ar) return hit.val;

    var out = { senators: [], governor: null, ambiguous: false };
    try {
      var roster = rn ? _pdxRosterTable() : null;
      if (roster) {
        var sens = [], govs = [];
        for (var pid in roster) {
          if (!Object.prototype.hasOwnProperty.call(roster, pid)) continue;
          var p = roster[pid];
          if (!p || _pdxStateName(p.state) !== st) continue;
          if (_pdxIsUsSenatorOffice(p.office)) sens.push(pid);
          else if (_pdxIsGovernorOffice(p.office)) govs.push(pid);
        }
        // A state has exactly two Senate seats and one Governor. More than that on
        // file means the roster disagrees with itself about who holds them, and
        // there is no honest way to choose — so nothing is claimed.
        if (sens.length > 2) out.ambiguous = true; else out.senators = sens;
        if (govs.length > 1) out.ambiguous = true; else out.governor = govs[0] || null;
      }
    } catch (e) {}

    // ── AGREE WITH THE ARCHIVE BEFORE ADMITTING A GAP ───────────────────────
    // Utah only, and deliberately so. This is the state whose seats every other
    // surface already names — the archive band, the district rooms, the state
    // voting record — and the state the reported blank appeared in. The other
    // forty-nine keep exactly the coverage the office-string matchers measure,
    // which is what the shipped-roster assertions in test-who-represents-me.mjs
    // hold at 50 governors and both Senate seats nearly everywhere. Nothing here
    // touches a DISTRICT seat in any state: outside Utah the U.S. House and both
    // state chambers still resolve to nothing and say they need a district map.
    // Only ever reached when a seat is actually missing: on the ordinary path the
    // office strings match, all three seats are filled, and a second walk of an
    // 1100-record roster would buy nothing.
    if (st === 'utah' && (out.ambiguous || out.senators.length < 2 || !out.governor)) {
      var arch = _pdxArchiveStatewideWalk(st);
      // An ambiguity the archive does not share is not an ambiguity worth
      // printing three blanks over: if Door 1 lists one or two Utah senators in
      // office, those are the seats, and the same page cannot be both listing
      // them and refusing to name them.
      if (out.ambiguous && (arch.senators.length || arch.governor)) out.ambiguous = false;
      arch.senators.forEach(function (pid) {
        if (out.senators.length >= 2) return;
        if (out.senators.indexOf(pid) !== -1) return;
        out.senators.push(pid);
      });
      if (!out.governor && arch.governor) out.governor = arch.governor;
    }

    // ── CARRY A NAMED SEAT FORWARD OVER AN EMPTY WALK ───────────────────────
    // Applied seat by seat, so one flattened record cannot take the other two
    // seats down with it, and only over people the roster still holds. An
    // ambiguity is deliberately NOT carried: three senators on file for one state
    // is the roster contradicting itself, which is a refusal we mean rather than
    // a payload we are waiting on.
    var best = _pdxStatewideBest[st];
    if (best && !out.ambiguous) {
      if (best.senators.length) {
        // Slot by slot rather than all-or-nothing: a payload that flattens ONE
        // senator's office string must not cost the reader that senator, and a
        // state has two seats, so the remembered holder the walk did not find is
        // added beside the one it did. Capped at two — the seat count is a fact
        // about the Senate, not something a ledger gets to grow.
        best.senators.forEach(function (pid) {
          if (out.senators.length >= 2) return;
          if (out.senators.indexOf(pid) !== -1) return;
          if (_pdxRosterKeeps(pid)) out.senators.push(pid);
        });
      }
      if (!out.governor && best.governor && _pdxRosterKeeps(best.governor)) {
        out.governor = best.governor;
      }
      // And the two Senate rows keep the order the reader has already read them
      // in. Which senator is "ussenate1" is not a ranking of any kind (see the
      // level builder), but two rows silently swapping names on a repaint reads
      // as the page changing its mind, so a remembered pair holds its order and
      // anything new is appended.
      if (best.senators.length && out.senators.length > 1) {
        var ordered = [];
        best.senators.forEach(function (pid) {
          if (out.senators.indexOf(pid) !== -1) ordered.push(pid);
        });
        out.senators.forEach(function (pid) {
          if (ordered.indexOf(pid) === -1) ordered.push(pid);
        });
        out.senators = ordered;
      }
    }

    // ── THE UTAH FLOOR ──────────────────────────────────────────────────────
    // Last, after every walk and after the ledger, so it can only ever fill a
    // seat that is STILL empty — and only with a pid the roster holds and does
    // not describe as former or as a candidate. A cold page load whose payload
    // rewrote the office strings before anything was ever painted has no ledger
    // to carry and no classifier that matches; this is the difference between
    // that reader seeing their senators and reading a coverage admission over
    // three people the archive lists on the same screen.
    if (st === 'utah' && _pdxRosterSize()) {
      _PDX_UTAH_STATEWIDE.senators.forEach(function (pid) {
        if (out.senators.length >= 2) return;
        if (out.senators.indexOf(pid) !== -1) return;
        if (_pdxPinnable(pid)) out.senators.push(pid);
      });
      if (!out.governor && _pdxPinnable(_PDX_UTAH_STATEWIDE.governor)) {
        out.governor = _PDX_UTAH_STATEWIDE.governor;
      }
      if (out.senators.length || out.governor) out.ambiguous = false;
    }

    // The ledger records answers, never emptiness — an entry is only written
    // where this walk (or the carry-forward above) actually named somebody, and
    // an all-blank result leaves the previous entry standing. A remembered pid
    // the roster no longer holds is pruned on the way through, so the ledger
    // cannot accumulate people the app has stopped knowing.
    if (out.senators.length || out.governor) {
      var prev = _pdxStatewideBest[st] || { senators: [], governor: null };
      _pdxStatewideBest[st] = {
        senators: out.senators.length ? out.senators.slice() : prev.senators.filter(_pdxRosterKeeps),
        governor: out.governor || (_pdxRosterKeeps(prev.governor) ? prev.governor : null)
      };
    }

    // Only ever cache an answer the roster was actually present to give.
    if (rn) _pdxStatewideCache[st] = { n: rn, a: ar, val: out };
    return out;
  };

  // ── window.pdxRosterReady(cb) — "THE ROSTER IS HERE", ANNOUNCED ONCE ────────
  // The memo above already refuses to cache an empty roster, so a statewide read
  // taken before cmp-data.js executes is never remembered as the answer. But a
  // SURFACE that painted from that read does remember it, and nothing ever told it
  // to ask again — which is the second half of the Layton blank. On a phone,
  // who-represents-me.js painted "3 of 6 seats resolved" with both U.S. Senate
  // rows and the Governor row reading "No record on file yet" over Mike Lee, John
  // Curtis and Spencer Cox, and its only other triggers were three fixed timeouts
  // and a location change. Finish the roster after the last of those and "3 of 6"
  // is what the reader keeps for the rest of the visit.
  //
  // WHY THE ANNOUNCEMENT LIVES HERE. voter-hub-location.js is a SYNC script and
  // cmp-data.js is DEFERRED, so this module is guaranteed to be running before its
  // own most important input exists. The module that owns the resolution therefore
  // owns the announcement of its input arriving, and every surface that projects
  // these levels subscribes instead of growing a poll of its own — three polls
  // would be three different moments to repaint one answer.
  //
  // WHAT IT PROMISES. The callback runs exactly once, when the roster this
  // document carries first has rows in it — the bundle or the live Firestore
  // index, whichever this shell has (see _pdxRosterTable); a callback registered
  // after that runs immediately, so a subscriber that loaded late is never
  // waiting for an event that has already happened. The statewide memo is dropped at that moment too — belt and braces
  // beside the size key it is already stamped with — so the repaint cannot be
  // served the pre-roster answer it is repainting to replace.
  //
  // WHAT IT DOES NOT DO. It never fetches the roster and never asks anybody to:
  // cmp-data.js is already on its way as a deferred script on every page. This is
  // a watcher on an arrival, not a second loader for it, and every timer it arms
  // is dropped the moment the roster is seen.
  var _pdxRosterCbs = [];
  var _pdxRosterFired = false;
  var _pdxRosterWatching = false;
  function _pdxRosterFlush() {
    if (_pdxRosterFired) return true;
    if (!_pdxRosterSize()) return false;
    _pdxRosterFired = true;
    // The MEMO is dropped, and only the memo. `_pdxStatewideBest` and the seat
    // ledger below it survive every roster arrival on purpose: an arrival is new
    // information about who holds a seat, never an instruction to forget an
    // officeholder this page has already named. Wiping them here would hand the
    // next walk a clean slate and let a payload without `office`/`state` repaint
    // Curtis, Lee and Cox as blanks — which is the whole failure this guards.
    _pdxStatewideCache = {};
    var cbs = _pdxRosterCbs;
    _pdxRosterCbs = [];
    cbs.forEach(function (cb) { try { cb(); } catch (e) {} });
    return true;
  }
  // Backing off rather than polling on an interval: the roster is one deferred
  // script, so the answer almost always arrives in the first two checks, and the
  // tail is there for a cold cache on a slow connection. The last check is past
  // every other deadline this page waits on, and nothing reschedules after it —
  // an absent roster is a page with no names to print, which is a different
  // problem than a stale paint.
  // The tail past twelve seconds is for the shells whose roster is the LIVE one:
  // /me has no bundled roster to read and waits on a Firestore round trip, an
  // auth handshake and a document merge before its first record exists, and on a
  // cold mobile connection that is slower than any deferred script. A subscriber
  // that is told "still loading" and never told otherwise is its own wrong
  // answer, so the ladder outlives the load rather than the load outliving it.
  var _PDX_ROSTER_WAIT = [0, 120, 350, 800, 1600, 3200, 6400, 12000, 20000, 30000];
  function _pdxRosterWatch() {
    if (_pdxRosterWatching || _pdxRosterFired) return;
    _pdxRosterWatching = true;
    _PDX_ROSTER_WAIT.forEach(function (ms) {
      try { setTimeout(_pdxRosterFlush, ms); } catch (e) {}
    });
    // And the arrival the loader does announce: the detail split merges into the
    // same roster global, so a page whose light index was empty at first paint can
    // be answered by the bundle instead of by a timer.
    try {
      if (document.addEventListener) document.addEventListener('pdx:data:cmpDetail', _pdxRosterFlush);
    } catch (e) {}
  }
  window.pdxRosterReady = function (cb) {
    if (typeof cb !== 'function') return;
    if (_pdxRosterFired) { try { cb(); } catch (e) {} return; }
    _pdxRosterCbs.push(cb);
    if (!_pdxRosterFlush()) _pdxRosterWatch();
  };

  // ── _pdxStickLevels() — A SEAT THAT HAS BEEN NAMED IS NEVER UN-NAMED ────────
  // The statewide ledger above protects the two seats that resolve from roster
  // metadata. This protects the SEAT LIST, which is what every surface actually
  // paints, and it protects all six the same way — because the rule a reader
  // needs is not "statewide seats are sticky", it is "the app does not delete a
  // representative it has already shown you".
  //
  // WHAT THE READER SAW, one more time, because it is the specification. Layton /
  // Davis County, live phone: six of six, Curtis and Lee named with photos and
  // "See their record". Then the "Loading the latest roster…" pill fired, a
  // second payload merged, and the same rows became "No record on file yet — we'd
  // rather leave this blank than name the wrong person" with the count at three
  // of six. That sentence is an admission about OUR coverage. Printing it over
  // somebody the same page named ninety seconds earlier is not a cautious blank;
  // it is the app calling its own true answer a mistake.
  //
  // THE RULE, per seat slot:
  //   · a fresh pid            → it wins, outright, and is what gets remembered.
  //     Including a DIFFERENT pid from the one on file: an answer replacing an
  //     answer is the system working, and nothing here competes with it.
  //   · no fresh pid, remembered pid still on the roster → RESTORE it, flagged
  //     `sticky`. A record whose `office`/`state` a partial payload flattened is
  //     mid-load, and mid-load is not a coverage claim.
  //   · no fresh pid, remembered pid gone from the roster → let the blank stand
  //     and forget them. This is the explicit empty, and it is honoured.
  //
  // AND IT IS SCOPED TO ONE READER IN ONE PLACE. The ledger is keyed on the
  // location signature, so changing location wipes it: a reader who looks up
  // Layton and then Columbus must NOT keep Utah's senators, and the moment their
  // address changes there is no memory left to restore from. It is memory, not
  // storage — nothing is persisted, so a reload re-resolves from scratch.
  //
  // A DISTRICT SEAT CARRIES ITS DISTRICT OR IT IS NOT RESTORED. This file's
  // standing rule is that the name and the district number move together: pairing
  // a remembered member with a district the resolver has since changed (a redrawn
  // U.S. House seat) would produce exactly the internally-false row documented
  // under _pdxHouseRedistrict(). So a district level is only refilled where the
  // fresh district is absent or unchanged, and the remembered district label
  // comes back with the pid.
  // ── AND THE SCOPE OF THE WIPE IS THE SCOPE OF THE SEAT ────────────────────
  // Two ledgers, because there are two kinds of seat and they are keyed on
  // different facts about the reader.
  //
  // A DISTRICT seat (U.S. House, State Senate, State House) is a function of the
  // full location — city, county and district line — so moving invalidates it
  // outright. A reader who looks up Layton and then Columbus must not keep
  // Layton's representative, which is what the full signature enforces.
  //
  // A STATEWIDE seat (both U.S. Senate seats, Governor) is a function of the
  // STATE and of nothing else. This file says so twice already: _pdxStatewideSeats
  // takes a state name and no other argument, and its own doctrine is that state
  // in gives officeholders out for all fifty states. Keying its memory on
  // city|county|district was therefore keying it on facts the answer does not
  // depend on — and a Detect is precisely a write to those facts.
  //
  // WHAT THE READER SAW. Utah, no precise address: Curtis, Lee and Cox named on
  // all three statewide rows. Then "Detect my location" resolved Layton / Davis
  // County / District 2 — the same state, a better address — and the location
  // signature changed, so the whole ledger was dropped. The district rows SHOULD
  // re-resolve there; that is the point of detecting. But the statewide rows went
  // with them, and the next walk landed mid-roster, so three people with full
  // files at /p/curtis, /p/lee and /p/cox repainted as "No record on file yet —
  // we'd rather leave this blank than name the wrong person". A voter who gave the
  // app MORE information about themselves was told it now knew LESS about who
  // their senators are. Detect may refine a seat. It may never clear one.
  var _pdxSeatLedger = {};
  var _pdxSeatLedgerSig = null;
  var _pdxSwSeatLedger = {};
  var _pdxSwSeatLedgerSig = null;

  function _pdxLocSig(loc, state) {
    var l = loc || {};
    return [String(state || ''), String(l.city || ''), String(l.county || ''),
            String(l.district || '')].join('|').toLowerCase();
  }

  // The statewide half of the same reader's identity: the state, and nothing that
  // a more precise address inside it can change.
  function _pdxStateSig(state) {
    return String(state || '').trim().toLowerCase();
  }

  function _pdxStickLevels(levels, loc, state) {
    var sig = _pdxLocSig(loc, state);
    if (sig !== _pdxSeatLedgerSig) { _pdxSeatLedgerSig = sig; _pdxSeatLedger = {}; }
    var swSig = _pdxStateSig(state);
    if (swSig !== _pdxSwSeatLedgerSig) { _pdxSwSeatLedgerSig = swSig; _pdxSwSeatLedger = {}; }

    var bookFor = function (lv) { return lv.statewide ? _pdxSwSeatLedger : _pdxSeatLedger; };

    // NOBODY IS NAMED TWICE. A restore fills a slot the current walk left empty,
    // and a person already standing in another slot of this ballot is not
    // available to fill it — otherwise a payload that flattened one of two
    // senators would print the surviving one on both Senate rows.
    var taken = {};
    levels.forEach(function (lv) { if (lv && lv.pid) taken[lv.pid] = true; });

    return levels.map(function (lv) {
      if (!lv || !lv.key) return lv;
      var book = bookFor(lv);
      var mem = book[lv.key];

      if (lv.pid) {
        book[lv.key] = { pid: lv.pid, district: lv.district, distLabel: lv.distLabel };
        return lv;
      }
      if (!mem || !mem.pid) return lv;
      if (taken[mem.pid]) return lv;
      if (!_pdxRosterKeeps(mem.pid)) { delete book[lv.key]; return lv; }
      // A statewide seat has no district to disagree about. A district seat that
      // has since resolved a DIFFERENT district is a different seat, and the
      // remembered member does not belong to it.
      if (!lv.statewide && lv.district != null && String(lv.district) !== String(mem.district)) return lv;

      var out = {};
      for (var k in lv) if (Object.prototype.hasOwnProperty.call(lv, k)) out[k] = lv[k];
      out.pid = mem.pid;
      out.resolved = true;
      out.sticky = true;
      if (!lv.statewide && lv.district == null && mem.district != null) {
        out.district = mem.district;
        out.distLabel = mem.distLabel;
      }
      taken[mem.pid] = true;
      return out;
    });
  }

  // One owner for "forget this reader's seats". Nothing on the roster path calls
  // it and nothing should: a roster arriving is new information about who holds a
  // seat, never an instruction to drop an officeholder already on screen. It
  // exists so a future caller with a real reason to reset (and the diagnostics
  // that check this rule) has a single door instead of reaching into the ledger.
  window._pdxForgetSeatHolders = function () {
    _pdxSeatLedger = {};
    _pdxSeatLedgerSig = null;
    _pdxSwSeatLedger = {};
    _pdxSwSeatLedgerSig = null;
  };

  // The sticky-seat ledger above is a self-contained block, and it is read as one:
  // test-ballot-shell evaluates it standalone to prove a U.S. Senate seat is keyed
  // on the state alone. The persisted district memory below is a different concern
  // — it touches window and localStorage — so it sits after that block rather than
  // inside it.

  // ── _pdxResolvedRead / _pdxResolvedWrite() — THE DISTRICTS, WRITTEN DOWN ───
  // WHAT THE READER SAW, and it is the specification for this pair. One browser,
  // one saved location (Layton / Davis County). On / the Who Represents Me card
  // printed all three district seats and all three names:
  //
  //     U.S. House District 2   · Celeste Maloy
  //     State Senate District 6 · Jerry Stevenson
  //     State House District 15 · Ariel Defay
  //
  // On /me, the same reader, the same second: "District 2" on the account block,
  // then "needs a district map" on State Senate and State House, and no name on
  // either seat. Two documents, one location, two different answers about which
  // districts a person votes in — and the thinner one was printed as a statement
  // about our COVERAGE, which it was not.
  //
  // WHY IT DIFFERED. pdxRepsForMe() resolves the three district seats out of the
  // curated tables in ballot-breakdown.js, through keyRacesRelevantData() and
  // _pdxVoterBallot(). That file is 407 KB of race rosters and /me does not carry
  // it — deliberately, and it is still not going to. So on /me `vb` was null,
  // `matched` was false, and the walk had nothing to answer the district branch
  // with. The U.S. House row survived only because it had a second source: the
  // reader's own saved `loc.district`. The other two had none, and printed the
  // no-map sentence for a map this app had already drawn for them.
  //
  // SO THE ANSWER IS SAVED WHERE THE QUESTION IS ALREADY ANSWERED. A walk that
  // HAD the curated tables writes what it resolved into the reader's own location
  // record — the same politidex_voter_location key, no second store, no second
  // schema — and a walk that has NOT got them reads it back as its fallback. The
  // resolver stays the one source of "which districts am I in": /me reads
  // pdxRepsForMe() exactly as before and gets the same three numbers and the same
  // three pids, because they came from the walk that could see them.
  //
  // FOUR RULES, EACH ONE A DEFECT THIS FILE ALREADY DOCUMENTS ELSEWHERE:
  //
  //   · IT IS KEYED ON THE PLACE. The record carries _pdxLocSig(), and a read
  //     whose signature does not match the reader's current location returns
  //     nothing. A reader who looks up Layton and then Columbus does not keep
  //     Davis County's seats — the same scope the in-memory ledger above has, for
  //     the same reason, except that this one survives a reload.
  //   · THE NAME AND THE NUMBER MOVE TOGETHER. Each chamber remembers a district
  //     and a pid as ONE entry, and a remembered pid is only used where the
  //     district it was remembered with is the district the walk resolved. This
  //     is _pdxHouseRedistrict()'s rule and _pdxStickLevels()'s rule, applied to
  //     the persisted copy so a redrawn seat cannot pair yesterday's member with
  //     today's line.
  //   · IT ONLY EVER FILLS A BLANK. Every read below is a FALLBACK: a walk that
  //     resolves a seat itself ignores the record entirely and then overwrites
  //     it. Nothing here can contradict live curated data, which is what makes it
  //     safe to keep.
  //   · IT NAMES NOBODY THE ROSTER HAS DROPPED. A remembered pid goes through
  //     _pdxRosterKeeps(), which passes everything while the roster is still
  //     loading (a wait is not an absence — pdxSeatHolders() carries rosterCold
  //     for exactly that beat) and rejects a pid a loaded roster no longer holds.
  //
  // WHAT IT MAY NOT HOLD. No statewide seat — those resolve from a state name in
  // all fifty states, on every document, so remembering them would be caching an
  // answer that is never unavailable. No county, no city, no area label, no local
  // roster, no score, no party: three chambers, one district and one pid each.
  var _PDX_RESOLVED_KEYS = { house: 1, statesenate: 1, statehouse: 1 };
  var _pdxResolvedLastWrite = null;

  function _pdxDigits(v) { return String(v == null ? '' : v).replace(/[^0-9]/g, ''); }

  function _pdxResolvedRead(loc, state) {
    var r = loc && loc.resolved;
    if (!r || typeof r !== 'object') return null;
    if (String(r.sig || '') !== _pdxLocSig(loc, state)) return null;
    return r;
  }

  // The remembered district for one chamber, or the caller's own fallback. The
  // reader's saved `loc.district` is the fallback the U.S. House row passes in,
  // and the remembered number wins over it: both are about the same seat, and the
  // remembered one came from the curated map rather than from a form.
  function _pdxResolvedDist(mem, key, fallback) {
    var d = (mem && mem[key]) ? _pdxDigits(mem[key].d) : '';
    if (d) return d;
    return (fallback != null ? fallback : null);
  }

  // The remembered holder for one chamber, paired with the district it was
  // remembered against. A district the walk has since resolved differently gets
  // no name from here.
  function _pdxResolvedPid(mem, key, district) {
    var e = (mem && mem[key]) ? mem[key] : null;
    if (!e || !e.pid) return null;
    var d = _pdxDigits(district);
    if (d && _pdxDigits(e.d) !== d) return null;
    return _pdxRosterKeeps(e.pid) ? e.pid : null;
  }

  var _pdxLastWalk = null;

  // ── pdxRememberResolved() — THE ONE WRITE PATH FOR THE RESOLVED SEATS ──────
  // Called from the location-sync signal (_vhSyncBanner), which is the moment a
  // location is established, restored or changed — and on the home page that
  // signal runs on DOMContentLoaded, after the curated ballot tables have
  // executed. It resolves once, then writes down what that walk could see.
  //
  // WHY THIS IS NOT IN pdxRepsForMe(). Every surface in the app asks the
  // resolver, most of them while painting. A store write hanging off that call
  // makes "what does this row say" and "what is saved about this reader" the
  // same question, which is how a paint ends up owning a record.
  window.pdxRememberResolved = function () {
    try {
      var reps = window.pdxRepsForMe();
      if (!reps) return false;
      var w = _pdxLastWalk;
      if (!w) return false;
      _pdxResolvedWrite(w.loc, w.state, w.levels);
      return true;
    } catch (e) { return false; }
  };

  function _pdxResolvedWrite(loc, state, levels) {
    try {
      if (!window._hasUserLocation || !loc || !levels) return;
      var prev = _pdxResolvedRead(loc, state);
      var rec = { sig: _pdxLocSig(loc, state) };
      levels.forEach(function (lv) {
        if (!lv || !lv.key || lv.statewide || !_PDX_RESOLVED_KEYS[lv.key]) return;
        var was = (prev && prev[lv.key]) ? prev[lv.key] : null;
        var d = _pdxDigits(lv.district);
        var pid = lv.pid || '';
        // A seat this walk resolved nothing for keeps what was already written:
        // the walk that wrote it could see more than this one can.
        if (!d && !pid) { if (was) rec[lv.key] = was; return; }
        if (!pid && was && was.pid && _pdxDigits(was.d) === d) pid = was.pid;
        if (!d && was && was.d) d = _pdxDigits(was.d);
        rec[lv.key] = { d: d, pid: pid };
      });
      var json = JSON.stringify(rec);
      // The resolver is called on every paint of every location surface. This is
      // the guard that keeps a write to localStorage down to the beats where the
      // answer actually changed.
      if (json === _pdxResolvedLastWrite) return;
      _pdxResolvedLastWrite = json;
      loc.resolved = rec;
      try { localStorage.setItem(PDX_LOC_KEY, JSON.stringify(loc)); } catch (e2) {}
    } catch (e) {}
  }

  // ── window.pdxRepsForMe() — the ONE resolution of "who represents me" ───────
  // Two surfaces now answer this question: the Voter Hub's "Who Represents You
  // Now" strip (below) and the homepage front door (who-represents-me.js), which
  // is the first thing a cold visitor meets. They read this helper rather than
  // each resolving districts themselves, so the two can never disagree about a
  // district number or an officeholder — the same rule the strip already followed
  // against the team builder, now enforced one level up.
  //
  // It resolves from the SAME authoritative ballot data every other surface uses
  // (_pdxVoterBallot → keyRacesRelevantData) and applies the same redistricting
  // correction: in a redrawn area it names the member who represents the voter
  // RIGHT NOW, paired with that member's CURRENT-map district, so a row is always
  // internally consistent.
  //
  // TWO CLASSES OF SEAT, RESOLVED FROM DIFFERENT THINGS
  // ────────────────────────────────────────────────────
  // The list is no longer three district seats. It is two kinds of seat:
  //
  //   STATEWIDE (U.S. Senate ×2, Governor) — elected by the whole state, so they
  //   resolve from the visitor's STATE alone via _pdxStatewideSeats() above, for
  //   all fifty states. No district, no curated area, no map pin.
  //
  //   DISTRICT (U.S. House, State Senate, State House) — need district geometry,
  //   and PolitiDex curates districts for Utah only. Outside Utah they resolve to
  //   nothing and say so.
  //
  // WHY THE DISTRICT SEATS ARE GATED ON UTAH
  // ─────────────────────────────────────────
  // _pdxVoterBallot() and _pdxHouseRedistrict() are built for the curated Utah
  // ballot, and when they cannot place a voter they do not fail — they fall back
  // to a default curated area (Davis County). Reading them unconditionally is how
  // a Columbus voter was shown "U.S. House · District 2 → Celeste Maloy", "State
  // Senate · District 6 → Jerry Stevenson" and "State House · District 15 → Ariel
  // Defay" under the heading "Your representatives · Columbus", with the count
  // reading "3 of 3 seats resolved". Three Utah politicians, three Utah district
  // numbers, and a completeness claim on top.
  //
  // It is not only the silent fallback. _krInferLocation() matches on county name,
  // and county names are not unique across states: Washington County, Oregon
  // resolves to St. George, Utah and Grand County, Colorado resolves to Moab,
  // Utah — and those come back MATCHED, so they were treated as a genuine hit
  // rather than a default. Checking `matched` was never enough. The state itself
  // has to be the gate, which is why every read of the curated ballot below goes
  // through `vb`, which is null unless the visitor is in Utah.
  //
  // The visitor's own typed/pinned `loc.district` is not used outside Utah either.
  // It is their own datum rather than an inference, but it survives a change of
  // state in saved location (it is written from a curated Utah area when one is
  // adopted), there is no non-Utah district→officeholder map to pair it with, and
  // a bare number beside an unresolved name buys the reader nothing. Blank beats
  // possibly-stale.
  //
  // It states only what it actually resolved. A level with no officeholder on file
  // comes back `resolved:false` and stays in the list rather than being dropped or
  // guessed at, so a caller can say "we don't have this one yet" instead of
  // implying the list is complete. Local offices (mayor, council, school board,
  // county) are deliberately NOT in this list — PolitiDex resolves them through the
  // Relevant-to-Me ballot, and callers link out to it rather than claim coverage
  // here. `districtsResolvable` tells a caller whether that link can honestly be
  // offered at all, since the local roster is curated for the same Utah areas.
  window.pdxRepsForMe = function () {
    var loc = window._currentVoterLocation || {};
    var state = (loc.state || '');
    var located = !!window._hasUserLocation;
    var national = state === 'National';
    var utah = String(state).trim().toLowerCase() === 'utah';

    var krd = (typeof window.keyRacesRelevantData === 'function') ? window.keyRacesRelevantData() : null;
    var matched = !!(krd && krd.matched && utah);
    // The curated ballot is Utah-only data. Outside Utah it is not a weaker
    // answer, it is somebody else's answer, so it is not read at all.
    //
    // AND INSIDE UTAH IT IS READ ONLY FOR A READER IT IS ACTUALLY ABOUT. This
    // used to be gated on `utah` alone, and _pdxVoterBallot() never fails: its
    // area comes from _krCurrentLocationId(), which ends `_krInferLocation() ||
    // 'davis'`. So a reader whose saved location was the state and nothing else —
    // picked "Utah" in the form, no county, no city — was handed DAVIS COUNTY's
    // ballot as their own: U.S. House District 2 with Celeste Maloy, State Senate
    // District 6 with Jerry Stevenson, State House District 15 with Ariel Defay,
    // printed as the seats they vote in and counted as six of six resolved. Three
    // real people, correctly labelled, none of them theirs — the same defect this
    // file documents for an out-of-state visitor, one state further in.
    //
    // `matched` is the gate because it is the fact in question: the area was
    // either chosen by this reader or inferred from a county or city they saved.
    // Where it is only the compiled fallback there is no curated ballot to read,
    // the district rows go blank, and the CTA asks for the county that would fill
    // them. A blank is a question. Davis was an answer to a question nobody asked.
    var vb  = (utah && matched && typeof window._pdxVoterBallot === 'function') ? window._pdxVoterBallot() : null;

    var dist = function (seatKey, vbKey, fallback) {
      if (vb && vb.districts && vb.districts[vbKey] != null) return vb.districts[vbKey];
      if (matched && krd.byRace && krd.byRace[seatKey]) return krd.byRace[seatKey].district;
      return (fallback != null ? fallback : null);
    };
    var inc = function (seatKey, vbOffice) {
      var pid = null;
      if (vb && vb.byOffice && vbOffice && vb.byOffice[vbOffice]) pid = vb.byOffice[vbOffice].incumbentPid;
      if (!pid && matched && krd.byRace && krd.byRace[seatKey]) {
        var br = krd.byRace[seatKey];
        pid = br.incumbentPid || ((br.incumbentPids || [])[0]);
      }
      return pid || null;
    };

    // WHAT THIS PLACE ALREADY RESOLVED, on whichever document had the curated
    // tables. Read as a FALLBACK only, and only for this exact location — see the
    // block over _pdxResolvedRead(). It is what lets /me print the three district
    // numbers and the three names the homepage card prints, without /me carrying
    // the 407 KB of race rosters that resolved them.
    var mem = _pdxResolvedRead(loc, state);

    // AND WHAT THE MAP PINNED, which is the reader's own datum and the last
    // fallback under the memo. The U.S. House row has always had this — that is
    // what `loc.district` is doing on the end of the `hd` line — and the two
    // legislative rows never did, because until the finder moved they never
    // needed it: a pick on the front page's map ran the curated tables in the
    // same document on the way out, so the memo was written before anything read
    // it. /find does not carry those tables (407 KB for a picker), so a reader
    // who pins Weber SD-3 and HD-8 there arrives on /voice with a location that
    // knows both numbers and a memo that knows neither, and both rows would come
    // back blank on a save that resolved them exactly.
    //
    // These are the same two fields applyToLocation() writes and the same two the
    // map has written since it shipped — loc.stateSenateDistrict and
    // loc.stateHouseDistrict. No new key, no migration, and no precedence change:
    // the curated ballot still wins, then the memo, and this is only consulted
    // when both came back with nothing.
    var hd = utah ? dist('house', 'house', _pdxResolvedDist(mem, 'house', loc.district)) : null;
    var sd = utah ? dist('statesenate', 'senate', _pdxResolvedDist(mem, 'statesenate', loc.stateSenateDistrict || null)) : null;
    var ld = utah ? dist('statehouse', 'lower', _pdxResolvedDist(mem, 'statehouse', loc.stateHouseDistrict || null)) : null;
    var hp = utah ? (inc('house', 'representative') || _pdxResolvedPid(mem, 'house', hd)) : null;
    var sp = utah ? (inc('statesenate', 'state_senator') || _pdxResolvedPid(mem, 'statesenate', sd)) : null;
    var lp = utah ? (inc('statehouse', 'state_rep') || _pdxResolvedPid(mem, 'statehouse', ld)) : null;
    var redrawn = false;

    try {
      // Same gate: the redistricting bridge reads the curated area too, so outside
      // Utah it would claim a redrawn seat for a map that does not cover the voter.
      var hr = (utah && matched && typeof window._pdxHouseRedistrict === 'function') ? window._pdxHouseRedistrict() : null;
      if (hr && hr.changed) {
        redrawn = true;
        // THE NAME AND THE DISTRICT NUMBER MOVE TOGETHER OR NOT AT ALL, AND THE
        // DISTRICT IS THE ONE THE REST OF THE PAGE ALREADY PRINTED.
        //
        // This branch used to swap BOTH halves to the current map: a Layton voter
        // whose Voting Districts strip read "U.S. House · UT-2 / State Senate ·
        // SD-6 / State House · HD-15" got a House seat row reading District 1,
        // filled with UT-1's member (Blake Moore), because "who represents you
        // right now" is District 1 until the 2026 map takes effect. Internally
        // consistent, and wrong on the page: one document told the same reader
        // their House district was 2 in one band and 1 in the next, and the name
        // under the second one belongs to a district they are not in. On /ballot
        // it was worse still — the bridge holds no record for the current-map
        // member on a document without the homepage roster accessor, so the swap
        // took the district and left the name blank: "District 1 · not mapped"
        // for a voter whose District 2 member we hold in full.
        //
        // So the seat row keeps the district this voter's own location resolved —
        // the detected / map-pinned / curated 2026 ballot district, the one the
        // location line prints — paired with that district's member or with an
        // honest blank. `redrawn` is still published, and unchanged, so a surface
        // that wants to say "you are in District 1 until January" can: that is
        // context a band adds beside the seat, not a different answer to which
        // seat this is.
        if (hr.ballotDistrict != null && hd == null) hd = hr.ballotDistrict;
        if (hr.ballotIncumbentPid && !hp) hp = hr.ballotIncumbentPid;
      }
    } catch (e) {}

    // Statewide seats: state in, officeholders out, for all fifty states.
    var sw = (!national && typeof window._pdxStatewideSeats === 'function')
      ? window._pdxStatewideSeats(state) : { senators: [], governor: null, ambiguous: false };
    var stateLabel = national ? '' : String(state || '').trim();

    var num = function (v) { return String(v == null ? '' : v).replace(/[^0-9]/g, ''); };
    // Every level also carries the BALLOT seat key it belongs to (the
    // TEAM_POSITIONS dialect: senate / house / governor / statesenate /
    // statehouse), because two of these levels are one ballot seat. That mapping
    // used to live only in race-sheet.js's alias table, which meant a caller
    // asking "who holds the U.S. Senate seat for this voter" had to own a second
    // copy of it — and a second copy is a second answer. It is emitted here, by
    // the function that emits the levels, and read back by pdxSeatHolders() below.
    var level = function (key, seat, label, tierLabel, color, d, pid) {
      var n = num(d);
      return {
        key: key,
        seat: seat,
        label: label,
        tierLabel: tierLabel,
        color: color,
        statewide: false,
        district: n || null,
        distLabel: n ? (label + ' · District ' + n) : label,
        pid: pid || null,
        resolved: !!pid
      };
    };
    // A statewide row carries no district and must never look like it does. Its
    // heading names the state instead, which is the honest scope of the seat and
    // also what tells the two Senate rows apart from each other.
    var swLevel = function (key, seat, label, tierLabel, color, pid) {
      return {
        key: key,
        seat: seat,
        label: label,
        tierLabel: tierLabel,
        color: color,
        statewide: true,
        district: null,
        distLabel: stateLabel ? (label + ' · ' + stateLabel) : label,
        pid: pid || null,
        resolved: !!pid
      };
    };

    // The six seats as this walk resolved them, THEN passed through the ledger
    // that refuses to un-name a seat this page has already named (see
    // _pdxStickLevels below). The ledger is applied here, in the resolver, rather
    // than in any one surface: Who Represents Me, the workspace header, the race
    // sheet's HOLDS THIS SEAT tag and pdxSeatHolders() all project these same
    // levels, and a rule that lives in one of them is a rule the other three can
    // break.
    var levels = [
      // Both Senate seats are always listed. Every state has two, and that is a
      // fact about the Senate rather than a claim about our coverage — so a
      // state we hold one senator for shows one name and one honest blank.
      swLevel('ussenate1', 'senate', 'U.S. Senate', 'U.S. Senate', '#f0abfc', sw.senators[0]),
      swLevel('ussenate2', 'senate', 'U.S. Senate', 'U.S. Senate', '#f0abfc', sw.senators[1]),
      level('house', 'house', 'U.S. House', 'U.S. House of Representatives', '#60a5fa', hd, hp),
      swLevel('governor', 'governor', 'Governor', 'Governor', '#fbbf24', sw.governor),
      level('statesenate', 'statesenate', 'State Senate', 'State Senate', '#a78bfa', sd, sp),
      level('statehouse', 'statehouse', 'State House', 'State House', '#2dd4bf', ld, lp)
    ];
    if (located && !national) levels = _pdxStickLevels(levels, loc, state);
    // AND THE WALK IS REMEMBERED IN MEMORY — NOT WRITTEN TO THE STORE.
    //
    // Asking who represents this reader is a READ, and a read that writes
    // localStorage is a surface with a side effect: painting a seat row, opening
    // a compare sheet or rendering the hub would each leave a different record
    // behind, and test-seat-spine pins exactly that ("the spine reads the stores;
    // it must never write one"). So the walk leaves its ingredients here, where
    // _pdxStickLevels' ledgers already live, and the one caller that IS a write
    // path — pdxRememberResolved(), called from the location-sync signal — is
    // what puts them in the record. Only a walk that could see the curated
    // tables is worth remembering: a walk reading the record back must never
    // write its own read down as if it had resolved it.
    _pdxLastWalk = (located && !national && (vb || matched))
      ? { loc: loc, state: state, levels: levels }
      : null;

    return {
      located: located,
      national: national,
      state: state,
      area: (matched && krd && krd.label) ? krd.label : (loc.city || loc.county || state || ''),
      redrawn: redrawn,
      // The county the curated area already resolved to, published because a
      // caller that needs it should read it from the module that resolved the
      // location rather than reach for `_currentVoterLocation` and get a
      // second answer. Utah-only and match-gated: outside a matched Utah area
      // there is no county to publish, and an empty string is a caller's cue
      // to fail closed rather than guess. Judicial retention is the current
      // reader — trial-court seats are drawn by county — and it is a label
      // here, never a geometry claim.
      county: (matched && krd && krd.county) ? String(krd.county) : '',
      // Whether this visitor's location has curated district geometry at all. It
      // is what separates "we hold no record for your state senator" from "we do
      // not map your state's legislative districts", and it also gates the handoff
      // to local offices, which are curated for the same areas.
      districtsResolvable: utah,
      statewideAmbiguous: !!sw.ambiguous,
      levels: levels
    };
  };

  // ── window.pdxSeatHolders(seatKey) — ONE owner of "who holds this seat" ─────
  // pdxRepsForMe() answers "who represents me" as a LIST OF LEVELS. Three
  // surfaces need the same answer as a LIST OF PIDS FOR ONE BALLOT SEAT, and
  // before this pass each of them derived it separately:
  //
  //   · Who Represents Me   walked the levels itself.
  //   · Work this seat      took the union of the resolver's pids AND the curated
  //                         ballot's byOffice incumbents, so a redrawn area got
  //                         BOTH members tagged — a Layton voter's U.S. House
  //                         card read "Celeste Maloy · HOLDS THIS SEAT" (she
  //                         holds UT-2) beside a list and a map pin that both
  //                         said Blake Moore (UT-1, the district that voter is
  //                         actually in today).
  //   · The workspace desk  mapped level keys through race-sheet.js's alias table
  //                         and treated "no display record" as "no holder", which
  //                         is how a Senate pane came to print "No record on file
  //                         for the current holder" directly above a field
  //                         listing Curtis and Lee.
  //
  // Three derivations of one fact is three chances to name the wrong human, and
  // every one of those failures was that. So this is the only place that question
  // is answered, it answers it from the resolver's own levels, and the three
  // surfaces read it rather than re-deriving it.
  //
  // WHAT IT RETURNS, AND WHY EACH FIELD EXISTS
  //   ok          true only when at least one pid was resolved. This is the flag
  //               that gates the "we would rather leave this blank" copy: blank
  //               when the resolver returns no pid, never over a person who has
  //               a /p/<pid> of their own.
  //   pids        the holders, in level order. Two for U.S. Senate.
  //   levels      the resolver's own level objects, for callers that also need
  //               the district label or the statewide flag.
  //   statewide   every level for this seat is elected by the whole state, so it
  //               resolves from the state ROSTER and never from the district map.
  //   districtGap a district level for this seat resolved no pid — the honest
  //               "we do not draw this line" case, which is a different sentence
  //               from "we hold no record for this person".
  //   located     whether there is a voter to answer for at all. A caller with
  //               no location must not fall back to a curated default area.
  //   sticky      at least one holder on this seat is being carried forward from
  //               an earlier answer on this page because the current walk lost
  //               them to a partial roster payload (see _pdxStickLevels). It is
  //               published for diagnostics only: a sticky holder is a resolved
  //               holder, no copy anywhere hedges on it, and no surface may treat
  //               it as a weaker fact than a freshly-walked one — the pid is the
  //               same pid and the record address is the same address.
  var _PDX_SEAT_OF = {
    ussenate1: 'senate', ussenate2: 'senate', ussenate: 'senate', senate: 'senate',
    house: 'house', representative: 'house',
    governor: 'governor', president: 'president',
    statesenate: 'statesenate', state_senator: 'statesenate',
    statehouse: 'statehouse', state_rep: 'statehouse',
    local: 'local'
  };

  // Every seat dialect in the app onto the ballot key. Published so a caller
  // never has to keep its own copy of this table to ask the question above.
  window.pdxSeatKey = function (k) {
    return _PDX_SEAT_OF[String(k == null ? '' : k).trim().toLowerCase()] || '';
  };

  window.pdxSeatHolders = function (seatKey) {
    var rk = window.pdxSeatKey(seatKey);
    // rosterCold travels on EVERY reply, including the early returns: a caller
    // that got no pids needs to know whether that is an answer or a wait, and
    // the early returns are exactly the replies where it cannot tell on its own.
    var out = { ok: false, seat: rk, located: false, statewide: false,
                districtGap: false, sticky: false, rosterCold: !_pdxRosterSize(),
                pids: [], levels: [] };
    if (!rk) return out;
    var reps = null;
    try { reps = window.pdxRepsForMe(); } catch (e) { reps = null; }
    if (!reps) return out;
    out.located = !!reps.located;
    if (!reps.levels) return out;

    var lv = reps.levels.filter(function (l) { return l && l.seat === rk; });
    out.levels = lv;
    if (!lv.length) return out;
    out.statewide = lv.every(function (l) { return !!l.statewide; });
    out.districtGap = lv.some(function (l) { return !l.statewide && !l.pid; });
    out.sticky = lv.some(function (l) { return !!l.sticky; });
    lv.forEach(function (l) { if (l.pid && out.pids.indexOf(l.pid) === -1) out.pids.push(l.pid); });
    out.ok = out.pids.length > 0;
    return out;
  };

  // ── "YOUR VOTING DISTRICTS" strip (inside the prominent location card) ──────
  // Turns an abstract saved location into the concrete thing a voter actually
  // needs: the exact districts they vote in. Before a location is set it states,
  // in one line, what setting one unlocks — answering "why should I bother?". Once
  // a location is set it names the U.S. House, State Senate and State House
  // districts that location belongs to and links straight to the people who hold
  // those seats, so the next step ("see who represents me") is one tap away.
  // District numbers come from the same authoritative Key Races data the
  // "Relevant to Me" ballot uses, so the two surfaces can never disagree.
  // ── EVERY OTHER "SET MY LOCATION" ON THE PAGE COMES THROUGH HERE ───────────
  // There is one location setter, at the top of Who Represents Me, and controls
  // elsewhere are doors to it rather than pickers of their own. This is the hop:
  // the band's module owns the scroll-then-open, and this falls back to the
  // picker directly on any document that does not carry the band, so a missing
  // module can never leave a reader with a dead button.
  window._pdxGoSetLocation = function () {
    try {
      if (typeof window.pdxSetLocation === 'function') { window.pdxSetLocation(); return; }
      var open = window.openLocationModal || window.toggleChangeLocation;
      if (typeof open === 'function') open();
    } catch (e) {}
  };

  window._vhSyncDistrictStrip = function() {
    var host = document.getElementById('vh-district-strip');
    if (!host) return;

    // ── Removed: the "Your Voting Districts" strip ────────────────────────────
    // This dark block re-listed the voter's three district rows (U.S. House,
    // State Senate, State House) plus a "who represents you" directory — exactly
    // what the My Voting Team cockpit below now shows in its Federal · Statewide ·
    // State Legislative · Local tabs. Rendering it here duplicated that ballot map
    // and pushed the team builder down the page, so the strip is retired. It's
    // emptied and hidden (rather than deleted from the DOM) so every existing
    // caller and scroll target stays valid and can't throw.
    // ── "Who represents you now" — the introduction to who holds power ─────────
    // The location card names the voter's districts up top; this strip introduces
    // the PEOPLE who currently hold those district seats (U.S. House · State Senate
    // · State House) so a first-time visitor immediately meets their real
    // representatives, not just district numbers — the Hub's core teaching job. Each
    // row opens that person's full record (promises, money, votes), and a footer
    // link carries the voter down into their LOCAL representatives (mayor, council,
    // school board, county). It reads from the SAME authoritative ballot data every
    // other surface uses (_pdxVoterBallot → keyRacesRelevantData), so it can never
    // disagree with the districts shown above or the team builder below. Kept
    // deliberately compact (three rows + one link) so it informs without recreating
    // the full team-builder cockpit that lives further down the page.
    // ── No location yet ───────────────────────────────────────────────────────
    // This used to hide the strip outright, which meant the hub's first
    // substantive block simply was not there for the visitor who most needs it —
    // and the only way to find the seat list was to scroll past the location card
    // into the team builder. Now the block holds its place and states the one
    // thing standing between them and their seats. It names NO officeholder: with
    // no location there is no honest answer to "who is my House member", and a
    // national placeholder would be a guess dressed as a fact.
    if (!window._hasUserLocation) {
      host.style.display = '';
      host.innerHTML =
        '<div style="background:linear-gradient(135deg,rgba(30,58,138,0.18),rgba(10,15,30,0.35));border:1px dashed rgba(96,165,250,0.4);border-radius:1rem;padding:0.9rem 0.95rem;">' +
          '<div style="display:flex;align-items:baseline;gap:0.5rem;flex-wrap:wrap;margin-bottom:0.25rem;">' +
            '<span style="font-family:\'Bebas Neue\',sans-serif;letter-spacing:0.05em;font-size:1.1rem;color:#fff;">🏛️ Who Represents You Now</span>' +
          '</div>' +
          '<div style="font-family:\'Barlow Condensed\',sans-serif;font-size:0.82rem;letter-spacing:0.01em;color:#aebfd8;line-height:1.4;margin-bottom:0.3rem;">' +
            'Set your location and we map your <strong style="color:#93c5fd;">U.S. House</strong>, <strong style="color:#c4b5fd;">State Senate</strong> &amp; <strong style="color:#5eead4;">State House</strong> seats — then show who holds each one. Until then we will not guess: no location, no representative.' +
          '</div>' +
          '<div style="font-family:\'Barlow Condensed\',sans-serif;font-size:0.74rem;font-weight:700;letter-spacing:0.05em;text-transform:uppercase;color:#7f93b4;margin-bottom:0.7rem;">Your seats → compare the field → pick for your ballot.</div>' +
          '<div style="display:flex;gap:0.5rem;flex-wrap:wrap;align-items:center;">' +
            '<button type="button" onclick="_pdxGoSetLocation()" style="font-family:\'Barlow Condensed\',sans-serif;font-weight:700;font-size:0.8rem;letter-spacing:0.04em;text-transform:uppercase;color:#fff;background:linear-gradient(135deg,#2563eb,#3b82f6);border:1px solid rgba(96,165,250,0.5);border-radius:0.7rem;padding:0.5rem 0.95rem;cursor:pointer;white-space:nowrap;min-height:44px;">📍 Set my location →</button>' +
            '<button type="button" onclick="window.openDistrictMapModal&&window.openDistrictMapModal()" style="font-family:\'Barlow Condensed\',sans-serif;font-weight:700;font-size:0.8rem;letter-spacing:0.04em;text-transform:uppercase;color:#5eead4;background:none;border:1px solid rgba(45,212,191,0.5);border-radius:0.7rem;padding:0.5rem 0.85rem;cursor:pointer;white-space:nowrap;min-height:44px;">🗺️ Open map</button>' +
          '</div>' +
        '</div>';
      return;
    }

    // Districts + officeholders come from the shared resolver above, which the
    // homepage front door reads too. The rows below only present what it returns.
    var _wrReps = window.pdxRepsForMe();

    // National focus is a location, but not a place with seats: the resolver
    // returns six blank rows for it. Painting those under "the people who hold
    // power in your state" would read as a coverage failure rather than what it
    // is — a scope the visitor chose. Ask for the state instead of listing blanks.
    if (_wrReps && _wrReps.national) {
      host.style.display = '';
      host.innerHTML =
        '<div style="background:linear-gradient(135deg,rgba(30,58,138,0.18),rgba(10,15,30,0.35));border:1px dashed rgba(96,165,250,0.4);border-radius:1rem;padding:0.9rem 0.95rem;">' +
          '<div style="display:flex;align-items:baseline;gap:0.5rem;flex-wrap:wrap;margin-bottom:0.25rem;">' +
            '<span style="font-family:\'Bebas Neue\',sans-serif;letter-spacing:0.05em;font-size:1.1rem;color:#fff;">🏛️ Who Represents You Now</span>' +
          '</div>' +
          '<div style="font-family:\'Barlow Condensed\',sans-serif;font-size:0.82rem;letter-spacing:0.01em;color:#aebfd8;line-height:1.4;margin-bottom:0.7rem;">' +
            'You are focused on <strong style="color:#93c5fd;">federal offices</strong> nationally, so there are no seats to list here yet. Pick a state and we will name your senators and governor — and your U.S. House, State Senate and State House seats wherever we map districts.' +
          '</div>' +
          '<button type="button" onclick="_pdxGoSetLocation()" style="font-family:\'Barlow Condensed\',sans-serif;font-weight:700;font-size:0.8rem;letter-spacing:0.04em;text-transform:uppercase;color:#fff;background:linear-gradient(135deg,#2563eb,#3b82f6);border:1px solid rgba(96,165,250,0.5);border-radius:0.7rem;padding:0.5rem 0.95rem;cursor:pointer;min-height:44px;">📍 Pick my state →</button>' +
        '</div>';
      return;
    }
    var _wrEsc = function(s) {
      return String(s == null ? '' : s)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    };

    var _wrParty = function(p) {
      if (!p) return null;
      var s = String(p).trim().toLowerCase();
      if (s === 'r' || s.indexOf('republican') !== -1 || s === 'gop') return { l: 'R', c: '#f87171' };
      if (s === 'd' || s.indexOf('democrat') !== -1) return { l: 'D', c: '#60a5fa' };
      if (s === 'f' || s.indexOf('forward') !== -1) return { l: 'F', c: '#22d3ee' };
      if (s === 'l' || s.indexOf('libertarian') !== -1) return { l: 'L', c: '#fbbf24' };
      if (s === 'g' || s.indexOf('green') !== -1) return { l: 'G', c: '#4ade80' };
      if (s === 'i' || s.indexOf('independent') !== -1 || s.indexOf('unaffiliated') !== -1) return { l: 'I', c: '#a78bfa' };
      return null;
    };
    var _wrRow = function(cfg) {
      var pid = cfg.pid;
      var person = (pid && typeof window._pdxPersonById === 'function') ? window._pdxPersonById(pid) : null;
      var color = cfg.color;
      var photo = (pid && typeof window._getPhotoUrl === 'function') ? (window._getPhotoUrl(pid) || '') : '';
      var avatar = photo
        ? '<span style="width:44px;height:44px;border-radius:50%;overflow:hidden;flex-shrink:0;border:2px solid ' + color + ';background:#0a0f1e;box-shadow:0 0 0 2px ' + color + '26;display:block;"><img src="' + _wrEsc(photo) + '" alt="" style="width:100%;height:100%;object-fit:cover;" loading="lazy" onerror="this.parentElement.innerHTML=\'<span style=&quot;display:flex;align-items:center;justify-content:center;width:100%;height:100%;font-size:1.15rem;color:#9fb4d4&quot;>🏛</span>\'"></span>'
        : '<span style="width:44px;height:44px;border-radius:50%;flex-shrink:0;border:2px solid ' + color + '99;background:rgba(30,53,96,0.35);display:flex;align-items:center;justify-content:center;font-size:1.15rem;color:#9fb4d4;">🏛</span>';
      // THE GATE IS THE PID, NOT THE DISPLAY RECORD. A resolved seat has a person
      // in it and that person has a file at /p/<pid>; if the light roster has not
      // merged their display record yet, the honest row is their id with a link to
      // the file, never the sentence "no record on file yet" printed over a
      // sitting senator. Same rule as the homepage band, which reads the same
      // resolver — see the row() comment in who-represents-me.js.
      var nameHtml, subLine, clickable = !!pid;
      if (pid) {
        var pm = person ? _wrParty(person.party) : null;
        nameHtml = _wrEsc((person && person.name) || pid) + (pm ? ' <span style="font-family:\'Barlow Condensed\',sans-serif;font-size:0.62rem;font-weight:800;color:' + pm.c + ';">(' + pm.l + ')</span>' : '');
        subLine = _wrEsc((person && person.office) || cfg.tierLabel);
      } else {
        // "Being confirmed" implied we knew the seat and were checking the name.
        // Outside Utah we do not know the seat at all, and inside it we may simply
        // hold no record — either way the honest word is "not resolved", matching
        // the homepage band that reads the same resolver.
        nameHtml = '<span style="color:#9fb4d4;">' + (cfg.statewide ? 'No record on file yet' : 'Not resolved yet') + '</span>';
        subLine = _wrEsc(cfg.tierLabel);
      }
      var pidJs = pid ? String(pid).replace(/\\/g, '\\\\').replace(/'/g, "\\'") : '';
      var interactive = clickable
        ? ' role="button" tabindex="0" onclick="window.showProfile&&window.showProfile(\'' + pidJs + '\')" onkeydown="if(event.key===\'Enter\'||event.key===\' \'){event.preventDefault();window.showProfile&&window.showProfile(\'' + pidJs + '\')}" title="See ' + (person ? _wrEsc(person.name) : 'this officeholder') + '’s full record"'
        : '';
      return '<div' + interactive + ' style="display:flex;align-items:center;gap:0.6rem;padding:0.5rem 0.55rem;border-radius:0.7rem;background:rgba(10,15,30,0.4);border:1px solid ' + color + '2e;border-left:3px solid ' + color + ';' + (clickable ? 'cursor:pointer;' : '') + '">' +
          avatar +
          '<span style="min-width:0;flex:1;">' +
            '<span style="display:block;font-family:\'Barlow Condensed\',sans-serif;font-size:0.62rem;font-weight:800;letter-spacing:0.07em;text-transform:uppercase;color:' + color + ';">' + _wrEsc(cfg.distLabel) + '</span>' +
            '<span style="display:block;font-family:\'Bebas Neue\',sans-serif;font-size:1.05rem;letter-spacing:0.02em;color:#fff;line-height:1.18;">' + nameHtml + '</span>' +
            '<span style="display:block;font-family:\'Barlow Condensed\',sans-serif;font-size:0.72rem;color:#9fb4d4;line-height:1.2;">' + subLine + '</span>' +
          '</span>' +
          (clickable ? '<span style="flex-shrink:0;font-family:\'Barlow Condensed\',sans-serif;font-size:0.64rem;font-weight:700;letter-spacing:0.03em;text-transform:uppercase;color:' + color + ';">View ›</span>' : '') +
        '</div>';
    };

    // Each seat row is followed by its own "compare the field" entry, rendered by
    // race-sheet.js and dropped in unchanged. It is a SIBLING of the row, never a
    // child: the row itself is role="button" and opens the officeholder's profile,
    // so nesting a second button inside it would be both invalid and ambiguous.
    // pdxRaceSheetEntry returns '' for any seat it cannot actually compare, so a
    // seat with no rostered field simply gets no button — meeting the officeholder
    // stays the whole job of the row, exactly as it is today.
    // pdxSeatStrip is the shared seat contract (team slot + compare + the stance
    // line for a visitor with no positions); the bare entry button is the older
    // fallback, so this strip degrades rather than breaking if race-sheet.js is
    // an older build in someone's service-worker cache.
    var _wrCompare = function (lv) {
      if (!lv) return '';
      var h = '';
      if (typeof window.pdxSeatStrip === 'function') h = window.pdxSeatStrip(lv.key, { compact: true });
      else if (typeof window.pdxRaceSheetEntry === 'function') h = window.pdxRaceSheetEntry(lv.key, { compact: true });
      return h ? '<div class="wrm-seatcompare">' + h + '</div>' : '';
    };

    var _wrRows = _wrReps.levels.map(function (lv) {
      return _wrRow({ pid: lv.pid, color: lv.color, tierLabel: lv.tierLabel, distLabel: lv.distLabel, statewide: lv.statewide }) +
             _wrCompare(lv);
    }).join('');

    // Same two-speed truth the homepage band states: statewide seats resolve from
    // the state for every visitor, district seats need lines we only draw in Utah.
    // Without this a visitor outside Utah reads three blank district rows as "this
    // site has nothing on my state" when it has both senators and the governor.
    var _wrDistrictsOk = !!_wrReps.districtsResolvable;
    // One resolver for "does this visitor have local seats at all", shared with the
    // homepage band and with the jump guard below. Absent (compare-hub not loaded
    // yet) is treated as unresolved, which offers nothing and claims nothing —
    // never as permission to offer the handoff anyway.
    var _wrLocalCov = { resolved: false, ok: false, area: '', pids: [] };
    try { if (typeof window.pdxLocalSeatsForMe === 'function') _wrLocalCov = window.pdxLocalSeatsForMe(); } catch (e) {}
    var _wrLede = _wrDistrictsOk
      ? 'Meet the people who hold power in your districts today. Tap any name to see their record — <strong style="color:#cdd9ec;">promises kept, money, and how they vote</strong>.'
      : 'Meet the people who hold power in your state today. Tap any name to see their record — <strong style="color:#cdd9ec;">promises kept, money, and how they vote</strong>. Your U.S. House, State Senate and State House seats need district lines, which we map in Utah so far — those rows stay blank rather than naming someone else&rsquo;s district.';

    host.style.display = '';
    host.innerHTML =
      '<div style="background:linear-gradient(135deg,rgba(30,58,138,0.18),rgba(10,15,30,0.35));border:1px solid rgba(96,165,250,0.28);border-radius:1rem;padding:0.9rem 0.95rem;">' +
        '<div style="display:flex;align-items:baseline;gap:0.5rem;flex-wrap:wrap;margin-bottom:0.25rem;">' +
          '<span style="font-family:\'Bebas Neue\',sans-serif;letter-spacing:0.05em;font-size:1.1rem;color:#fff;">🏛️ Who Represents You Now</span>' +
        '</div>' +
        '<div style="font-family:\'Barlow Condensed\',sans-serif;font-size:0.82rem;letter-spacing:0.01em;color:#aebfd8;line-height:1.4;margin-bottom:0.3rem;">' + _wrLede + '</div>' +
        // The spine, in six words, above the rows it describes. A voter who reads
        // only this line still knows what the next two taps are for.
        '<div style="font-family:\'Barlow Condensed\',sans-serif;font-size:0.74rem;font-weight:700;letter-spacing:0.05em;text-transform:uppercase;color:#7f93b4;margin-bottom:0.7rem;">Your seats → compare the field → pick for your ballot.</div>' +
        '<div style="display:flex;flex-direction:column;gap:0.5rem;">' + _wrRows + '</div>' +
        // Local seats are NOT curated for the same areas the district seats are —
        // districtsResolvable is true for all of Utah, and local rosters are built
        // county by county. Gating on it offered this button in areas where the
        // jump had no local group to open, and the jump's own fallback then
        // scrolled the visitor to the ballot section's first groups: President and
        // Cabinet. So the gate is the real count from window.pdxLocalSeatsForMe(),
        // and where that count is zero the strip says so instead of offering a
        // button it cannot honour. Same three states as the homepage band.
        (_wrLocalCov.ok
          ? '<button type="button" onclick="window.jumpToRelevantAccordion&&window.jumpToRelevantAccordion(\'local\')" style="display:flex;align-items:center;justify-content:center;gap:0.4rem;width:100%;margin-top:0.7rem;font-family:\'Barlow Condensed\',sans-serif;font-weight:700;font-size:0.74rem;letter-spacing:0.03em;text-transform:uppercase;color:#fcd34d;background:linear-gradient(135deg,rgba(245,200,66,0.16),rgba(245,158,11,0.06));border:1px solid rgba(245,200,66,0.4);border-radius:0.6rem;padding:0.6rem 0.7rem;min-height:44px;cursor:pointer;transition:transform .12s ease;text-align:center;line-height:1.25;" onmouseover="this.style.transform=\'translateY(-1px)\'" onmouseout="this.style.transform=\'\'">🏙️ See your local representatives — mayor, council, school board &amp; county → <span style="opacity:0.75;">(' + _wrLocalCov.pids.length + ')</span></button>'
          : (_wrLocalCov.resolved
            ? '<p style="font-family:\'Barlow\',sans-serif;font-size:0.73rem;line-height:1.45;color:#a9b8cf;background:rgba(148,163,184,0.07);border:1px solid rgba(148,163,184,0.22);border-radius:0.6rem;padding:0.5rem 0.6rem;margin:0.7rem 0 0;"><strong style="color:#d3dcea;">Local offices aren&rsquo;t mapped for ' + (_wrLocalCov.area ? _wrEsc(_wrLocalCov.area) : 'your area') + ' yet.</strong> Mayor, city council, school board and county seats are curated area by area, and this one isn&rsquo;t done. We would rather say so than hand you a list of people who don&rsquo;t represent you.</p>'
            : '')) +
      '</div>';
    return;

    // ── Unreachable below ─────────────────────────────────────────────────────
    // Everything past this return is the pre-"Who Represents You Now" version of
    // this strip. It is left in place rather than deleted because removing ~180
    // lines is not this pass's job, but nothing below runs: the no-location and
    // National branches above are the live ones. Do not edit copy down here
    // expecting to see it.
    var btnLink = 'font-family:\'Barlow Condensed\',sans-serif;font-weight:700;font-size:0.8rem;letter-spacing:0.04em;text-transform:uppercase;color:#fff;background:linear-gradient(135deg,#2563eb,#3b82f6);border:1px solid rgba(96,165,250,0.5);border-radius:0.7rem;padding:0.5rem 0.95rem;cursor:pointer;white-space:nowrap;min-height:44px;transition:transform .15s,box-shadow .15s;';

    // ── No location yet: make the first step obvious and motivating. ──────────
    if (!window._hasUserLocation) {
      host.innerHTML =
        '<div style="display:flex;align-items:center;gap:0.7rem;flex-wrap:wrap;background:rgba(10,15,30,0.45);border:1px dashed rgba(96,165,250,0.45);border-radius:0.9rem;padding:0.75rem 0.95rem;">' +
          '<span style="font-size:1.2rem;line-height:1;">🧭</span>' +
          '<span style="font-family:\'Barlow Condensed\',sans-serif;font-size:0.94rem;letter-spacing:0.01em;color:#cdd9ec;line-height:1.4;flex:1;min-width:220px;">' +
            'Set your location and we instantly map your <strong style="color:#93c5fd;">U.S. House</strong>, <strong style="color:#c4b5fd;">State Senate</strong> &amp; <strong style="color:#5eead4;">State House</strong> districts — then show exactly who represents you in each.' +
          '</span>' +
          '<div style="display:flex;gap:0.5rem;flex-wrap:wrap;align-items:center;">' +
            '<button type="button" onclick="_pdxGoSetLocation()" style="' + btnLink + '" onmouseover="this.style.transform=\'translateY(-1px)\'" onmouseout="this.style.transform=\'\'">📍 Set location →</button>' +
            '<button type="button" onclick="window.openDistrictMapModal&&window.openDistrictMapModal()" style="font-family:\'Barlow Condensed\',sans-serif;font-weight:700;font-size:0.8rem;letter-spacing:0.04em;text-transform:uppercase;color:#5eead4;background:none;border:1px solid rgba(45,212,191,0.5);border-radius:0.7rem;padding:0.5rem 0.85rem;cursor:pointer;white-space:nowrap;min-height:44px;transition:transform .15s,background .15s;" onmouseover="this.style.transform=\'translateY(-1px)\';this.style.background=\'rgba(45,212,191,0.12)\'" onmouseout="this.style.transform=\'\';this.style.background=\'none\'">🗺️ Open map</button>' +
          '</div>' +
        '</div>';
      return;
    }

    var loc = window._currentVoterLocation || { state: '', city: '', county: '', district: '' };
    var state = loc.state || '';

    // National / federal focus has no local voting districts to resolve.
    if (state === 'National') {
      host.innerHTML =
        '<div style="display:flex;align-items:center;gap:0.7rem;flex-wrap:wrap;background:rgba(10,15,30,0.5);border:1px solid rgba(59,130,246,0.35);border-radius:0.9rem;padding:0.75rem 0.95rem;">' +
          '<span style="font-size:1.2rem;line-height:1;">🇺🇸</span>' +
          '<span style="font-family:\'Barlow Condensed\',sans-serif;font-size:0.94rem;letter-spacing:0.01em;color:#cdd9ec;line-height:1.4;flex:1;min-width:220px;">' +
            'You\'re focused on <strong style="color:#93c5fd;">federal offices</strong>. Pick your state to also see your U.S. House, State Senate &amp; State House districts.' +
          '</span>' +
          '<div style="display:flex;gap:0.5rem;flex-wrap:wrap;align-items:center;">' +
            '<button type="button" onclick="var s=document.getElementById(\'relevant-section\');if(s)s.scrollIntoView({behavior:\'smooth\',block:\'start\'});" style="' + btnLink + '" onmouseover="this.style.transform=\'translateY(-1px)\'" onmouseout="this.style.transform=\'\'">⭐ See who represents me →</button>' +
            '<button type="button" onclick="window.openDistrictMapModal&&window.openDistrictMapModal()" style="font-family:\'Barlow Condensed\',sans-serif;font-weight:700;font-size:0.8rem;letter-spacing:0.04em;text-transform:uppercase;color:#5eead4;background:none;border:1px solid rgba(45,212,191,0.5);border-radius:0.7rem;padding:0.5rem 0.85rem;cursor:pointer;white-space:nowrap;min-height:44px;transition:transform .15s,background .15s;" onmouseover="this.style.transform=\'translateY(-1px)\';this.style.background=\'rgba(45,212,191,0.12)\'" onmouseout="this.style.transform=\'\';this.style.background=\'none\'">🗺️ Open map</button>' +
          '</div>' +
        '</div>';
      return;
    }

    // District numbers: prefer the voter's matched curated Utah area (which knows
    // all three seats), then fall back to whatever they typed for U.S. House.
    // District numbers + officeholders come from the SAME authoritative source of
    // truth the "Relevant to Me" ballot filters by (_pdxVoterBallot), so the two
    // surfaces can never disagree. It resolves the voter's EXACT seat — an exact
    // district they pinpointed on the map wins over the curated area default, which
    // is what finally makes a split city like Layton show the right seat — and the
    // sitting officeholder BY ID, so a real name appears the instant a location is
    // set. We keep the curated keyRacesRelevantData() (krd) around only as a
    // fallback for the summary label / other-race disclosures below.
    var krd = (typeof window.keyRacesRelevantData === 'function') ? window.keyRacesRelevantData() : null;
    var vb  = (typeof window._pdxVoterBallot === 'function') ? window._pdxVoterBallot() : null;
    var matched = !!(krd && krd.matched && state.toLowerCase() === 'utah');
    var house  = (vb && vb.districts.house  != null) ? vb.districts.house
                 : ((matched && krd.byRace && krd.byRace.house)       ? krd.byRace.house.district       : (loc.district || null));
    var senate = (vb && vb.districts.senate != null) ? vb.districts.senate
                 : ((matched && krd.byRace && krd.byRace.statesenate) ? krd.byRace.statesenate.district : null);
    var lower  = (vb && vb.districts.lower  != null) ? vb.districts.lower
                 : ((matched && krd.byRace && krd.byRace.statehouse)  ? krd.byRace.statehouse.district  : null);
    var areaLabel = (matched && krd && krd.label)
      ? krd.label
      : ([ (loc.city || loc.county || ''), state ].filter(Boolean).join(', ') || 'your area');

    // Resolve the sitting officeholder(s) for a seat. The PRIMARY source is the
    // curated Key Races roster — the SAME authoritative incumbent data the
    // "Relevant to Me" ballot renders from — so the Hub shows the real current
    // representative the instant a location is set, and the two surfaces can never
    // disagree. District seats (U.S. House, State Senate, State House) read their
    // incumbent straight from keyRacesRelevantData().byRace; Local pulls every
    // sitting county/city/school officeholder from the curated local roster for
    // the area. Only when the curated data carries no incumbent (e.g. a state we
    // don't curate yet) do we fall back to computing one from CMP_DATA via the
    // office-string matcher.
    //
    // That order is the whole fix: the old code used ONLY the computed path, which
    // silently dropped real incumbents whose record didn't line up with the
    // matcher — e.g. Celeste Maloy, whose `state` field reads "District 2" rather
    // than "Utah - District 2", so the state check failed and her U.S. House seat
    // fell through to a "being confirmed" placeholder even though she plainly holds
    // it. Reading the curated incumbentPid sidesteps every one of those matcher
    // fragilities. Only pids that resolve to a real person record are kept, so a
    // row is never rendered empty and no name is ever invented.
    function _vhAddPid(arr, pid) {
      if (!pid || arr.indexOf(pid) !== -1) return;
      if (typeof window._pdxPersonById === 'function' && !window._pdxPersonById(pid)) return;
      arr.push(pid);
    }
    function _vhResolveHolder(seatKey) {
      var pids = [];
      var hasField = false;

      // 0) Authoritative voter ballot — the SAME source of truth "Relevant to Me"
      //    filters by. For the three district seats it resolves the sitting
      //    officeholder BY ID (curated roster, or the district→incumbent map when
      //    the voter's exact map seat differs from the area default), so the Hub
      //    names a real person the instant a location is set instead of falling to
      //    a "being confirmed" placeholder, and can never disagree with the ballot.
      var VB_OFFICE = { house: 'representative', statesenate: 'state_senator', statehouse: 'state_rep' };
      if (vb && VB_OFFICE[seatKey] && vb.byOffice && vb.byOffice[VB_OFFICE[seatKey]]) {
        var bo = vb.byOffice[VB_OFFICE[seatKey]];
        _vhAddPid(pids, bo.incumbentPid);
        if (bo.incumbentPid) hasField = true;
      }

      // 1) Curated incumbent(s) — Local pulls its county/city/school officeholders
      //    here; the district seats fall back to it when the ballot resolver above
      //    could not name anyone (e.g. a state we don't curate an exact seat for).
      if (!pids.length && matched && krd) {
        if (seatKey === 'local') {
          var localRaces = (window.KEY_RACES_LOCAL_BY_LOCATION && krd.locId)
            ? (window.KEY_RACES_LOCAL_BY_LOCATION[krd.locId] || []) : [];
          for (var li = 0; li < localRaces.length; li++) {
            var lr = localRaces[li] || {};
            _vhAddPid(pids, lr.incumbentPid);
            (lr.incumbentPids || []).forEach(function(p) { _vhAddPid(pids, p); });
            if (lr.incumbentPid || (lr.incumbentPids && lr.incumbentPids.length) || (lr.candidates && lr.candidates.length)) hasField = true;
          }
        } else {
          var br = krd.byRace && krd.byRace[seatKey];
          if (br) {
            _vhAddPid(pids, br.incumbentPid);
            (br.incumbentPids || []).forEach(function(p) { _vhAddPid(pids, p); });
            if (br.pids && br.pids.length) hasField = true;
          }
        }
      }

      // 2) Fallback — compute from CMP_DATA for any state/seat the curated roster
      //    doesn't cover, using the same officeholder test the Builder relies on.
      if (!pids.length) {
        var cands = [];
        try {
          cands = (typeof window._ballotCandidates === 'function') ? (window._ballotCandidates(seatKey) || []) : [];
        } catch (e) { cands = []; }
        for (var i = 0; i < cands.length; i++) {
          if (typeof window._homeIsOfficeholder === 'function' && window._homeIsOfficeholder(cands[i].pid)) _vhAddPid(pids, cands[i].pid);
        }
        if (cands.length) hasField = true;
      }

      return { pids: pids, pid: pids[0] || null, hasField: hasField };
    }
    var houseInc  = _vhResolveHolder('house');
    var senateInc = _vhResolveHolder('statesenate');
    var lowerInc  = _vhResolveHolder('statehouse');
    var localInc  = _vhResolveHolder('local');

    // U.S. House redistricting (2026 court-ordered map). For a redrawn area, the
    // sitting officeholder resolved above is the incumbent of the NEW ballot
    // district — but the person representing this voter RIGHT NOW is the incumbent
    // of the district they still sit in under the current map. Swap the house row
    // to that current representative so "who represents you now" is accurate; the
    // 2026 ballot district is surfaced separately in the panel. When no current
    // officeholder resolves, empty the row so the panel shows an honest placeholder
    // rather than the wrong (new-district) name.
    var houseRedistrict = (typeof window._pdxHouseRedistrict === 'function') ? window._pdxHouseRedistrict() : null;
    if (houseRedistrict && houseRedistrict.changed) {
      houseInc = houseRedistrict.currentPid
        ? { pids: [houseRedistrict.currentPid], pid: houseRedistrict.currentPid, hasField: true }
        : { pids: [], pid: null, hasField: true };
    }

    // The voter's current team picks ({ raceKey: pid }), read straight from the
    // shared ballot store so each card's "in your team" indicator always agrees
    // with My Voting Team. Re-read on every render, so it stays live.
    var teamSel = {};
    try { var _tsRaw = localStorage.getItem('politidex_my_team'); if (_tsRaw) teamSel = JSON.parse(_tsRaw) || {}; } catch (e) {}

    // Tiny HTML-text escaper for the names/labels injected below (this <script>
    // block has no access to the shared _esc/_relTxt helpers).
    function _distTxt(s) {
      return String(s == null ? '' : s)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    // Compact party label + color, normalized from the mixed letter / full-name
    // shapes the data set carries (mirrors the Key Races party chip).
    function _distPartyMeta(p) {
      if (!p) return null;
      var s = String(p).trim().toLowerCase();
      if (!s) return null;
      if (s === 'r' || s.indexOf('republican') !== -1 || s === 'gop') return { label: 'Republican', color: '#f87171' };
      if (s === 'd' || s.indexOf('democrat') !== -1) return { label: 'Democrat', color: '#60a5fa' };
      if (s === 'f' || s.indexOf('forward') !== -1) return { label: 'Forward', color: '#22d3ee' };
      if (s === 'l' || s.indexOf('libertarian') !== -1) return { label: 'Libertarian', color: '#fbbf24' };
      if (s === 'g' || s.indexOf('green') !== -1) return { label: 'Green', color: '#4ade80' };
      if (s === 'i' || s.indexOf('independent') !== -1 || s.indexOf('unaffiliated') !== -1 || s.indexOf('no party') !== -1) return { label: 'Independent', color: '#a78bfa' };
      return null;
    }

    // Avatar: real headshot when we have one, else a colored fallback chip.
    // A larger ring + chamber-colored glow gives the officeholder real visual
    // weight inside the compact card without adding row height.
    function _distAvatar(pid, person, color) {
      var url = (pid && typeof window._getPhotoUrl === 'function') ? window._getPhotoUrl(pid) : '';
      var nm = _distTxt((person && person.name) || '');
      if (url) {
        return '<div style="width:52px;height:52px;border-radius:50%;overflow:hidden;flex-shrink:0;border:2px solid ' + color + ';background:#0a0f1e;box-shadow:0 0 0 3px ' + color + '26,0 3px 9px rgba(0,0,0,0.45);">' +
          '<img src="' + url + '" alt="' + nm + '" style="width:100%;height:100%;object-fit:cover;" loading="lazy" onerror="this.parentElement.innerHTML=\'<div style=&quot;display:flex;align-items:center;justify-content:center;width:100%;height:100%;font-size:1.35rem;color:#9fb4d4&quot;>🏛</div>\'"></div>';
      }
      return '<div style="width:52px;height:52px;border-radius:50%;flex-shrink:0;border:2px solid ' + color + '99;background:rgba(30,53,96,0.35);display:flex;align-items:center;justify-content:center;font-size:1.35rem;color:#9fb4d4;box-shadow:0 0 0 3px ' + color + '1a;">🏛</div>';
    }

    // ── Compact directory renderers ────────────────────────────────────────────
    // The strip is a scannable directory: a horizontal row of four level buttons
    // (U.S. House · State Senate · State House · Local) that each expand a downward
    // panel listing only the CURRENT officeholder(s) for that level. All the data
    // resolution above is reused unchanged — this is presentation only.

    // Small, subtle "Add" affordance on an officeholder row. It keeps the directory
    // read-first while preserving a light path into My Voting Team, and flips to a
    // calm "On team" tag once that person is picked. Reuses the same
    // ballotPickCardAnimated handler the rest of the builder uses, so team state
    // can never disagree.
    var _addLink   = 'display:inline-flex;align-items:center;gap:0.2rem;flex-shrink:0;font-family:\'Barlow Condensed\',sans-serif;font-weight:700;font-size:0.66rem;letter-spacing:0.04em;text-transform:uppercase;color:#fbbf24;background:none;border:1px solid transparent;border-radius:0.45rem;padding:0.32rem 0.42rem;min-height:34px;cursor:pointer;transition:background .15s,border-color .15s;';
    var _onTeamTag = 'display:inline-flex;align-items:center;gap:0.24rem;flex-shrink:0;font-family:\'Barlow Condensed\',sans-serif;font-weight:700;font-size:0.66rem;letter-spacing:0.04em;text-transform:uppercase;color:#4ade80;padding:0.32rem 0.42rem;';
    // Full-width "see the full field" bridge at the foot of each open panel.
    var _seeAllBtn = 'display:flex;align-items:center;justify-content:center;gap:0.34rem;width:100%;margin-top:0.5rem;font-family:\'Barlow Condensed\',sans-serif;font-weight:700;font-size:0.72rem;letter-spacing:0.04em;text-transform:uppercase;color:#bcd3f5;background:linear-gradient(135deg,rgba(59,130,246,0.2),rgba(59,130,246,0.08));border:1px solid rgba(96,165,250,0.45);border-radius:0.6rem;padding:0.5rem 0.6rem;min-height:42px;cursor:pointer;transition:transform .12s,background .15s;';

    // One compact officeholder row inside an expanded level panel: a small avatar +
    // party dot, the name (opens the profile), the exact position + district and a
    // party chip, one light tenure line when on file, and the subtle Add link.
    function holderRow(pid, color, shortTitle, distNum, raceKey, opts) {
      opts = opts || {};
      var person = (pid && typeof window._pdxPersonById === 'function') ? window._pdxPersonById(pid) : null;
      if (!person) return '';
      var pm = _distPartyMeta(person.party);
      var nm = _distTxt(person.name || 'Current officeholder');
      // Prefer the officeholder's own title (e.g. "Davis County Sheriff"), which is
      // more specific and accurate than the level's generic label; fall back to the
      // level label, and append the district for the single-seat legislative levels.
      var posLine = _distTxt(person.office || shortTitle) + (distNum ? ' · District ' + distNum : '');
      var partyChip = pm
        ? '<span style="display:inline-flex;align-items:center;gap:0.24rem;font-family:\'Barlow Condensed\',sans-serif;font-size:0.6rem;font-weight:700;letter-spacing:0.03em;color:' + pm.color + ';background:linear-gradient(135deg,' + pm.color + '2e,' + pm.color + '12);border:1px solid ' + pm.color + '66;padding:0.04rem 0.4rem 0.04rem 0.32rem;border-radius:999px;white-space:nowrap;">' +
            '<span style="width:0.32rem;height:0.32rem;border-radius:50%;background:' + pm.color + ';box-shadow:0 0 5px ' + pm.color + ';flex-shrink:0;"></span>' + pm.label + '</span>'
        : '';
      var _tp = (typeof window._pdxTenurePill === 'function') ? window._pdxTenurePill(person) : '';
      var tenureLine = _tp ? '<div style="margin-top:0.3rem;">' + _tp + '</div>' : '';
      var avatarBlock =
        '<div style="position:relative;flex-shrink:0;">' +
          _distAvatar(pid, person, color) +
          (pm ? '<span title="' + pm.label + '" style="position:absolute;right:-2px;bottom:-2px;width:0.9rem;height:0.9rem;border-radius:50%;background:' + pm.color + ';border:2px solid #0a0f1e;box-shadow:0 0 7px ' + pm.color + 'bb;"></span>' : '') +
        '</div>';
      // Local picks now live under per-seat keys (local_<raceKey>), not the shared
      // 'local' key this strip passes, so match a local pick by pid across any key
      // to keep the "✓ On team" badge accurate. Non-local rows keep their exact
      // per-key check so nothing else changes.
      var onTeam = (raceKey === 'local')
        ? ((typeof window._pdxIsOnTeam === 'function') ? window._pdxIsOnTeam(pid) : (teamSel[raceKey] === pid))
        : (teamSel[raceKey] && teamSel[raceKey] === pid);
      // A redistricted "who represents you now" row is informational — the voter's
      // 2026 ballot is a different district, so we don't offer to add this member
      // as their team pick (the "See all candidates" bridge leads to the real 2026
      // field). Every other row keeps the light Add / On-team affordance.
      var action = opts.hideAdd
        ? ''
        : (onTeam
          ? '<span style="' + _onTeamTag + '">✓ Your pick</span>'
          : '<button type="button" title="Add to your ballot" onclick="window.ballotPickCardAnimated(this,\'' + raceKey + '\',\'' + pid + '\')" style="' + _addLink + '" onmouseover="this.style.background=\'rgba(251,191,36,0.12)\';this.style.borderColor=\'rgba(251,191,36,0.45)\'" onmouseout="this.style.background=\'none\';this.style.borderColor=\'transparent\'">＋ Add</button>');
      // "Currently representing you" eyebrow makes the strip's promise explicit —
      // every row is the sitting officeholder for the voter's own district, not a
      // generic listing — directly answering "who represents me right now?". A
      // redistricted seat overrides the label (e.g. "Represents you now") so the
      // current-vs-2026 distinction stays honest.
      var _eyebrowText = opts.eyebrow || 'Currently representing you';
      var eyebrow = '<div style="display:flex;align-items:center;gap:0.28rem;font-family:\'Barlow Condensed\',sans-serif;font-size:0.58rem;font-weight:700;letter-spacing:0.09em;text-transform:uppercase;color:' + color + ';line-height:1;margin-bottom:0.2rem;">' +
        '<span style="width:0.34rem;height:0.34rem;border-radius:50%;background:' + color + ';box-shadow:0 0 6px ' + color + ';"></span>' + _distTxt(_eyebrowText) + '</div>';
      return '<div style="display:flex;align-items:center;gap:0.65rem;background:radial-gradient(120% 100% at 0% 0%,' + color + '20,transparent 62%),linear-gradient(135deg,' + color + '17,rgba(255,255,255,0.025));border:1px solid ' + color + '3d;border-radius:0.65rem;padding:0.55rem 0.62rem;margin-top:0.4rem;box-shadow:inset 0 1px 0 rgba(255,255,255,0.04);">' +
        avatarBlock +
        '<div style="min-width:0;flex:1;">' +
          eyebrow +
          '<button type="button" onclick="if(typeof openMediumModal===\'function\')openMediumModal(\'' + pid + '\')" style="display:block;text-align:left;background:none;border:none;padding:0;cursor:pointer;font-family:\'Barlow Condensed\',sans-serif;font-weight:800;font-size:1.02rem;letter-spacing:0.01em;color:#fff;line-height:1.12;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%;text-shadow:0 1px 8px ' + color + '4d;">' + nm + '</button>' +
          '<div style="display:flex;align-items:center;gap:0.35rem;flex-wrap:wrap;margin-top:0.24rem;">' +
            partyChip +
            '<span style="font-family:\'Barlow Condensed\',sans-serif;font-size:0.72rem;color:#aebccf;line-height:1.1;">' + posLine + '</span>' +
          '</div>' +
          tenureLine +
        '</div>' +
        action +
      '</div>';
    }

    // One level button in the always-visible horizontal row. Shows the level name,
    // its district chip (where known) and a light status cue — the current holder's
    // name for a single seat, a count for Local, or a "See who's running" prompt
    // when no officeholder is on file — plus a chevron reflecting the panel's open state.
    function levelButton(levelKey, color, label, distVal, statusText, isOpen) {
      var distNum = distVal ? String(distVal).replace(/[^0-9]/g, '') : '';
      var distChip = distNum
        ? '<span style="font-family:\'Barlow Condensed\',sans-serif;font-weight:800;font-size:0.66rem;letter-spacing:0.04em;color:#fff;background:linear-gradient(135deg,' + color + '59,' + color + '1f);border:1px solid ' + color + '99;border-radius:0.4rem;padding:0.08rem 0.42rem;white-space:nowrap;flex-shrink:0;">Dist ' + distNum + '</span>'
        : '';
      // Closed cards used to share one flat dark fill with a faint border, so the
      // four levels blended together. Each closed card now carries a subtle
      // level-tinted gradient, a stronger accent border and real elevation (drop
      // shadow + inset ring + top highlight) so the row reads as four distinct,
      // raised cards. The open state keeps the same gradient language but pushes
      // the ring, colored glow and lift further so the active level clearly wins.
      var bBorder = isOpen ? color : (color + '80');
      var bBg     = isOpen
        ? ('linear-gradient(135deg,' + color + '40,' + color + '17)')
        : ('linear-gradient(160deg,' + color + '24,rgba(9,13,26,0.74) 72%)');
      var bShadow = isOpen
        ? ('0 0 0 1.5px ' + color + '8c,0 0 24px ' + color + '33,0 10px 24px rgba(0,0,0,0.44)')
        : ('0 3px 12px rgba(0,0,0,0.42),inset 0 0 0 1px ' + color + '2b,inset 0 1px 0 rgba(255,255,255,0.06)');
      return '<button type="button" id="vh-level-btn-' + levelKey + '" data-color="' + color + '" aria-expanded="' + (isOpen ? 'true' : 'false') + '" onclick="window._vhToggleLevel(\'' + levelKey + '\')" ' +
        'style="flex:1 1 10.5rem;min-width:9rem;display:flex;align-items:center;gap:0.5rem;text-align:left;border:1px solid ' + bBorder + ';background:' + bBg + ';box-shadow:' + bShadow + ';border-radius:0.8rem;padding:0.65rem 0.75rem;cursor:pointer;min-height:58px;transition:transform .14s,border-color .15s,background .15s,box-shadow .18s;" ' +
        'onmouseover="this.style.transform=\'translateY(-2px)\'" onmouseout="this.style.transform=\'\'">' +
        '<span style="width:0.68rem;height:0.68rem;border-radius:50%;background:' + color + ';box-shadow:0 0 11px ' + color + ',0 0 0 3px ' + color + '2b;flex-shrink:0;"></span>' +
        '<span style="min-width:0;flex:1;display:flex;flex-direction:column;gap:0.16rem;">' +
          '<span style="display:flex;align-items:center;gap:0.4rem;">' +
            '<span style="font-family:\'Barlow Condensed\',sans-serif;font-weight:800;font-size:0.9rem;letter-spacing:0.03em;text-transform:uppercase;color:#fff;line-height:1;white-space:nowrap;">' + label + '</span>' +
            distChip +
          '</span>' +
          '<span style="font-family:\'Barlow Condensed\',sans-serif;font-size:0.72rem;color:#9fb4d4;line-height:1.1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + _distTxt(statusText) + '</span>' +
        '</span>' +
        '<span class="vh-lv-chev" style="font-size:0.72rem;color:#9fb4d4;flex-shrink:0;">' + (isOpen ? '▲' : '▼') + '</span>' +
      '</button>';
    }

    // One expandable level panel: a light one-line seat summary, the compact
    // officeholder rows, and the "See all candidates for this level" bridge into
    // Relevant to Me. When no officeholder resolves (only expected for seats we
    // don't yet curate), it states that plainly instead of implying a name is
    // moments away — and still points the voter straight to the full field.
    function levelPanel(levelKey, color, isOpen, pids, distVal, raceKey, shortTitle, summary, redistrict) {
      var distNum = distVal ? String(distVal).replace(/[^0-9]/g, '') : '';
      var rd = (redistrict && redistrict.changed) ? redistrict : null;
      var rows = '';
      if (rd) {
        // Redistricted U.S. House seat: the officeholder row names the member who
        // represents this voter under the CURRENT map (their prior district's
        // incumbent), tagged with his real current district — never the new 2026
        // ballot-district number. When no current officeholder resolves we fall
        // through to the honest placeholder below rather than invent a name.
        if (rd.currentPid) {
          rows += holderRow(rd.currentPid, color, shortTitle, rd.currentDistrict, raceKey,
            { eyebrow: 'Represents you now', hideAdd: true });
        }
      } else {
        for (var i = 0; i < pids.length; i++) rows += holderRow(pids[i], color, shortTitle, distNum, raceKey);
      }
      var body = rows ||
        ('<div style="display:flex;align-items:center;gap:0.6rem;background:rgba(255,255,255,0.035);border:1px solid rgba(148,163,184,0.18);border-radius:0.6rem;padding:0.55rem 0.62rem;margin-top:0.4rem;">' +
          _distAvatar(null, null, color) +
          '<div style="min-width:0;flex:1;">' +
            '<div style="font-family:\'Barlow Condensed\',sans-serif;font-weight:700;font-size:0.84rem;color:#cdd9ec;line-height:1.2;">' + _distTxt(shortTitle) + (distNum ? ' · District ' + distNum : '') + '</div>' +
            '<div style="font-family:\'Barlow Condensed\',sans-serif;font-size:0.72rem;color:#9fb4d4;line-height:1.28;margin-top:0.14rem;">We don’t have this seat’s current officeholder on file yet. See everyone running below.</div>' +
          '</div>' +
        '</div>');
      var summaryLine = summary
        ? '<div style="font-family:\'Barlow Condensed\',sans-serif;font-size:0.8rem;font-weight:600;letter-spacing:0.01em;color:#c6d5ee;line-height:1.34;margin:0.15rem 0 0.1rem;">' + _distTxt(summary) + '</div>'
        : '';
      // Redistricting explainer: a calm, neutral banner naming the district move,
      // shown ABOVE the current officeholder so the "who represents me now" row is
      // read in context. Kept factual and unalarming — it states the change, not a
      // warning. (2026 ballot line comes after the officeholder, below.)
      var rdBanner = rd
        ? ('<div style="display:flex;align-items:flex-start;gap:0.5rem;background:linear-gradient(135deg,rgba(251,191,36,0.14),rgba(251,191,36,0.05));border:1px solid rgba(251,191,36,0.42);border-radius:0.6rem;padding:0.5rem 0.6rem;margin-top:0.4rem;">' +
            '<span style="font-size:0.95rem;line-height:1.2;flex-shrink:0;">⚖️</span>' +
            '<div style="font-family:\'Barlow Condensed\',sans-serif;font-size:0.76rem;color:#f2dca0;line-height:1.34;">' +
              '<strong style="color:#fde68a;">New U.S. House district for 2026.</strong> Utah’s court-ordered map moved your area from District ' + rd.currentDistrict + ' into District ' + rd.ballotDistrict + '. Below is who represents you now — and the district you’ll actually vote in this year.' +
            '</div>' +
          '</div>')
        : '';
      // The forward-looking half of the split: the district on the 2026 ballot,
      // pointing straight at the real field via the same "See all candidates"
      // bridge. Placed right below the current officeholder so the two read as one
      // clear "now vs. 2026" pair.
      var rd2026 = rd
        ? ('<div style="display:flex;align-items:center;gap:0.5rem;background:radial-gradient(120% 100% at 0% 0%,' + color + '20,transparent 62%),linear-gradient(135deg,' + color + '14,rgba(255,255,255,0.02));border:1px solid ' + color + '3d;border-radius:0.6rem;padding:0.5rem 0.6rem;margin-top:0.4rem;">' +
            '<span style="font-size:0.95rem;line-height:1.2;flex-shrink:0;">🗳️</span>' +
            '<div style="min-width:0;flex:1;">' +
              '<div style="display:flex;align-items:center;gap:0.28rem;font-family:\'Barlow Condensed\',sans-serif;font-size:0.58rem;font-weight:700;letter-spacing:0.09em;text-transform:uppercase;color:' + color + ';line-height:1;">Your 2026 ballot district</div>' +
              '<div style="font-family:\'Barlow Condensed\',sans-serif;font-size:0.82rem;color:#dbe6f7;line-height:1.28;margin-top:0.12rem;">You vote in the new <strong style="color:#fff;">District ' + rd.ballotDistrict + '</strong> this year — see who’s running below.</div>' +
            '</div>' +
          '</div>')
        : '';
      var seeAll = '<button type="button" onclick="window.jumpToRelevantAccordion(\'' + raceKey + '\')" style="' + _seeAllBtn + '" onmouseover="this.style.transform=\'translateY(-1px)\';this.style.background=\'linear-gradient(135deg,rgba(59,130,246,0.32),rgba(59,130,246,0.14))\'" onmouseout="this.style.transform=\'\';this.style.background=\'linear-gradient(135deg,rgba(59,130,246,0.2),rgba(59,130,246,0.08))\'">🔍 See all candidates for this level →</button>';
      return '<div id="vh-level-panel-' + levelKey + '" style="display:' + (isOpen ? 'block' : 'none') + ';margin-top:0.5rem;">' +
        summaryLine + rdBanner + body + rd2026 + seeAll +
      '</div>';
    }

    // Light status cue for a level button: the current holder's name for a single
    // seat, a count for Local, or a plain "See who's running" prompt on the rare
    // seat with no officeholder on file.
    function _levelStatus(inc, single) {
      var n = (inc && inc.pids) ? inc.pids.length : 0;
      if (!n) return 'See who’s running';
      if (single) {
        var p = (typeof window._pdxPersonById === 'function') ? window._pdxPersonById(inc.pids[0]) : null;
        return (p && p.name) ? p.name : '1 in office';
      }
      return n + (n === 1 ? ' officeholder' : ' officeholders');
    }

    // Plain-language, one-line description of each seat, built from the resolved
    // district numbers / area so every card carries useful, human context even
    // before its officeholder is confirmed. Keeps the strip feeling like the
    // "current reality / educational" layer.
    function _seatSummary(rk, distVal) {
      var n = distVal ? String(distVal).replace(/[^0-9]/g, '') : '';
      var where = (matched && krd && krd.label)
        ? krd.label
        : (loc.county || loc.city || (state && state !== 'National' ? state : ''));
      if (rk === 'house')       return n ? 'Your U.S. Representative for District ' + n : 'Your voice in the U.S. House of Representatives';
      if (rk === 'statesenate') return n ? 'Your State Senator for District ' + n : ('Your State Senator' + (where ? ' representing ' + where : ''));
      if (rk === 'statehouse')  return n ? 'Your State Representative for District ' + n : ('Your representative in the ' + (state || 'state') + ' House');
      if (rk === 'local')       return 'Your mayor, city council, school board & county seats';
      return '';
    }

    // Assemble the four levels into the always-visible button row + expandable
    // panels wired as a single-open accordion. U.S. House starts expanded by
    // default so the directory is never visually empty and gives immediate value
    // on load; the other three start collapsed and open one-at-a-time as the voter
    // clicks them (opening one collapses whichever was open — see _vhToggleLevel).
    var _vhLevels = [
      { key: 'house',       color: '#60a5fa', label: 'U.S. House',   short: 'U.S. Representative', dist: house,  race: 'house',       inc: houseInc,  single: true },
      { key: 'statesenate', color: '#a78bfa', label: 'State Senate', short: 'State Senator',       dist: senate, race: 'statesenate', inc: senateInc, single: true },
      { key: 'statehouse',  color: '#2dd4bf', label: 'State House',  short: 'State Representative', dist: lower,  race: 'statehouse',  inc: lowerInc,  single: true },
      { key: 'local',       color: '#fbbf24', label: 'Local',        short: 'Local Official',      dist: null,   race: 'local',       inc: localInc,  single: false }
    ];
    var _vhOpenLevel = 'house';
    var _vhRow = '', _vhPanels = '';
    for (var _li = 0; _li < _vhLevels.length; _li++) {
      var _L = _vhLevels[_li];
      var _isOpen = (_L.key === _vhOpenLevel);
      // U.S. House is the only level that can be redistricted for 2026. When it is,
      // the button status reads "Now: <current rep>" (paired with the ballot-district
      // chip) and the summary names the now-vs-2026 split; the panel carries the full
      // banner. Every other level renders exactly as before.
      var _rd = (_L.key === 'house') ? houseRedistrict : null;
      var _status = (_rd && _rd.changed && _L.inc.pids && _L.inc.pids.length)
        ? ('Now: ' + _levelStatus(_L.inc, _L.single))
        : _levelStatus(_L.inc, _L.single);
      var _summary = (_rd && _rd.changed)
        ? ('Redrawn for 2026 — who represents you now, and the new District ' + _rd.ballotDistrict + ' on your ballot.')
        : _seatSummary(_L.race, _L.dist);
      _vhRow    += levelButton(_L.key, _L.color, _L.label, _L.dist, _status, _isOpen);
      _vhPanels += levelPanel(_L.key, _L.color, _isOpen, (_L.inc.pids || []), _L.dist, _L.race, _L.short, _summary, _rd);
    }
    var directoryHtml =
      '<div style="display:flex;flex-wrap:wrap;gap:0.5rem;">' + _vhRow + '</div>' +
      _vhPanels;

    var allKnown = house && senate && lower;

    // Explicit "these are my three races" line near the top of the section — a
    // single scannable row of colored chips so the voter instantly sees the exact
    // U.S. House, State Senate and State House districts they vote in, before they
    // even read the cards. Mirrors the card accent colors so the link is obvious.
    var _scNum = function(v) { return String(v == null ? '' : v).replace(/[^0-9]/g, ''); };
    function _sumChip(label, num, color) {
      return '<span style="display:inline-flex;align-items:center;gap:0.32rem;font-family:\'Barlow Condensed\',sans-serif;font-size:0.74rem;font-weight:700;letter-spacing:0.02em;color:#e2e8f0;background:' + color + '1f;border:1px solid ' + color + '59;border-radius:999px;padding:0.18rem 0.6rem;white-space:nowrap;">' +
        '<span style="width:0.42rem;height:0.42rem;border-radius:50%;background:' + color + ';box-shadow:0 0 7px ' + color + ';"></span>' +
        label + ' <strong style="color:#fff;">' + num + '</strong></span>';
    }
    var summaryRow = '';
    if (house || senate || lower) {
      var _scChips = [];
      if (house)  _scChips.push(_sumChip('U.S. House',   _scNum(house),  '#60a5fa'));
      if (senate) _scChips.push(_sumChip('State Senate', _scNum(senate), '#a78bfa'));
      if (lower)  _scChips.push(_sumChip('State House',  _scNum(lower),  '#2dd4bf'));
      summaryRow =
        '<div style="display:flex;flex-wrap:wrap;align-items:center;gap:0.4rem;margin:-0.2rem 0 0.75rem;">' +
          '<span style="font-family:\'Barlow Condensed\',sans-serif;font-size:0.7rem;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#7e93b4;">You vote in</span>' +
          _scChips.join('') +
        '</div>';
    }

    var guidance = allKnown
      ? 'These are <strong style="color:#fff;">your</strong> seats — they decide your taxes, schools, roads and local laws. Here\'s who holds them and who\'s running in 2026.'
      : 'Pick your city in <button type="button" onclick="_pdxGoSetLocation()" style="background:none;border:none;padding:0;cursor:pointer;font:inherit;color:#93c5fd;text-decoration:underline;">Change Location</button> and we\'ll fill in every district seat automatically.';

    // Prominent, inviting map trigger — the primary "do this next" action for the
    // location card. Full-width, two-line label + map cue, with clear hover/tap states.
    var mapTrigger =
      '<button type="button" onclick="window.openDistrictMapModal&&window.openDistrictMapModal()" ' +
        'style="flex:2 1 16rem;display:flex;align-items:center;gap:0.85rem;text-align:left;background:linear-gradient(135deg,rgba(21,128,61,0.92),rgba(14,116,144,0.92));border:1px solid rgba(45,212,191,0.55);border-radius:0.9rem;padding:0.7rem 0.95rem;cursor:pointer;min-height:56px;transition:transform .15s,box-shadow .15s,filter .15s;box-shadow:0 4px 18px rgba(14,116,144,0.28);" ' +
        'onmouseover="this.style.transform=\'translateY(-2px)\';this.style.boxShadow=\'0 9px 26px rgba(14,116,144,0.5)\';this.style.filter=\'brightness(1.08)\'" onmouseout="this.style.transform=\'\';this.style.boxShadow=\'0 4px 18px rgba(14,116,144,0.28)\';this.style.filter=\'\'" ' +
        'onmousedown="this.style.transform=\'translateY(0) scale(0.99)\'" onmouseup="this.style.transform=\'translateY(-2px)\'">' +
        '<span style="font-size:1.55rem;line-height:1;flex-shrink:0;">🗺️</span>' +
        '<span style="display:flex;flex-direction:column;gap:0.15rem;flex:1;min-width:0;">' +
          '<span style="font-family:\'Bebas Neue\',sans-serif;font-size:1.05rem;letter-spacing:0.04em;color:#fff;line-height:1.05;">View or change your districts on the map</span>' +
          '<span style="font-family:\'Barlow Condensed\',sans-serif;font-size:0.76rem;letter-spacing:0.02em;color:rgba(255,255,255,0.82);line-height:1.15;">See exactly where your district lines fall — and adjust if needed</span>' +
        '</span>' +
        '<span style="font-size:1.1rem;color:#fff;flex-shrink:0;">→</span>' +
      '</button>';

    // ── Other races on the ballot (Statewide · Federal) ───────────────────────
    // The strip stays laser-focused on the voter's three LOCAL district seats, but
    // a real ballot also has statewide and federal offices. Rather than crowd those
    // in (which would dilute the local focus), they live in two collapsed
    // disclosures below the local cards: a gentle, scannable reminder that the rest
    // of the ballot exists, each row one tap from the full field for that seat.
    var _otherToggle = 'flex:1 1 13rem;display:flex;align-items:center;gap:0.55rem;text-align:left;background:rgba(10,15,30,0.5);border:1px solid rgba(148,163,184,0.28);border-radius:0.7rem;padding:0.6rem 0.8rem;cursor:pointer;min-height:48px;transition:transform .12s,border-color .15s,background .15s;';
    function _otherRaceRow(icon, color, title, sub, key) {
      return '<button type="button" onclick="window.jumpToRelevantAccordion(\'' + key + '\')" ' +
        'style="display:flex;align-items:center;gap:0.6rem;width:100%;text-align:left;background:rgba(255,255,255,0.03);border:1px solid ' + color + '33;border-left:3px solid ' + color + ';border-radius:0.55rem;padding:0.5rem 0.6rem;margin-top:0.4rem;cursor:pointer;min-height:46px;transition:transform .12s,background .15s,border-color .15s;" ' +
        'onmouseover="this.style.transform=\'translateX(2px)\';this.style.background=\'rgba(255,255,255,0.06)\';this.style.borderColor=\'' + color + '80\'" onmouseout="this.style.transform=\'\';this.style.background=\'rgba(255,255,255,0.03)\';this.style.borderColor=\'' + color + '33\'">' +
        '<span style="font-size:1.05rem;line-height:1;flex-shrink:0;">' + icon + '</span>' +
        '<span style="min-width:0;flex:1;">' +
          '<span style="display:block;font-family:\'Barlow Condensed\',sans-serif;font-weight:700;font-size:0.86rem;color:#e2e8f0;line-height:1.15;">' + title + '</span>' +
          '<span style="display:block;font-family:\'Barlow Condensed\',sans-serif;font-size:0.7rem;color:#9fb4d4;line-height:1.2;margin-top:0.05rem;">' + sub + '</span>' +
        '</span>' +
        '<span style="font-family:\'Barlow Condensed\',sans-serif;font-weight:700;font-size:0.66rem;letter-spacing:0.04em;text-transform:uppercase;color:' + color + ';flex-shrink:0;white-space:nowrap;">See field →</span>' +
      '</button>';
    }
    var _stState = _distTxt(state);
    var statewidePanel =
      '<div id="vh-statewide-panel" style="display:none;margin-top:0.5rem;">' +
        '<div style="font-family:\'Barlow Condensed\',sans-serif;font-size:0.72rem;color:#9fb4d4;line-height:1.35;margin-bottom:0.1rem;">Every ' + _stState + ' voter helps choose these — they run the whole state.</div>' +
        _otherRaceRow('\u{1F985}', '#34d399', 'Governor', _stState + '’s chief executive', 'governor') +
        _otherRaceRow('\u{1F3DB}️', '#5eead4', 'Lt. Governor', 'Runs alongside the Governor', 'ltgovernor') +
        _otherRaceRow('⚖️', '#a78bfa', 'Attorney General', 'The state’s top law officer', 'attorneygeneral') +
        _otherRaceRow('\u{1F4B0}', '#fbbf24', 'Treasurer &amp; Auditor', 'Watch over the state’s money', 'attorneygeneral') +
      '</div>';
    var federalPanel =
      '<div id="vh-federal-panel" style="display:none;margin-top:0.5rem;">' +
        '<div style="font-family:\'Barlow Condensed\',sans-serif;font-size:0.72rem;color:#9fb4d4;line-height:1.35;margin-bottom:0.1rem;">Federal seats on your ballot — they shape national law.</div>' +
        _otherRaceRow('\u{1F3DB}️', '#818cf8', 'U.S. Senate', _stState + '’s two U.S. Senators', 'senate') +
        _otherRaceRow('\u{1F985}', '#ef4444', 'U.S. President', 'Head of the executive branch', 'president') +
      '</div>';
    var otherRaces =
      '<div style="margin-top:0.9rem;padding-top:0.85rem;border-top:1px dashed rgba(148,163,184,0.22);">' +
        '<div style="display:flex;align-items:center;gap:0.4rem;margin-bottom:0.5rem;font-family:\'Barlow Condensed\',sans-serif;font-size:0.66rem;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#7e93b4;">' +
          '<span aria-hidden="true">↓</span><span>Also on your ballot — beyond your local districts</span>' +
        '</div>' +
        '<div style="display:flex;flex-wrap:wrap;gap:0.5rem;">' +
          '<button type="button" aria-expanded="false" onclick="window._vhToggleRacePanel(this,\'vh-statewide-panel\')" style="' + _otherToggle + '" onmouseover="this.style.transform=\'translateY(-1px)\';this.style.borderColor=\'rgba(52,211,153,0.5)\'" onmouseout="this.style.transform=\'\';this.style.borderColor=\'rgba(148,163,184,0.28)\'">' +
            '<span style="font-size:1.2rem;line-height:1;flex-shrink:0;">\u{1F3DB}️</span>' +
            '<span style="min-width:0;flex:1;"><span style="display:block;font-family:\'Bebas Neue\',sans-serif;letter-spacing:0.04em;font-size:0.98rem;color:#fff;line-height:1.05;">Statewide Races</span><span style="display:block;font-family:\'Barlow Condensed\',sans-serif;font-size:0.7rem;color:#9fb4d4;line-height:1.15;">Governor, Attorney General &amp; more</span></span>' +
            '<span class="vh-bx-chev" style="font-size:0.7rem;color:#9fb4d4;flex-shrink:0;">▼</span>' +
          '</button>' +
          '<button type="button" aria-expanded="false" onclick="window._vhToggleRacePanel(this,\'vh-federal-panel\')" style="' + _otherToggle + '" onmouseover="this.style.transform=\'translateY(-1px)\';this.style.borderColor=\'rgba(129,140,248,0.5)\'" onmouseout="this.style.transform=\'\';this.style.borderColor=\'rgba(148,163,184,0.28)\'">' +
            '<span style="font-size:1.2rem;line-height:1;flex-shrink:0;">\u{1F1FA}\u{1F1F8}</span>' +
            '<span style="min-width:0;flex:1;"><span style="display:block;font-family:\'Bebas Neue\',sans-serif;letter-spacing:0.04em;font-size:0.98rem;color:#fff;line-height:1.05;">Federal Races</span><span style="display:block;font-family:\'Barlow Condensed\',sans-serif;font-size:0.7rem;color:#9fb4d4;line-height:1.15;">U.S. Senate &amp; President</span></span>' +
            '<span class="vh-bx-chev" style="font-size:0.7rem;color:#9fb4d4;flex-shrink:0;">▼</span>' +
          '</button>' +
        '</div>' +
        statewidePanel +
        federalPanel +
      '</div>';

    host.innerHTML =
      '<div style="background:linear-gradient(135deg,rgba(30,58,138,0.22),rgba(10,15,30,0.4));border:1px solid rgba(59,130,246,0.32);border-radius:1rem;padding:0.95rem 1rem;">' +
        '<div style="display:flex;align-items:baseline;gap:0.55rem;flex-wrap:wrap;margin-bottom:0.4rem;">' +
          '<span style="font-family:\'Bebas Neue\',sans-serif;letter-spacing:0.06em;font-size:1.05rem;color:#fff;">📍 Your Voting Districts</span>' +
          '<span style="font-family:\'Barlow Condensed\',sans-serif;font-size:0.74rem;letter-spacing:0.03em;color:#9fb4d4;">' + areaLabel + '</span>' +
        '</div>' +
        // Transparency: make it explicit these seats come from the precise location /
        // boundary maps, not a blanket county assumption — the core trust message.
        '<div style="display:flex;align-items:center;gap:0.4rem;margin-bottom:0.7rem;font-family:\'Barlow Condensed\',sans-serif;font-size:0.72rem;letter-spacing:0.02em;color:#7ee7b8;line-height:1.3;">' +
          '<span style="flex-shrink:0;">📐</span><span>Based on your <strong style="color:#a7f3d0;">precise location</strong> on the official district maps — not your county.</span>' +
        '</div>' +
        summaryRow +
        directoryHtml +
        '<div style="font-family:\'Barlow Condensed\',sans-serif;font-size:0.85rem;letter-spacing:0.01em;color:#aebfd8;line-height:1.4;margin-top:0.8rem;">' + guidance + '</div>' +
        '<div style="display:flex;align-items:stretch;gap:0.6rem;flex-wrap:wrap;margin-top:0.8rem;">' +
          mapTrigger +
          '<button type="button" onclick="window.jumpToRelevantAccordion(\'house\')" style="flex:1 1 11rem;display:flex;align-items:center;justify-content:center;' + btnLink + '" onmouseover="this.style.transform=\'translateY(-1px)\'" onmouseout="this.style.transform=\'\'">⭐ See who represents me →</button>' +
        '</div>' +
        otherRaces +
      '</div>';
  };

  // ── Live "Your Path" tracker ───────────────────────────────────────────────
  // The connective spine that sits at the top of the Voter Hub. It mirrors the
  // real state of the visitor's journey — Set location → See your districts →
  // Build your team — marking each milestone done ✓ as it's reached and pointing
  // a single clear "do this now" action at the current step. It reads the same
  // globals the rest of the builder uses (window._hasUserLocation, the saved
  // team count) so it can never drift out of sync, and is refreshed from both the
  // location hook (_vhSyncBanner) and the team hook (_renderTeamNextStep).
  window._vhSyncPathSteps = function() {
    var host = document.getElementById('vh-path-steps');
    if (!host) return;

    var locDone = !!window._hasUserLocation;
    var filled  = Math.max(0, window._myteamFilledCount || 0);
    // Match the builder's live seat total (fixed offices + the voter's real local
    // seats) so the "Your Path" spine counts the same ballot the team builder does.
    var total   = (typeof window._myteamSeatTotal === 'number' && window._myteamSeatTotal > 0)
      ? window._myteamSeatTotal
      : ((window.TEAM_POSITIONS && window.TEAM_POSITIONS.length) || 6);
    var districtsDone = locDone && filled >= 1;   // "done" once they've engaged a race
    var teamDone      = locDone && filled >= total;
    var remaining     = Math.max(0, total - filled);

    var steps = [
      { n: 1, ico: '📍', title: 'Set your location', done: locDone,
        desc: locDone
          ? 'Locked in — your real ballot is loaded below.'
          : 'Tell us where you vote and we\'ll pull <strong>your real ballot</strong> — the exact races you\'ll decide.',
        cta: 'Set location →',
        act: 'window.toggleChangeLocation&&window.toggleChangeLocation()' },
      { n: 2, ico: '🗺️', title: 'See your districts', done: districtsDone,
        desc: 'Your <strong>U.S. House, State Senate &amp; State House</strong> seats — and exactly who represents you in each.',
        cta: 'See who represents me →',
        act: "var e=document.getElementById('my-politicians');if(e)e.scrollIntoView({behavior:'smooth',block:'start'})" },
      { n: 3, ico: '⭐', title: 'Work your ballot', done: teamDone,
        desc: teamDone
          ? 'All <strong>' + total + '</strong> seats filled with people who share your values.'
          : (filled >= 1
              ? '<strong>' + filled + '/' + total + '</strong> picked — <strong>' + remaining + '</strong> to go. One pick per office, swap anytime.'
              : 'Add the person who earns each seat. Your slate <strong>saves automatically</strong> for election day.'),
        cta: filled >= 1 ? 'Keep building →' : 'Start picking →',
        act: 'window._myteamGuideGo&&window._myteamGuideGo(\'pick\')' }
    ];

    var activeAssigned = false;
    host.innerHTML = steps.map(function(s) {
      var state, statusTxt;
      if (s.done) { state = 'is-done'; statusTxt = '✓ Done'; }
      else if (!activeAssigned) { state = 'is-active'; statusTxt = '▶ Do this now'; activeAssigned = true; }
      else { state = 'is-todo'; statusTxt = 'Up next'; }
      var cta = state === 'is-active'
        ? '<button type="button" class="vh-step-cta" onclick="event.stopPropagation();' + s.act + '">' + s.cta + '</button>'
        : '';
      return '<div class="vh-step is-clickable ' + state + '" onclick="' + s.act + '">' +
          '<span class="vh-step-status">' + statusTxt + '</span>' +
          '<span class="vh-step-n">' + (s.done ? '✓' : s.n) + '</span>' +
          '<span class="vh-step-ico">' + s.ico + '</span>' +
          '<div class="vh-step-t">' + s.title + '</div>' +
          '<p class="vh-step-d">' + s.desc + '</p>' +
          cta +
        '</div>';
    }).join('');
  };

  window._updateTeamPositionsForLocation = function() {
    var state = window._currentVoterLocation.state;
    var county = window._currentVoterLocation.county;
    
    if (state === 'Utah') {
      // 6 ballot slots for this state (for now). Other states define
      // their own slate below, so the per-state count stays fully extensible.
      window.TEAM_POSITIONS = [
        { key: 'senate', label: 'U.S. Senate', icon: '\u{1F3DB}', color: '#818cf8', emptyIcon: '\u{1F3DB}' },
        { key: 'house', label: 'U.S. House', icon: '\u{1F3DB}', color: '#60a5fa', emptyIcon: '\u{1F3DB}' },
        { key: 'governor', label: 'Governor', icon: '\u{1F985}', color: '#34d399', emptyIcon: '\u{1F985}' },
        { key: 'statesenate', label: 'State Senate', icon: '\u{1F3DB}', color: '#a78bfa', emptyIcon: '\u{1F3DB}' },
        { key: 'statehouse', label: 'State House Rep', icon: '\u{1F3DB}', color: '#2dd4bf', emptyIcon: '\u{1F3DB}' },
        { key: 'local', label: 'Local Office', icon: '\u{1F3D9}', color: '#fbbf24', emptyIcon: '\u{1F3D9}' }
      ];
    } else if (state === 'Florida') {
      window.TEAM_POSITIONS = [
        { key: 'president', label: 'U.S. President', icon: '\u{1F985}', color: '#ef4444', emptyIcon: '\u{1F985}' },
        { key: 'senate', label: 'U.S. Senate', icon: '\u{1F3DB}', color: '#818cf8', emptyIcon: '\u{1F3DB}' },
        { key: 'house', label: 'U.S. House', icon: '\u{1F3DB}', color: '#60a5fa', emptyIcon: '\u{1F3DB}' },
        { key: 'governor', label: 'Governor', icon: '\u{1F985}', color: '#34d399', emptyIcon: '\u{1F985}' },
        { key: 'statesenate', label: 'State Senate', icon: '\u{1F3DB}', color: '#a78bfa', emptyIcon: '\u{1F3DB}' },
        { key: 'statehouse', label: 'State House Rep', icon: '\u{1F3DB}', color: '#2dd4bf', emptyIcon: '\u{1F3DB}' },
        { key: 'attorneygeneral', label: 'Attorney General', icon: '\u{2696}', color: '#f43f5e', emptyIcon: '\u{2696}' },
        { key: 'chiefjustice', label: 'Supreme Court Justice', icon: '\u{2696}', color: '#8b5cf6', emptyIcon: '\u{2696}' },
        { key: 'local', label: 'Local Office', icon: '\u{1F3D9}', color: '#fbbf24', emptyIcon: '\u{1F3D9}' }
      ];
    } else if (state === 'Kentucky') {
      window.TEAM_POSITIONS = [
        { key: 'senate', label: 'U.S. Senate', icon: '\u{1F3DB}', color: '#818cf8', emptyIcon: '\u{1F3DB}' },
        { key: 'house', label: 'U.S. House', icon: '\u{1F3DB}', color: '#60a5fa', emptyIcon: '\u{1F3DB}' },
        { key: 'governor', label: 'Governor', icon: '\u{1F985}', color: '#34d399', emptyIcon: '\u{1F985}' },
        { key: 'statesenate', label: 'State Senate', icon: '\u{1F3DB}', color: '#a78bfa', emptyIcon: '\u{1F3DB}' },
        { key: 'statehouse', label: 'State House Rep', icon: '\u{1F3DB}', color: '#2dd4bf', emptyIcon: '\u{1F3DB}' },
        { key: 'secretaryofstate', label: 'Secretary of State', icon: '\u{1F4DC}', color: '#06b6d4', emptyIcon: '\u{1F4DC}' },
        { key: 'attorneygeneral', label: 'Attorney General', icon: '\u{2696}', color: '#f43f5e', emptyIcon: '\u{2696}' },
        { key: 'local', label: 'Local Office', icon: '\u{1F3D9}', color: '#fbbf24', emptyIcon: '\u{1F3D9}' }
      ];
    } else if (state === 'Colorado') {
      window.TEAM_POSITIONS = [
        { key: 'senate', label: 'U.S. Senate', icon: '\u{1F3DB}', color: '#818cf8', emptyIcon: '\u{1F3DB}' },
        { key: 'house', label: 'U.S. House', icon: '\u{1F3DB}', color: '#60a5fa', emptyIcon: '\u{1F3DB}' },
        { key: 'governor', label: 'Governor', icon: '\u{1F985}', color: '#34d399', emptyIcon: '\u{1F985}' },
        { key: 'statesenate', label: 'State Senate', icon: '\u{1F3DB}', color: '#a78bfa', emptyIcon: '\u{1F3DB}' },
        { key: 'statehouse', label: 'State House Rep', icon: '\u{1F3DB}', color: '#2dd4bf', emptyIcon: '\u{1F3DB}' },
        { key: 'secstate', label: 'Secretary of State', icon: '\u{1F4DC}', color: '#06b6d4', emptyIcon: '\u{1F4DC}' },
        { key: 'local', label: 'Local Office', icon: '\u{1F3D9}', color: '#fbbf24', emptyIcon: '\u{1F3D9}' }
      ];
    } else if (state === 'Georgia') {
      window.TEAM_POSITIONS = [
        { key: 'senate', label: 'U.S. Senate', icon: '\u{1F3DB}', color: '#818cf8', emptyIcon: '\u{1F3DB}' },
        { key: 'house', label: 'U.S. House', icon: '\u{1F3DB}', color: '#60a5fa', emptyIcon: '\u{1F3DB}' },
        { key: 'governor', label: 'Governor', icon: '\u{1F985}', color: '#34d399', emptyIcon: '\u{1F985}' },
        { key: 'statesenate', label: 'State Senate', icon: '\u{1F3DB}', color: '#a78bfa', emptyIcon: '\u{1F3DB}' },
        { key: 'statehouse', label: 'State House Rep', icon: '\u{1F3DB}', color: '#2dd4bf', emptyIcon: '\u{1F3DB}' },
        { key: 'ltgovernor', label: 'Lt. Governor', icon: '\u{1F985}', color: '#10b981', emptyIcon: '\u{1F985}' },
        { key: 'secstate', label: 'Secretary of State', icon: '\u{1F4DC}', color: '#06b6d4', emptyIcon: '\u{1F4DC}' },
        { key: 'local', label: 'Local Office', icon: '\u{1F3D9}', color: '#fbbf24', emptyIcon: '\u{1F3D9}' }
      ];
    } else if (state === 'Vermont') {
      window.TEAM_POSITIONS = [
        { key: 'senate', label: 'U.S. Senate', icon: '\u{1F3DB}', color: '#818cf8', emptyIcon: '\u{1F3DB}' },
        { key: 'house', label: 'U.S. House', icon: '\u{1F3DB}', color: '#60a5fa', emptyIcon: '\u{1F3DB}' },
        { key: 'governor', label: 'Governor', icon: '\u{1F985}', color: '#34d399', emptyIcon: '\u{1F985}' },
        { key: 'local', label: 'Local Office', icon: '\u{1F3D9}', color: '#fbbf24', emptyIcon: '\u{1F3D9}' }
      ];
    } else if (state === 'National') {
      window.TEAM_POSITIONS = [
        { key: 'president', label: 'U.S. President', icon: '\u{1F985}', color: '#ef4444', emptyIcon: '\u{1F985}' },
        { key: 'secstate', label: 'Secretary of State', icon: '\u{1F4DC}', color: '#06b6d4', emptyIcon: '\u{1F4DC}' },
        { key: 'defense', label: 'Secretary of Defense', icon: '\u{1F6E1}', color: '#3b82f6', emptyIcon: '\u{1F6E1}' },
        { key: 'intel', label: 'Director of Nat. Intel.', icon: '\u{1F441}', color: '#a855f7', emptyIcon: '\u{1F441}' }
      ];
    } else {
      // Generic slate for any other U.S. state (and the un-located default) — the
      // standard set of offices every state elects. Keeps the ballot fully national.
      window.TEAM_POSITIONS = [
        { key: 'senate', label: 'U.S. Senate', icon: '\u{1F3DB}', color: '#818cf8', emptyIcon: '\u{1F3DB}' },
        { key: 'house', label: 'U.S. House', icon: '\u{1F3DB}', color: '#60a5fa', emptyIcon: '\u{1F3DB}' },
        { key: 'governor', label: 'Governor', icon: '\u{1F985}', color: '#34d399', emptyIcon: '\u{1F985}' },
        { key: 'statesenate', label: 'State Senate', icon: '\u{1F3DB}', color: '#a78bfa', emptyIcon: '\u{1F3DB}' },
        { key: 'statehouse', label: 'State House Rep', icon: '\u{1F3DB}', color: '#2dd4bf', emptyIcon: '\u{1F3DB}' },
        { key: 'local', label: 'Local Office', icon: '\u{1F3D9}', color: '#fbbf24', emptyIcon: '\u{1F3D9}' }
      ];
    }

    var subtextEl = document.getElementById('myteam-subtext');
    if (subtextEl) {
      var slotNames = window.TEAM_POSITIONS.map(function(pos) { return pos.label; }).join(', ');
      subtextEl.textContent = 'Your personal slate — the people who will actually make the decisions that affect you. Fill all ' + window.TEAM_POSITIONS.length + ' seats: ' + slotNames + '.';
    }

    // Keep the Build Your Team header counts in sync with the location's slate.
    var posCount = window.TEAM_POSITIONS.length;
    var introCountEl = document.getElementById('byt-intro-count');
    if (introCountEl) introCountEl.textContent = posCount;
    var slotsCountEl = document.getElementById('byt-slots-count');
    if (slotsCountEl) slotsCountEl.textContent = posCount;

    if (typeof window.updateMyTeamLocationText === 'function') window.updateMyTeamLocationText();

    // Repaint the My Voting Team builder so every seat-count readout — the header
    // badge (X/N), the picks meter (dots + "X of N"), the progress bar label and
    // the "Your N ballot slots" focus line — reflects THIS location's slate length
    // rather than the static "6" the markup ships with. The builder derives all of
    // those from TEAM_POSITIONS.length, so a single repaint keeps them honest for
    // states whose ballot has more or fewer offices (Florida 9, Vermont 4, …).
    try { if (typeof window._mypolBuildGrid === 'function') window._mypolBuildGrid(); } catch (e) {}
  };

  // Human-readable label for the user's saved voting location, e.g.
  // "Orange County, California" or "the United States" — reused by both section
  // headers. Derived entirely from the saved location, never a hardcoded place.
  window._voterLocationLabel = function() {
    // No saved location yet — keep the header neutral instead of defaulting to a city.
    if (!window._hasUserLocation) {
      return { place: 'your saved location', detail: 'Set your location' };
    }
    var loc = window._currentVoterLocation || { state: '', city: '', county: '', district: '' };
    var city = loc.city || loc.county || '';
    var state = loc.state || '';
    var display = [city, state].filter(Boolean).join(', ') || 'your saved location';
    var detail = loc.district ? 'District ' + loc.district : (state ? state + ' · Statewide' : 'Set your location');
    if (loc.state === 'National') {
      display = 'the United States';
      detail = 'National · Federal Executive';
    }
    return { place: display, detail: detail };
  };

  window.updateMyTeamLocationText = function() {
    var el = document.getElementById('myteam-location-text');
    if (!el) return;
    // No saved location yet — invite the user to set one instead of showing a city.
    if (!window._hasUserLocation) {
      el.innerHTML = 'Set Your Location to see your representatives — <button type="button" onclick="window.toggleChangeLocation()" style="background:none;border:none;padding:0;cursor:pointer;font:inherit;color:#fbbf24;text-decoration:underline;">choose location</button> to personalize your slate.';
      return;
    }
    var lbl = window._voterLocationLabel();
    el.innerHTML = '📍 Showing your ballot for <strong class="text-amber-200">' + lbl.place +
      '</strong> · <span class="text-amber-400/70">' + lbl.detail + '</span> · ' +
      window.TEAM_POSITIONS.length + ' ballot slots';
  };

  // ── Auto-detect voter state via browser geolocation (fallback only) ──
  // Fully national: approximate centroid for every U.S. state + DC. We pick the
  // nearest centroid to the device's coordinates. Lightweight, dependency-free,
  // and used ONLY as a best-guess starting state when the user has not saved one.
  window._STATE_CENTROIDS = [
    ['Alabama',32.8,-86.8],['Alaska',64.0,-152.0],['Arizona',34.3,-111.7],['Arkansas',34.9,-92.4],
    ['California',37.2,-119.6],['Colorado',39.0,-105.5],['Connecticut',41.6,-72.7],['Delaware',39.0,-75.5],
    ['Florida',28.6,-82.4],['Georgia',32.6,-83.4],['Hawaii',20.3,-156.4],['Idaho',44.4,-114.6],
    ['Illinois',40.0,-89.2],['Indiana',39.9,-86.3],['Iowa',42.0,-93.5],['Kansas',38.5,-98.4],
    ['Kentucky',37.5,-85.3],['Louisiana',31.0,-92.0],['Maine',45.4,-69.2],['Maryland',39.0,-76.8],
    ['Massachusetts',42.3,-71.8],['Michigan',44.3,-85.4],['Minnesota',46.3,-94.3],['Mississippi',32.7,-89.7],
    ['Missouri',38.4,-92.5],['Montana',47.0,-109.6],['Nebraska',41.5,-99.8],['Nevada',39.3,-116.6],
    ['New Hampshire',43.7,-71.6],['New Jersey',40.2,-74.7],['New Mexico',34.4,-106.1],['New York',42.9,-75.5],
    ['North Carolina',35.5,-79.4],['North Dakota',47.4,-100.5],['Ohio',40.3,-82.8],['Oklahoma',35.6,-97.5],
    ['Oregon',44.0,-120.6],['Pennsylvania',40.9,-77.8],['Rhode Island',41.7,-71.5],['South Carolina',33.9,-80.9],
    ['South Dakota',44.4,-100.2],['Tennessee',35.9,-86.4],['Texas',31.5,-99.3],['Utah',39.3,-111.7],
    ['Vermont',44.1,-72.7],['Virginia',37.5,-78.9],['Washington',47.4,-120.5],['West Virginia',38.6,-80.6],
    ['Wisconsin',44.6,-89.9],['Wyoming',43.0,-107.6],['District of Columbia',38.9,-77.0]
  ];
  window._stateFromCoords = function(lat, lng) {
    if (typeof lat !== 'number' || typeof lng !== 'number' || isNaN(lat) || isNaN(lng)) return null;
    var best = null, bestDist = Infinity;
    var arr = window._STATE_CENTROIDS;
    for (var i = 0; i < arr.length; i++) {
      var dLat = lat - arr[i][1];
      // Weight longitude by cos(lat) so degrees of lng shrink toward the poles,
      // giving a more honest "nearest state" across the continental U.S.
      var dLng = (lng - arr[i][2]) * Math.cos(lat * Math.PI / 180);
      var d = dLat * dLat + dLng * dLng;
      if (d < bestDist) { bestDist = d; best = arr[i][0]; }
    }
    // Reject points far outside the U.S. (e.g. ~> ~800km from any centroid).
    return bestDist <= 60 ? best : null;
  };

  // Apply a geolocation-detected state exactly the way an explicit picker change
  // would: set + persist the location, then refresh every location-aware view so
  // "Relevant to Me", "My Team" and the ballot all reflect the user's real area.
  window._applyDetectedLocation = function(loc, force) {
    if (!loc || !loc.state) return;
    if (window._hasUserLocation && !force) return;

    window._currentVoterLocation = {
      state: loc.state,
      city: loc.county || '',
      county: loc.county || '',
      district: loc.district || ''
    };
    window.saveVoterLocation();

    var stateSel = document.getElementById('voter-state-sel');
    if (stateSel) stateSel.value = loc.state;

    var countyInput = document.getElementById('voter-county-input');
    if (countyInput) countyInput.value = loc.county || '';

    var distSel = document.getElementById('voter-district-sel');
    if (distSel) distSel.value = loc.district || '';

    window._triggerLocationReaction();
  };

  // _applyDetectedState() USED TO LIVE HERE. It took a bare state name and
  // applied it as the reader's own location — the one line that let an inference
  // become a choice with no gesture behind it, and the IP path was its only
  // caller. Both are gone; the block over window.detectVoterLocation() below is
  // the whole reasoning. _applyDetectedLocation above is kept because the Detect
  // BUTTON calls it, with force, on a tap.

  // Helper for JSONP calls
  function getJSONP(url, callbackName, timeoutMs) {
    return new Promise(function(resolve, reject) {
      var timer = setTimeout(function() {
        cleanup();
        reject(new Error('JSONP timeout'));
      }, timeoutMs || 5000);

      function cleanup() {
        clearTimeout(timer);
        delete window[callbackName];
        if (script && script.parentNode) {
          script.parentNode.removeChild(script);
        }
      }

      window[callbackName] = function(data) {
        cleanup();
        resolve(data);
      };

      var script = document.createElement('script');
      script.src = url;
      script.onerror = function() {
        cleanup();
        reject(new Error('JSONP load error'));
      };
      document.body.appendChild(script);
    });
  }

  window._reverseGeocode = function(lat, lon) {
    // Prefer the actual 2026 congressional boundary over whatever a reverse geocoder
    // reports for a Utah point — the Census "Current" vintage still serves the prior
    // map (e.g. it returns District 1 for Layton, which the 2026 map places in 2). So
    // for a Utah location we override the reported district with the point-in-polygon
    // result; everywhere else we keep the geocoder's value.
    function _finish(resolve, state, county, district) {
      if (/utah/i.test(state || '') && typeof window._pdxCongressAt === 'function') {
        window._pdxCongressAt(lat, lon).then(function(b) {
          resolve({ state: state, county: county, district: (b != null ? String(b) : district) });
        }).catch(function() {
          resolve({ state: state, county: county, district: district });
        });
      } else {
        resolve({ state: state, county: county, district: district });
      }
    }
    return new Promise(function(resolve, reject) {
      // 1. Try Census API via JSONP
      var cbName = 'census_cb_' + Math.floor(Math.random() * 1000000);
      var url = 'https://geocoding.geo.census.gov/geocoder/geographies/coordinates?x=' + lon + '&y=' + lat + '&benchmark=Public_AR_Current&vintage=Current_Current&format=jsonp&callback=' + cbName;
      
      getJSONP(url, cbName, 6000)
        .then(function(data) {
          var state = '';
          var county = '';
          var district = '';
          if (data && data.result && data.result.geographies) {
            var geos = data.result.geographies;
            
            for (var k in geos) {
              var kl = k.toLowerCase();
              if (kl === 'states' && geos[k].length > 0) {
                state = geos[k][0].NAME || '';
              } else if (kl === 'counties' && geos[k].length > 0) {
                county = geos[k][0].NAME || '';
              } else if (kl.indexOf('congressional district') !== -1 && geos[k].length > 0) {
                var distObj = geos[k][0];
                var distVal = distObj.DISTRICT || distObj.NAME || '';
                if (distVal) {
                  var num = parseInt(distVal, 10);
                  if (!isNaN(num)) {
                    district = String(num);
                  } else {
                    var m = distVal.match(/\d+/);
                    if (m) district = String(parseInt(m[0], 10));
                  }
                }
              }
            }
          }
          
          if (state) {
            _finish(resolve, state, county, district);
          } else {
            reject(new Error('Census API: No state returned'));
          }
        })
        .catch(function(err) {
          console.warn('Census reverse geocode failed, trying Nominatim...', err);
          fetch('https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=' + lat + '&lon=' + lon)
            .then(function(res) {
              if (!res.ok) throw new Error('Nominatim HTTP ' + res.status);
              return res.json();
            })
            .then(function(data) {
              var state = '';
              var county = '';
              if (data && data.address) {
                state = data.address.state || '';
                county = data.address.county || '';
              }
              if (state) {
                _finish(resolve, state, county, '');
              } else {
                reject(new Error('Nominatim API: No state returned'));
              }
            })
            .catch(function(err2) {
              console.warn('Nominatim reverse geocode failed, trying centroid fallback...', err2);
              var st = window._stateFromCoords(lat, lon);
              if (st) {
                _finish(resolve, st, '', '');
              } else {
                reject(new Error('All geocoding methods failed'));
              }
            });
        });
    });
  };

  // Helper to show modern toasts
  window._showToast = function(msg) {
    var toast = document.getElementById('myteam-share-toast');
    if (toast) {
      toast.textContent = msg;
      toast.classList.add('visible');
      setTimeout(function() { toast.classList.remove('visible'); }, 3500);
    } else {
      console.log('Toast: ' + msg);
    }
  };

  // Premium, name-aware toast for "Add to My Team" actions.
  // action: 'add' | 'remove'.  opts: { count, total, complete }
  var _teamToastTimer = null;
  window._showTeamToast = function(pid, action, opts) {
    opts = opts || {};
    var toast = document.getElementById('team-add-toast');
    if (!toast) return;
    var d = (typeof CMP_DATA !== 'undefined') ? CMP_DATA[pid] : null;
    var name = (d && d.name) ? d.name : 'This pick';
    var icon = (d && d.icon) ? d.icon : '🏛';
    var total = opts.total || 6;

    // Work out which ballot seat this pick fills, so the confirmation can name
    // the exact slot in My Voting Team it just landed in — tying the add to a
    // concrete result up top instead of a vague "added". The caller may pass it
    // in opts.filledLabel; otherwise read it off the freshly-saved ballot. Stays
    // empty on a remove, or when it can't be resolved (then we fall back to the
    // generic copy).
    var filledLabel = opts.filledLabel || '';
    if (action !== 'remove' && !filledLabel) {
      try {
        var _pos = window.TEAM_POSITIONS || [];
        var _sel = (window._ballotLoad ? window._ballotLoad() : {}) || {};
        for (var _i = 0; _i < _pos.length; _i++) {
          if (_sel[_pos[_i].key] === pid) { filledLabel = _pos[_i].label; break; }
        }
      } catch (e) {}
    }

    var avatar = document.getElementById('team-add-toast-avatar');
    var title = document.getElementById('team-add-toast-title');
    var sub = document.getElementById('team-add-toast-sub');
    var check = document.getElementById('team-add-toast-check');

    var photo = (typeof window._getPhotoUrl === 'function') ? window._getPhotoUrl(pid) : '';
    if (avatar) {
      if (photo) {
        avatar.innerHTML = '<img loading="lazy" decoding="async" src="' + photo + '" alt="" onerror="this.parentElement.textContent=\'' + icon + '\'">';
      } else {
        avatar.textContent = icon;
      }
    }

    toast.classList.remove('removing', 'complete');
    if (action === 'remove') {
      toast.classList.add('removing');
      if (check) check.textContent = '✕';
      if (title) title.textContent = 'Removed from your ballot';
      if (sub) sub.textContent = name;
    } else if (opts.complete) {
      toast.classList.add('complete');
      if (check) check.textContent = '🎉';
      if (title) title.textContent = 'Your ballot is complete!';
      if (sub) sub.textContent = name + (filledLabel ? ' fills your ' + filledLabel + ' seat — ' : ' fills your final slot — ') + 'all ' + total + ' picked!';
    } else if (opts.count === 1) {
      // First pick — a real milestone for a new voter. Acknowledge it warmly and
      // reassure them their slate is now saving itself, so they know they're
      // properly underway and what the next step is.
      toast.classList.add('complete');
      if (check) check.textContent = '⭐';
      if (title) title.textContent = 'That\'s your first pick! 🎉';
      if (sub) sub.textContent = name + (filledLabel ? ' now holds your ' + filledLabel + ' seat' : ' is on your ballot') + ' — saved automatically. ' + Math.max(0, total - 1) + ' seats to go, at your own pace.';
    } else {
      if (check) check.textContent = '✓';
      if (title) title.textContent = filledLabel ? ('✓ ' + filledLabel + ' filled on your ballot') : '✓ Added to your ballot';
      if (sub) sub.textContent = name + (filledLabel ? ' now holds your ' + filledLabel + ' seat' : '') + (opts.count ? '  ·  ' + opts.count + '/' + total + ' slots filled up top' : '');
    }

    // Contextual "what next" guidance footer. On an add, the caller supplies
    // one-tap actions (fill the next open seat, compare, jump to the workspace)
    // so the user is guided forward right where they acted instead of being left
    // to find the next step on their own. Cleared on remove.
    var actionsEl = document.getElementById('team-add-toast-actions');
    if (actionsEl) {
      actionsEl.innerHTML = '';
      if (action !== 'remove' && opts.actions && opts.actions.length) {
        opts.actions.forEach(function(a) {
          if (!a || !a.label) return;
          var b = document.createElement('button');
          b.type = 'button';
          b.className = 'tat-action ' + (a.kind === 'secondary' ? 'tat-action-secondary' : 'tat-action-primary');
          b.innerHTML = a.label;
          b.addEventListener('click', function() {
            try { if (typeof a.act === 'function') a.act(); } catch (e) {}
            toast.classList.remove('visible');
            if (_teamToastTimer) clearTimeout(_teamToastTimer);
          });
          actionsEl.appendChild(b);
        });
      }
    }
    var hasActions = action !== 'remove' && !!(opts.actions && opts.actions.length);

    // Restart the entrance animation even if a toast is already showing.
    toast.classList.remove('visible');
    void toast.offsetWidth;
    toast.classList.add('visible');

    // Keep the toast up long enough to act on its guidance, and pause the
    // countdown while the pointer is over it so a deliberate click never races
    // the auto-dismiss.
    if (!toast._hoverBound) {
      toast._hoverBound = true;
      toast.addEventListener('mouseenter', function() { if (_teamToastTimer) clearTimeout(_teamToastTimer); });
      toast.addEventListener('mouseleave', function() {
        if (_teamToastTimer) clearTimeout(_teamToastTimer);
        _teamToastTimer = setTimeout(function() { toast.classList.remove('visible'); }, 1800);
      });
    }
    if (_teamToastTimer) clearTimeout(_teamToastTimer);
    var hideMs = action === 'remove' ? 2200 : (hasActions ? 7000 : 3000);
    _teamToastTimer = setTimeout(function() { toast.classList.remove('visible'); }, hideMs);
  };

  // Pulse the "My Voting Team" counters so the section feels alive.
  window._popTeamCounter = function() {
    ['myteam-count-badge', 'myteam-browse-slots-label'].forEach(function(id) {
      var el = document.getElementById(id);
      if (!el) return;
      el.classList.remove('myteam-count-pop');
      void el.offsetWidth;
      el.classList.add('myteam-count-pop');
      setTimeout(function() { el.classList.remove('myteam-count-pop'); }, 650);
    });
  };

  // Celebratory particle burst fired the instant a voter claims a ballot seat.
  // It originates at the exact element they tapped (the "Add" button), so the
  // reward is tied to their action wherever they add from — a district card, a
  // Key Races card, or Relevant to Me. Decorative only; honors reduced motion.
  window._pdxCelebrateAdd = function(originEl) {
    try {
      if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      // Resolve a launch point: the tapped control if we have it, else the
      // floating dock's progress ring, else the top-center of the viewport.
      var x = null, y = null, r;
      if (originEl && originEl.getBoundingClientRect) {
        r = originEl.getBoundingClientRect();
        if (r.width || r.height) { x = r.left + r.width / 2; y = r.top + r.height / 2; }
      }
      if (x === null) {
        var ring = document.getElementById('team-dock-ring');
        if (ring) { r = ring.getBoundingClientRect(); if (r.width) { x = r.left + r.width / 2; y = r.top + r.height / 2; } }
      }
      if (x === null) { x = (window.innerWidth || 360) / 2; y = (window.innerHeight || 640) * 0.4; }

      var layer = document.createElement('div');
      layer.className = 'pdx-celebrate-layer';
      layer.style.left = x + 'px';
      layer.style.top = y + 'px';

      var colors = ['#fad96a', '#e6b800', '#c0152a', '#ffffff', '#3b82f6', '#4ade80'];
      var N = 14;
      for (var i = 0; i < N; i++) {
        var bit = document.createElement('span');
        var isStar = (i % 5 === 0);
        bit.className = 'pdx-celebrate-bit' + (isStar ? ' is-star' : '');
        var ang = (Math.PI * 2 * i / N) + (Math.random() - 0.5) * 0.55;
        var dist = 32 + Math.random() * 42;
        var dx = Math.cos(ang) * dist;
        var dy = Math.sin(ang) * dist - 12; // slight upward bias — confetti "lifts"
        bit.style.setProperty('--dx', dx.toFixed(1) + 'px');
        bit.style.setProperty('--dy', dy.toFixed(1) + 'px');
        bit.style.setProperty('--rot', (Math.random() * 540 - 270).toFixed(0) + 'deg');
        if (isStar) { bit.textContent = '✦'; }
        else { bit.style.background = colors[i % colors.length]; }
        bit.style.animationDelay = (Math.random() * 45).toFixed(0) + 'ms';
        layer.appendChild(bit);
      }
      document.body.appendChild(layer);
      setTimeout(function() { if (layer && layer.parentNode) layer.parentNode.removeChild(layer); }, 1050);
    } catch (e) {}
  };

  window.triggerManualLocationDetection = function() {
    var btn = document.getElementById('detect-loc-btn');
    var oldText = btn ? btn.innerHTML : '🌐 Detect my location';
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '⏳ Detecting...';
    }
    
    if (!('geolocation' in navigator)) {
      window._showToast('Geolocation isn’t available — search your address on the map instead.');
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = oldText;
      }
      // No browser geolocation: send the voter straight to the precise address + map picker.
      window._pdxFallbackToMap();
      return;
    }

    navigator.geolocation.getCurrentPosition(
      function(pos) {
        window._reverseGeocode(pos.coords.latitude, pos.coords.longitude)
          .then(function(locObj) {
            window._applyDetectedLocation(locObj, true);
            if (btn) {
              btn.disabled = false;
              btn.innerHTML = oldText;
            }
            window._showToast('Detected: ' + (locObj.county ? locObj.county + ', ' : '') + locObj.state + (locObj.district ? ' (District ' + locObj.district + ')' : ''));
          })
          .catch(function(err) {
            console.error(err);
            if (btn) {
              btn.disabled = false;
              btn.innerHTML = oldText;
            }
            window._showToast('Couldn’t pinpoint that automatically — search your address on the map for exact districts.');
            // Detection couldn't resolve districts: open the address + map picker next.
            window._pdxFallbackToMap();
          });
      },
      function(err) {
        console.warn('Geolocation error:', err);
        if (btn) {
          btn.disabled = false;
          btn.innerHTML = oldText;
        }
        window._showToast('Location access was declined — search your address on the map for exact districts.');
        // Declined / unavailable: fall back to the address + map picker rather than
        // the less-precise county selector.
        window._pdxFallbackToMap();
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // ── DETECTION MAY OFFER A PLACE. IT MAY NOT ANSWER FOR THE READER. ────────
  // WHAT THIS REPLACED, and why it is a refusal rather than a smaller version of
  // itself. Two functions used to run on load with no gesture behind either:
  //
  //   detectVoterLocation()        prompted for browser geolocation on first
  //                                arrival and, on a hit, wrote the reverse-
  //                                geocoded state and county into the saved
  //                                location through _applyDetectedLocation().
  //   _detectVoterLocationByIP()   its fallback for a declined or unavailable
  //                                prompt: fetched ipapi.co and applied the
  //                                region it returned, silently, as the reader's
  //                                own place.
  //
  // Both flipped _hasUserLocation and persisted. So the homepage told a reader
  // who had never set anything "You are set to Utah", printed the three seats a
  // state name resolves, and kept doing it on every later visit because the guess
  // was now in the store — and an approximate region off an IP address is not a
  // place a person votes. It is not even reliably their state: a VPN, a mobile
  // carrier's regional egress or a university's netblock each move it.
  //
  // THE OFFER IS THE CTA, AND THE CTA IS ALREADY EVERYWHERE. Every location
  // surface in this app opens with "Set my location" / "Find it on the map" /
  // "Detect my location" and says, until one of them is used, that it will not
  // guess. triggerManualLocationDetection() above is the Detect button: the same
  // geolocation read, behind a tap, applied with force because a tap is consent.
  // That is the whole of detection now, and it is enough.
  //
  // THE NAME IS KEPT AND ANSWERS FALSE so a caller that still asks for load-time
  // detection gets a documented no rather than a ReferenceError, and so the one
  // line at the foot of this file that used to call it reads as a decision.
  window.detectVoterLocation = function() {
    return false;
  };

  window.jumpToRelevantAccordion = function(officeKey) {
    var categoryKey = '';
    if (officeKey === 'senate') categoryKey = 'senator';
    else if (officeKey === 'house') categoryKey = 'representative';
    else if (officeKey === 'governor') categoryKey = 'governor';
    else if (officeKey === 'statesenate') categoryKey = 'state_senator';
    else if (officeKey === 'statehouse') categoryKey = 'state_rep';
    else if (officeKey === 'local') categoryKey = 'local';
    else if (officeKey === 'president') categoryKey = 'president';
    else if (officeKey === 'ltgovernor') categoryKey = 'governor';
    else if (officeKey === 'secstate' || officeKey === 'secretaryofstate' || officeKey === 'attorneygeneral' || officeKey === 'chiefjustice' || officeKey === 'defense' || officeKey === 'intel') categoryKey = 'cabinet';
    else categoryKey = 'other';

    // ── LOCAL STOPS AT THE EDGE OF LOCAL ────────────────────────────────────
    // The fallback at the bottom of this function scrolls to #relevant-section
    // whenever the requested office group did not render. For every other office
    // that is a mild miss — the section is the voter's own ballot. For 'local' it
    // was the reported bug: the section's FIRST groups are President and Cabinet,
    // which are added before the state check and are therefore national figures
    // for every visitor in every state. A visitor tapping "my local officials" in
    // an area with no local roster was scrolled onto that slate.
    //
    // So the local path is now closed rather than widened. If we hold no local
    // seats for this visitor, this function routes NOWHERE — it says why, in the
    // visitor's own area's name, and leaves them where they were. The two buttons
    // that fire it are already gated on the same answer, so reaching this branch
    // means a stale render or a direct call; either way, no national slate.
    if (categoryKey === 'local') {
      var _cov = { resolved: false, ok: false, area: '', pids: [] };
      try { if (typeof window.pdxLocalSeatsForMe === 'function') _cov = window.pdxLocalSeatsForMe(); } catch (e) {}
      if (!_cov.ok) {
        var _where = _cov.area || 'your area';
        var _msg = _cov.resolved
          ? 'Local offices aren\u2019t mapped for ' + _where + ' yet \u2014 we\u2019d rather say so than show you someone else\u2019s officials.'
          : 'Set your area first and we\u2019ll show the local seats we actually hold for it.';
        try { if (typeof window._showToast === 'function') window._showToast(_msg); } catch (e) {}
        if (!_cov.resolved) {
          try { if (typeof window.openLocationModal === 'function') window.openLocationModal(); } catch (e) {}
        }
        return;
      }
    }

    // Re-render the personalized ballot against the voter's CURRENT districts
    // before opening the seat's field. This is what carries the right district
    // context into the fill flow: clicking "Fill this seat" on, say, State
    // Senate District 6 rebuilds the office groups fresh — each one strictly
    // filtered to the voter's own U.S. House / State Senate / State House
    // districts — so the group we expand below can never be a stale render that
    // still holds another district's candidates (the bug that surfaced U.S.
    // House District 1 names for a District 2 voter filling a state seat).
    if (typeof window.renderRelevantToMe === 'function') {
      try { window.renderRelevantToMe(); } catch (e) {}
    }

    var el = document.getElementById('relevant-browse-group-' + categoryKey);
    if (el) {
      if (!el.classList.contains('expanded')) {
        window.toggleBrowseAccordion('relevant-browse-group-' + categoryKey, 'relevant-office-' + categoryKey);
      }
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      var header = el.querySelector('.browse-type-header');
      if (header) {
        header.style.boxShadow = '0 0 30px rgba(245,158,11,0.25), 0 0 10px rgba(245,158,11,0.15)';
        header.style.borderColor = 'rgba(245,158,11,0.5)';
        setTimeout(function() {
          header.style.boxShadow = '';
          header.style.borderColor = '';
        }, 1500);
      }
    } else {
      // No field rendered for this exact office yet (e.g. the seat's 2026 roster
      // is still forming for the voter's district). Scroll to the section so the
      // voter sees their personalized ballot — but deliberately do NOT expand a
      // different office. The first group in the section is U.S. House, so
      // auto-opening "the top" here is precisely what made a State Senate /
      // State House "Fill this seat" tap appear to jump to U.S. House District 1.
      var relSection = document.getElementById('relevant-section');
      if (relSection) {
        relSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  };

  // The reverse trip: scroll UP from district browsing to the "My Voting Team"
  // builder so the voter can flip between discovering races and managing the team
  // they're assembling without hunting for it. Pairs with jumpToRelevantAccordion
  // (team → race) to make the two surfaces feel like one workspace. Briefly flashes
  // the district-coverage map so the eye lands on the live progress, not a wall of
  // slots. `focusOpen`, when true, then bounces to the first still-open race so the
  // round trip ends on an action rather than a dead end.
  window._relevantScrollToTeam = function(focusOpen) {
    var panel = document.getElementById('myteam-selected-panel');
    if (!panel) { return; }
    // If a pick was just added, scroll straight to that slot and let it pulse, so
    // the voter lands on the satisfying result of their action rather than the top
    // of the panel. Otherwise scroll to the panel and flash the progress block.
    var justPid = window._pdxJustFilledPid;
    var justSlot = justPid ? panel.querySelector('.myteam-slot[data-pid="' + justPid + '"]') : null;
    if (justSlot) {
      justSlot.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Re-trigger the highlight animation in case the grid was already painted.
      justSlot.classList.remove('myteam-slot--just-filled');
      void justSlot.offsetWidth;
      justSlot.classList.add('myteam-slot--just-filled');
      return;
    }
    panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    var cov = document.getElementById('myteam-district-coverage');
    var flash = (cov && cov.style.display !== 'none') ? cov : panel.querySelector('#myteam-progress') || panel;
    if (flash) {
      var prevShadow = flash.style.boxShadow;
      var prevRadius = flash.style.borderRadius;
      flash.style.borderRadius = flash.style.borderRadius || '0.9rem';
      flash.style.boxShadow = '0 0 0 2px rgba(245,158,11,0.55), 0 0 28px rgba(245,158,11,0.3)';
      setTimeout(function() { flash.style.boxShadow = prevShadow; flash.style.borderRadius = prevRadius; }, 1600);
    }
  };

  // Perform initial load
  window.loadVoterLocation();
  window._updateTeamPositionsForLocation();
  window.updateRelevantLocationText();
  if (typeof window._vhBallotRerender === 'function') window._vhBallotRerender();
  if (typeof _mypolBuildGrid === 'function') _mypolBuildGrid();
  if (typeof renderRelevantToMe === 'function') renderRelevantToMe();
  if (typeof myteamBrowseFilter === 'function') myteamBrowseFilter();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() { window._vhSyncBanner(); });
  } else {
    window._vhSyncBanner();
  }
  // NO DETECTION ON LOAD. The initial load above reads the store and paints what
  // the reader themselves saved; where they saved nothing, every surface says so
  // and offers the CTA. See window.detectVoterLocation() for the whole of why.
  
