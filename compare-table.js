// ─────────────────────────────────────────────────────────────────────────────
// Comparison mode — table layout
// ─────────────────────────────────────────────────────────────────────────────
// Extracted verbatim from index.html (it began at line 33899 of the pre-split
// document) as part of the first-paint pass. Not a rewrite: the code below is
// byte-for-byte what was inline, and the <script src> that replaced it sits at
// the same position in the document, so execution order and global scope are
// unchanged. It moved out so the HTML stops carrying it on every single visit —
// external scripts are cached and V8-code-cached across loads; inline script in
// a revalidated document is re-downloaded and re-compiled every time.
// ─────────────────────────────────────────────────────────────────────────────
  // ════════════════════════════════════════════════════════════
  // COMPARISON MODE — TABLE LAYOUT
  // ════════════════════════════════════════════════════════════
  const _cmpSelected = new Set();
  // Exposed so other script blocks (e.g. the Your Key Races quick-action buttons)
  // can read the live compare selection to reflect added/removed state.
  window._cmpSelected = _cmpSelected;

  // View state for the "Where They Stand" issue section: which filter chip is
  // active (all / differ / agree / mine) and whether the capped overflow rows
  // are expanded. Reset every time the table is rebuilt so a fresh comparison
  // always opens on the full list.
  let _cmpIssueFilterMode = 'all';
  let _cmpIssueExpanded = false;
  const _CMP_ISSUE_CAP = 14;

  var CMP_DATA = window.CMP_DATA || {}; window.CMP_DATA = CMP_DATA;

  function handleCompareCheck(checkbox) {
    const pid     = checkbox.dataset.pid;
    const checked = checkbox.checked;
    document.querySelectorAll(`.compare-cb[data-pid="${pid}"]`).forEach(cb => cb.checked = checked);
    if (checked) { _cmpSelected.add(pid); } else { _cmpSelected.delete(pid); }
    document.querySelectorAll(`.bp-compare-btn[data-pid="${pid}"]`).forEach(b => {
      if (checked) { b.textContent = '✓ ADDED'; b.classList.add('added'); b.closest('.card-holo')?.classList.add('cmp-highlight'); }
      else { b.textContent = '+ COMPARE'; b.classList.remove('added'); b.closest('.card-holo')?.classList.remove('cmp-highlight'); }
    });
    _updateCmpFloat();
    _pmUpdateTray();
  }

  function _updateCmpFloat() {
    const btn = document.getElementById('compare-float-btn');
    const label = document.getElementById('cmp-float-label');
    const n = _cmpSelected.size;
    if (n >= 1) {
      // When the visitor has set their Alignment issues, signal the payoff right
      // on the button: the side-by-side will be ranked by how well each fits them.
      const aligned = (typeof _alignIssues !== 'undefined' && _alignIssues && _alignIssues.size > 0);
      label.textContent = aligned ? `Compare (${n}) · 🎯 by match` : `Compare (${n})`;
      btn.classList.add('cmp-float-visible');
    } else {
      btn.classList.remove('cmp-float-visible');
    }
  }

  function clearAllCompare(e) {
    if (e) e.stopPropagation();
    document.querySelectorAll('.pm-btn-compare.added').forEach(b => { b.textContent = '+ Compare'; b.classList.remove('added'); });
    document.querySelectorAll('.bp-compare-btn.added').forEach(b => { b.textContent = '+ COMPARE'; b.classList.remove('added'); });
    document.querySelectorAll('.card-holo.cmp-highlight').forEach(c => c.classList.remove('cmp-highlight'));
    _cmpSelected.clear();
    document.querySelectorAll('.compare-cb').forEach(cb => cb.checked = false);
    _updateCmpFloat();
    _pmUpdateTray();
    closeCompare();
  }

  function closeCompare() {
    const ov = document.getElementById('compare-overlay');
    ov.classList.remove('cmp-open');
    setTimeout(() => { ov.style.display = 'none'; }, 260);
  }

  function openCompare() {
    _buildCmpTable();
    const ov = document.getElementById('compare-overlay');
    ov.style.display = 'flex';
    requestAnimationFrame(() => requestAnimationFrame(() => ov.classList.add('cmp-open')));
    _cmpAttachScrollCondense();
  }

  // As the visitor scrolls the side-by-side table, condense the sticky column
  // headers (shrink the avatars, drop the office line / score ring / bars down to
  // just a small photo + name) so the comparison rows stay in view instead of the
  // tall profile block eating the screen — the payoff is biggest on phones. Purely
  // presentational: a single `cmp-scrolled` class toggle drives the CSS, the
  // listener is bound once and rAF-throttled, and each fresh open starts expanded.
  function _cmpAttachScrollCondense() {
    const area = document.getElementById('cmp-scroll-area');
    if (!area) return;
    area.scrollTop = 0;
    area.classList.remove('cmp-scrolled');
    if (area._cmpCondenseBound) return;
    area._cmpCondenseBound = true;
    let raf = null;
    area.addEventListener('scroll', function () {
      if (raf) return;
      raf = requestAnimationFrame(function () {
        raf = null;
        area.classList.toggle('cmp-scrolled', area.scrollTop > 28);
      });
    }, { passive: true });
  }

  // Build Your Team quick-action boxes — make them jump to the right tools.
  function bytQuickAction(which) {
    if (which === 'compare') {
      if (typeof openCompare === 'function') openCompare();
      return;
    }
    var targetId = which === 'alignment' ? 'alignment-panel' : 'relevant-section';
    var el = document.getElementById(targetId);
    if (el) {
      if (which === 'alignment' && window.alignTogglePanel) window.alignTogglePanel(true);
      el.scrollIntoView({ behavior: 'smooth', block: which === 'alignment' ? 'center' : 'start' });
    }
  }
  window.bytQuickAction = bytQuickAction;

  // Float button events
  document.getElementById('compare-float-btn').addEventListener('click', function(e) {
    if (e.target.id === 'cmp-float-clear' || e.target.closest('#cmp-float-clear')) {
      clearAllCompare(e); return;
    }
    openCompare();
  });
  document.getElementById('compare-overlay').addEventListener('click', function(e) {
    if (e.target === this) closeCompare();
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      const co = document.getElementById('compare-overlay');
      if (co && co.style.display !== 'none') { closeCompare(); e.stopPropagation(); }
    }
  }, true);

  // ── Issue-by-issue comparison data ───────────────────────────────────
  // Pulls each selected politician's REAL documented positions from
  // ISSUE_STANCE_DATA (via the shared _resolveStanceList chokepoint), groups
  // them by issue so the same issue lines up in one row across everyone, and
  // works out where the picks who actually hold a position agree or differ.
  // This is what lets a thin/new 2026 candidate — who has no promise score —
  // still be compared meaningfully: their stances are the comparison.
  // Lineup key of the one rebuild the record lane is allowed (see the note at the
  // bottom of _buildCmpTable). Module-scoped so re-opening the same lineup in one
  // session cannot re-trigger it.
  let _cmpRecWarmed = null;

  function _cmpIssueData(pids) {
    const out = { anyDocumented:false, anyRecord:false, recCold:false, issues:[], shown:0, total:0, nAgree:0, nDiffer:0, nPartial:0, nMine:0, nMineShared:0, mineActive:false, docByPid:{}, recByPid:{} };
    const resolve = (typeof window._resolveStanceList === 'function') ? window._resolveStanceList : null;
    if (!resolve) return out;
    // ISSUE_MAP lives inside the Alignment IIFE and is published as
    // window._alignIssueMap — use that reference (bare ISSUE_MAP doesn't resolve
    // across script blocks). Gives canonical issue labels AND the category each
    // issueKey belongs to, which powers the "your issue" matching below.
    const issueMap = (typeof window !== 'undefined' && window._alignIssueMap) ? window._alignIssueMap
                   : ((typeof ISSUE_MAP !== 'undefined' && ISSUE_MAP) ? ISSUE_MAP : null);
    const mapOK = !!issueMap;

    // The visitor's own Alignment selections (when set) share the exact issueKey
    // namespace as the documented stances, so we can honestly flag which compared
    // issues are ones THEY chose to weigh. We match an issue as "yours" when its
    // key was selected directly, or when it sits in a topic category the visitor
    // flagged — this marks a topic of interest, never a claim that anyone agrees.
    let mineKeys = null, mineCats = null;
    if (typeof _alignIssues !== 'undefined' && _alignIssues && _alignIssues.size) {
      mineKeys = new Set(_alignIssues);
      if (mapOK) {
        mineCats = new Set();
        _alignIssues.forEach(k => { if (issueMap[k] && issueMap[k].cat) mineCats.add(issueMap[k].cat); });
      }
      out.mineActive = true;
    }
    const isMine = (ik) => {
      if (!mineKeys || !ik) return false;
      if (mineKeys.has(ik)) return true;
      return !!(mineCats && issueMap[ik] && issueMap[ik].cat && mineCats.has(issueMap[ik].cat));
    };
    const norm = (t) => String(t || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
    const dirOf = (s) => {
      const d = String(s.issueStance || s.pos || 'mixed').toLowerCase();
      return (d === 'support' || d === 'oppose' || d === 'mixed') ? d : (d === 'tracking' ? 'tracking' : 'mixed');
    };

    const byPid = {};      // pid -> { issueKey -> entry }
    const order = [];      // first-seen issue keys
    const meta = {};       // issueKey -> { label }
    pids.forEach(pid => {
      const list = resolve(pid, CMP_DATA[pid]) || [];
      const m = {};
      let docCount = 0;
      list.forEach(s => {
        if (!s || !String(s.topic || '').trim()) return;
        const key = s.issueKey ? ('k:' + s.issueKey) : ('t:' + norm(s.topic));
        if (m[key]) return;                       // one position per issue per person
        m[key] = { dir: dirOf(s), topic: String(s.topic).trim(), text: String(s.text || '').trim() };
        docCount++;
        if (!meta[key]) {
          let label = String(s.topic).trim();
          if (s.issueKey && mapOK && issueMap[s.issueKey] && issueMap[s.issueKey].label) {
            label = issueMap[s.issueKey].label;  // canonical label (already carries an emoji)
          }
          meta[key] = { label: label, issueKey: s.issueKey || '' };
          order.push(key);
        }
      });
      byPid[pid] = m;
      out.docByPid[pid] = docCount;
      if (docCount) out.anyDocumented = true;
    });

    // ── 🏛 THE SECOND LANE, AS A ROW SOURCE ────────────────────────────────
    // Everything above is the STATED lane and it stays exactly as it is. This adds
    // the formal one — not to the cells' arithmetic, which never sees it, but to
    // the list of issues the table is allowed to have a row for.
    //
    // WHY. The section below was gated on `anyDocumented`, so a lineup where
    // nobody had a sourced quote got no issue comparison at all — however many
    // roll calls the picks had on file. The per-cell record-direction pass has
    // been filling stance-less cells for a while, and it could never fire here,
    // because the gate meant there were no cells to fill. Missing stance is not
    // missing record.
    //
    // WHAT IT MAY NOT DO. It does not touch `dir`, so `agreement`, nAgree,
    // nDiffer, nPartial and `count` are stated-lane figures exactly as before; a
    // record-only row lands on the new `record` state, which those tallies skip.
    // No entry is written into byPid, so no cell can print a record as a stance.
    const recOf = (typeof window._pdxSeatFormalMap === 'function') ? window._pdxSeatFormalMap : null;
    const recByPid = {};
    pids.forEach(pid => {
      const rm = recOf ? (recOf(pid) || {}) : {};
      recByPid[pid] = rm;
      const n = Object.keys(rm).length;
      out.recByPid[pid] = n;
      if (n) out.anyRecord = true;
      // Cold means the batched /compare fetch has not landed for this member yet,
      // so the index above is reading an empty file rather than an empty record.
      // The caller uses this to decide whether a second look is worth taking.
      try {
        if (window.PDXVotingRecord && typeof window.PDXVotingRecord.memberRecords === 'function' &&
            window.PDXVotingRecord.memberRecords(pid) === null) out.recCold = true;
      } catch (e) {}
      Object.keys(rm).forEach(k => {
        const key = 'k:' + k;
        if (meta[key]) return;                    // the stated lane already opened this row
        meta[key] = { label: (mapOK && issueMap[k] && issueMap[k].label) ? issueMap[k].label : (rm[k].issueLabel || k), issueKey: k };
        order.push(key);
      });
    });
    if (!out.anyDocumented && !out.anyRecord) return out;

    // Assemble one record per issue, with each pick's cell + an agreement read.
    // The read is computed from the canonical four-state stance (window.PDXStance)
    // so a "No Clear Position" (tracking / unclassified) cell counts as neither
    // agreement nor conflict — only real Supported / Opposed / Mixed positions
    // weigh in, exactly like the Home Team matrix's agree/split logic.
    const _PDXc = window.PDXStance;
    order.forEach(key => {
      const cells = pids.map(pid => byPid[pid][key] || null);
      const present = cells.filter(Boolean);
      const keys = present.map(c => _PDXc ? _PDXc.resolveStance(c.dir) : c.dir);
      const real = keys.filter(k => k !== 'none');     // No Clear Position excluded
      const sup = real.filter(k => k === 'supported').length;
      const opp = real.filter(k => k === 'opposed').length;
      const mixed = real.filter(k => k === 'mixed').length;
      const recCells = pids.map(pid => (recByPid[pid] && recByPid[pid][meta[key].issueKey]) || null);
      const recCount = recCells.filter(Boolean).length;
      let agreement;
      // A row nobody stated anything on is not "1 documented" and it is not a
      // disagreement — it is the formal lane alone, and it says so.
      if (present.length === 0) agreement = 'record';
      else if (real.length < 2) agreement = 'solo';
      else if (sup > 0 && opp > 0) agreement = 'differ';
      else if (mixed > 0) agreement = 'partial';       // a clear side + a mixed read
      else agreement = 'agree';                        // all on the same clear side
      const mine = isMine(meta[key].issueKey);
      // The visitor's OWN saved position on this exact issue (My Stances first,
      // else an Alignment-Tool pick), so the row can read "Your Stance vs Their
      // Record" — your direction in the label column, their record in the cells.
      let myDir = null;
      try { if (meta[key].issueKey && window.PDXStances && typeof window.PDXStances.myDirection === 'function') myDir = window.PDXStances.myDirection(meta[key].issueKey); } catch (e) { myDir = null; }
      out.issues.push({ key, label: meta[key].label, issueKey: meta[key].issueKey || '', cells, count: present.length, recCells, recCount, agreement, mine, myPosition: myDir ? myDir.position : null, myPriority: myDir ? myDir.priority : null });
    });

    // Shared issues (2+ documented) lead; within those, the visitor's own flagged
    // issues come first so a values-driven voter sees their priorities up top, then
    // differences before agreements so contrasts are easy to find, then single-
    // documented rows.
    // Record-only rows rank last of the five — behind every row where somebody
    // actually said something — but they rank, and they are no longer absent.
    const rank = { differ:0, partial:1, agree:2, solo:3, record:4 };
    out.issues.sort((a, b) => {
      if ((b.count >= 2) !== (a.count >= 2)) return (b.count >= 2) - (a.count >= 2);
      if (b.mine !== a.mine) return (b.mine ? 1 : 0) - (a.mine ? 1 : 0);
      if (rank[a.agreement] !== rank[b.agreement]) return rank[a.agreement] - rank[b.agreement];
      if (b.count !== a.count) return b.count - a.count;
      return (b.recCount || 0) - (a.recCount || 0);
    });
    out.total = out.issues.length;
    out.issues.forEach(iss => {
      if (iss.mine) out.nMine++;
      if (iss.count >= 2) {
        if (iss.mine) out.nMineShared++;
        if (iss.agreement === 'agree') out.nAgree++;
        else if (iss.agreement === 'differ') out.nDiffer++;
        else if (iss.agreement === 'partial') out.nPartial++;
      }
    });
    return out;
  }

  // The two election facets are the one place in this table where the SAME word
  // means opposite things from one row to the next: under 🔐 Election Security
  // "Supports" is pro-safeguard, under 📩 Expand Voting Access it is pro-access.
  // Side by side and unlabelled, a member who backs safeguards and opposes wider
  // access reads as a self-contradiction, which is not what the cards say. This
  // adds one line of direction copy to those two rows and nothing else — no
  // change to the agreement maths, which compares within a row, never across.
  function _cmpAxisHint(issueKey) {
    const BA = window.PDXBallotAxes;
    if (!BA || typeof BA.isAxisKey !== 'function') return '';
    const e = (t) => String(t == null ? '' : t)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    try {
      if (!BA.isAxisKey(issueKey)) return '';
      const mine = BA.axisMeta(issueKey === BA.KEYS.security ? 'security' : 'access');
      const other = BA.axisMeta(issueKey === BA.KEYS.security ? 'access' : 'security');
      if (!mine || !other) return '';
      return '<div class="bax-tablehint">' + mine.icon + ' “Supports” here = '
        + e(String(mine.dir.support).toLowerCase())
        + '. Judged separately from ' + other.icon + ' ' + e(other.shortLabel.toLowerCase()) + '.</div>';
    } catch (err) { return ''; }
  }

  // Render one politician's stance cell for the issue comparison. When the Locker
  // holds receipts for this person on this issue, the cell becomes a one-tap
  // drill-in — closing the compare overlay and opening the Evidence Locker
  // filtered to exactly this politician + issue, so a contrast a visitor spots
  // here leads straight to the proof. Gated on real evidence (or a known Locker
  // member still loading), so a tap never lands on an empty file.
  function _cmpIssueCell(entry, pid, issueKey) {
    const PDX = window.PDXStance;
    // No documented position → the canonical grey "No Clear Position" pill, the
    // exact same calm language every other surface uses for an honest gap.
    //
    // …AND WHAT THE RECORD DID, when there is a record to say it. This is the cell
    // the whole record-direction move exists for: two picks on one issue, neither
    // with a sourced stance, and until now two identical grey blanks — one over a
    // member with nothing on file, one over a member with twenty mapped roll calls
    // running the same way. Same blank, opposite facts. The clause is filled in
    // after the batched /compare call (see _pdxHydrateRecordDirection) because at
    // paint time nothing is warm and "no record" would be a guess; a cell whose
    // member never lands keeps exactly the copy below. Display only — the
    // agreement maths above reads iss.cells and has never seen this.
    if (!entry) {
      const nonePill = PDX ? PDX.stancePill('none') : '<span class="cmp-issue-none-lbl">No clear position</span>';
      // WHAT THE RECORD DID, PRINTED AT PAINT WHERE IT IS ALREADY KNOWN. The slot
      // below is the exact one the hydration pass renders — same accessor, same
      // compact form, same lane mark — so warming the fetch upgrades this cell
      // rather than contradicting it, and a cold cell still shows the batched
      // answer a moment later. Refused unless the slot has something to say:
      // `only` keeps the "no formal record yet" state out, because at paint that
      // state cannot tell an empty record from an unfetched one, and the hydration
      // pass will say it properly if it still holds once the fetch has landed.
      let recHtml = '';
      if (pid && issueKey) {
        try {
          const RD = window.PDXConsistency && window.PDXConsistency.recordDirection;
          if (RD && typeof RD.for === 'function') {
            recHtml = RD.for(pid, issueKey, { compact: true, only: ['speaks', 'thin'] }) || '';
          }
        } catch (e) { recHtml = ''; }
      }
      const rdir = (pid && issueKey)
        ? `<span class="cmp-issue-rdir" data-vrdir="${String(pid).replace(/"/g, '&quot;')}|${String(issueKey).replace(/"/g, '&quot;')}" data-vrdir-compact="1">${recHtml}</span>`
        : '';
      // ORDER FOLLOWS WHAT IS ACTUALLY THERE. With a readable record the record
      // leads and the missing quote is the quiet second line; with nothing on
      // file the grey pill leads exactly as it always has. The old cell led with
      // "No clear position / Not documented yet" over a full voting file, which
      // read as evasion and was our gap, not theirs.
      if (recHtml) {
        return '<div class="cmp-issue-cell is-none cmp-issue-emptycell cmp-issue-reclead">' + rdir +
          '<span class="cmp-issue-none-note">No stated position on file — this is the record</span></div>';
      }
      return '<div class="cmp-issue-cell is-none cmp-issue-emptycell">' + nonePill +
        '<span class="cmp-issue-none-note">Not documented yet</span>' + rdir + '</div>';
    }
    // Canonical four-state stance via the shared helper (window.PDXStance) — the
    // same pill Who Stands Where, the profile, and the Home Team matrix render.
    // entry.dir is 'support' | 'oppose' | 'mixed' | 'tracking'; resolveStance folds
    // legacy vocab (incl. 'tracking' → none) onto the four canonical states.
    const stanceKey = PDX ? PDX.resolveStance(entry.dir) : (entry.dir === 'support' ? 'supported' : entry.dir === 'oppose' ? 'opposed' : 'mixed');
    const cellCls = stanceKey === 'supported' ? 'is-support' : stanceKey === 'opposed' ? 'is-oppose' : stanceKey === 'none' ? 'is-none' : 'is-mixed';
    const pill = PDX ? PDX.stancePill(stanceKey) : '';
    const esc = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
    const text = entry.text ? `<div class="cmp-issue-text" title="${esc(entry.text)}">${esc(entry.text)}</div>` : '';
    const inner = `<span class="cmp-issue-dir">${pill}</span>${text}`;
    if (pid && issueKey && typeof window._pdxOpenEvidenceLocker === 'function') {
      const counts = (typeof window._pdxEvidenceIssueCountsForPerson === 'function') ? window._pdxEvidenceIssueCountsForPerson(pid) : null;
      const n = counts ? (counts[issueKey] || 0) : null;
      const lockable = (n !== null) ? (n > 0) : !!(typeof window._pdxHasLocker === 'function' && window._pdxHasLocker(pid));
      if (lockable) {
        const jp = String(pid).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
        const jk = String(issueKey).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
        const cue = `<span class="cmp-issue-ev">📂 ${n ? ('<strong>' + n + '</strong> ') : ''}Evidence ↗</span>`;
        return `<button type="button" class="cmp-issue-cell cmp-issue-celllink ${cellCls}" `
          + `onclick="closeCompare();setTimeout(function(){window._pdxOpenEvidenceLocker&&window._pdxOpenEvidenceLocker({pol:'${jp}',issue:'${jk}'});},300);" `
          + `title="See the evidence on record in the Evidence Locker">${inner}${cue}</button>`;
      }
    }
    return `<div class="cmp-issue-cell ${cellCls}">${inner}</div>`;
  }

  // "See everyone's evidence on this issue" — invoked from each issue row's label
  // cell. Unlike the per-cell drill-in (one politician + issue), this opens the
  // Evidence Locker filtered to the ISSUE ALONE, so every politician on record
  // shows. The current comparison lineup is carried along as context: the Locker
  // surfaces a banner naming them and highlights their cards, so a stance
  // contrast spotted here leads straight to the broader evidence — without
  // narrowing away the rest of the field. Exposed on window so the inline
  // onclick in the rendered table can reach it.
  window._cmpOpenIssueEvidence = function (issueKey) {
    if (!issueKey || typeof window._pdxOpenEvidenceLocker !== 'function') return;
    // The picks currently in the comparison (in display order), with names for
    // the context banner. Reads the same source the table was built from.
    const pids = [..._cmpSelected].filter(pid => CMP_DATA[pid]);
    const names = pids.map(pid => (CMP_DATA[pid] && CMP_DATA[pid].name) || pid);
    closeCompare();
    setTimeout(function () {
      window._pdxOpenEvidenceLocker({ issue: issueKey, comparePols: pids, compareNames: names });
    }, 300);
  };

  // ── Table builder ─────────────────────────────────────
  function _buildCmpTable() {
    const pids = [..._cmpSelected].filter(pid => CMP_DATA[pid]);
    if (pids.length === 0) { closeCompare(); return; }

    // Fresh comparison always opens on the full, unfiltered issue list.
    _cmpIssueFilterMode = 'all';
    _cmpIssueExpanded = false;

    // ── Rank by the visitor's own issue match ──────────────────────────────
    // When Alignment issues are set, the comparison should answer "who fits ME?"
    // at a glance — so order the lineup best-match-first instead of click order,
    // and remember the single crowned leader to flag below. Picks with no
    // documented alignment read (thin 2026 records) keep their relative order and
    // fall to the right; nothing is fabricated to force a ranking.
    const _alignActive = (typeof _calcAlignmentScore === 'function' && typeof _alignIssues !== 'undefined' && _alignIssues.size > 0);
    const _alignBy = {};
    if (_alignActive) {
      pids.forEach(pid => { _alignBy[pid] = _calcAlignmentScore(pid); });
      pids.sort((a, b) => {
        const av = _alignBy[a], bv = _alignBy[b];
        if (av === null || av === undefined) return (bv === null || bv === undefined) ? 0 : 1;
        if (bv === null || bv === undefined) return -1;
        return bv - av;
      });
    }
    // The single best-aligned pick — only when 2+ have a real read and the top
    // isn't a tie, so we never crown an arbitrary winner.
    let _alignLeaderPid = null, _alignLeaderScore = null;
    if (_alignActive) {
      const _aScored = pids.filter(pid => _alignBy[pid] !== null && _alignBy[pid] !== undefined);
      if (_aScored.length >= 2) {
        const _aTop = Math.max(..._aScored.map(pid => _alignBy[pid]));
        const _aLeaders = _aScored.filter(pid => _alignBy[pid] === _aTop);
        if (_aLeaders.length === 1) { _alignLeaderPid = _aLeaders[0]; _alignLeaderScore = _aTop; }
      }
    }

    const sub = document.getElementById('cmp-header-sub');
    sub.textContent = pids.length < 2
      ? 'Add one more pick to see a true side-by-side'
      : (_alignActive ? `${pids.length} compared · ranked by your issue match 🎯` : `Comparing ${pids.length} politicians side-by-side`);
    // Always-visible removable chips for the current lineup — a one-tap "Remove"
    // right in the header (no scrolling to the bottom row), plus an "Add" chip that
    // jumps back to browse when there's still room. This is the primary add/remove
    // control on mobile, where the per-column Remove buttons sit far below the fold.
    const _cmpNmEsc = (t) => String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    const pillsEl = document.getElementById('cmp-selected-pills');
    if (pillsEl) {
      let pillsHtml = pids.map(pid => {
        const p = CMP_DATA[pid];
        const shortNm = (p.name || '').split(' ').pop() || p.name;
        return `<button type="button" class="cmp-sel-pill" onclick="removeCmpPid('${pid}')" title="Remove ${_cmpNmEsc(p.name)} from the comparison" aria-label="Remove ${_cmpNmEsc(p.name)}">`
          + `<span class="cmp-sel-pill-ico">${p.icon || '🏛'}</span>`
          + `<span class="cmp-sel-pill-name">${_cmpNmEsc(shortNm)}</span>`
          + `<span class="cmp-sel-pill-x">✕</span></button>`;
      }).join('');
      if (pids.length < 4) {
        pillsHtml += `<button type="button" class="cmp-sel-pill cmp-sel-pill-add" onclick="closeCompare();setTimeout(function(){var b=document.getElementById('myteam-browse-search')||document.getElementById('compare-hub');if(b)b.scrollIntoView({behavior:'smooth',block:'center'});},300)" title="Add another politician to compare">`
          + `<span class="cmp-sel-pill-ico">＋</span><span class="cmp-sel-pill-name">Add</span></button>`;
      }
      pillsEl.innerHTML = pillsHtml;
    }

    const thead = document.getElementById('cmp-thead');
    const tbody = document.getElementById('cmp-tbody');

    const sc = (pid) => CMP_DATA[pid];
    // RETIRED with the Promise Score: `scoreColor()` / `barGrad()` coloured a
    // pledge percentage green / amber / red and drew its bar. No cell in this
    // table publishes a pledge rate any more, so both are gone. If a future row
    // needs a colour ramp, take it from the surface that owns the number it is
    // ramping — don't reintroduce a generic score ramp here.
    const na = `<span class="cmp-na">—</span>`;
    const colW = Math.max(180, Math.floor(700 / pids.length));

    // RETIRED: `followThrough(p)` used to turn two summary integers into a
    // percentage — Kept ÷ (Kept + Broken) — for its own compare row. That row is
    // gone. PolitiDex publishes one integrity percentage, ⚖️ Word vs Action, and
    // the pledge ledger feeds it as receipts rather than rating anyone in
    // parallel. The kept / broken / pending COUNT rows below are untouched: they
    // are the attested part, and they are what this table compares now. Read
    // counts with `window._pdxPledgeNote(p)` — never divide them again.
    // Officeholder vs candidate — inferred from the office/role label.
    const statusOf = (p) => /candidate|nominee/i.test(p.office || '') ? 'Candidate' : 'Officeholder';
    const statusBadge = (p, full) => statusOf(p) === 'Candidate'
      ? `<span class="cmp-status-badge cmp-status-cand">🗳 Candidate</span>`
      : `<span class="cmp-status-badge cmp-status-office">🏛 ${full ? 'Current Officeholder' : 'In Office'}</span>`;
    // Returns a class array marking the single strongest cell in a numeric row,
    // but only when there is a genuine difference to highlight (≥2 values, not a tie).
    const leaderClasses = (vals) => {
      const valid = vals.filter(v => v !== null && v !== undefined);
      if (valid.length < 2) return vals.map(() => '');
      const max = Math.max(...valid);
      if (Math.min(...valid) === max) return vals.map(() => '');
      return vals.map(v => (v !== null && v !== undefined && v === max) ? 'cmp-leader-cell' : '');
    };

    // Focus areas shared by 2+ of the selected politicians = their common ground.
    const _issueCount = {};
    pids.forEach(pid => (sc(pid).issues || []).forEach(iss => {
      const k = iss.trim(); _issueCount[k] = (_issueCount[k] || 0) + 1;
    }));
    const sharedIssues = new Set(Object.keys(_issueCount).filter(k => _issueCount[k] >= 2));

    // Documented issue positions across the lineup (ISSUE_STANCE_DATA) — drives
    // both the "Issue Agreement" insight and the head-to-head section below.
    const issueCmp = _cmpIssueData(pids);

    // ── At-a-glance insight panel ──────────────────────────
    const insEl = document.getElementById('cmp-insights');
    if (insEl) {
      if (pids.length < 2) {
        insEl.innerHTML = '';
      } else {
        const commonBody = sharedIssues.size
          ? [...sharedIssues].map(s => `<span class="cmp-common-tag">${s}</span>`).join('')
          : `<span class="cmp-insight-sub">No overlapping focus areas — these ${pids.length} prioritize different issues.</span>`;

        // ⚖️ WORD VS ACTION ACROSS THE LINEUP — the one read, and the only read.
        //
        // This card has been demoted twice. It began as "🏆 Promise Score Spread",
        // ranking the lineup by a pledge percentage. That became "🤝 Promise
        // Receipts", whose lead was `12 kept · 4 broken` pooled across picks plus a
        // "deepest record" ranking. The second version was more honest about what it
        // measured but no less of a parallel track: a tally, aggregated across
        // several different people, in the lead slot of a comparison insight, sitting
        // one card away from the read it was supposed to be subordinate to.
        //
        // A campaign pledge is one FORM OF "said". word-action.js already tests it
        // against its sourced resolution exactly as it tests a floor stance, so the
        // card now reports the DISTRIBUTION OF THAT ONE READ across the lineup, in
        // the one vocabulary (PDXConsistency.VERDICTS) and the one palette. Picks
        // below the publishing floor are named as unread, never as zero. The pledge
        // data and the kept/broken/pending logic are untouched and still published on
        // each profile beside their own disclosure.
        const WA_PHRASE = {
          consistent:  ['backs it up', 'back it up'],
          contradicts: ['contradicts', 'contradict'],
          mixed:       ['mixed record', 'mixed records'],
          flag:        ['red flag on record', 'red flags on record']
        };
        const waReads = pids.map(pid => {
          const p = sc(pid);
          let r = null;
          try {
            const wa = window.PDXWordAction;
            if (wa && typeof wa.read === 'function') r = wa.read(pid, p);
          } catch (e) {}
          return { name: p.name, r };
        });
        const sayable = waReads.filter(x => x.r && x.r.publishable && x.r.verdict && WA_PHRASE[x.r.verdict.key]);
        let spreadHtml;
        if (sayable.length) {
          const seen = new Map();
          sayable.forEach(x => {
            const k = x.r.verdict.key;
            if (!seen.has(k)) seen.set(k, { v: x.r.verdict, n: 0 });
            seen.get(k).n++;
          });
          const bits = ['consistent', 'mixed', 'contradicts', 'flag']
            .filter(k => seen.has(k))
            .map(k => {
              const e = seen.get(k);
              return `<span style="color:${e.v.color};">${e.n} ${WA_PHRASE[k][e.n === 1 ? 0 : 1]}</span>`;
            })
            .join(' · ');
          const unread = pids.length - sayable.length;
          spreadHtml = `<span class="cmp-insight-lead">${bits}</span>`
            + `<span class="cmp-insight-sub">Read for ${sayable.length} of ${pids.length} pick${pids.length !== 1 ? 's' : ''}${unread ? ` — the other ${unread} ${unread === 1 ? 'does' : 'do'} not have enough record matched to their stated positions yet` : ''}. Campaign pledges are measured inside this read, not ranked on their own.</span>`;
        } else {
          spreadHtml = `<span class="cmp-insight-sub">No pick here has enough record matched to its stated positions for a ⚖️ Word vs Action read yet — compare their documented positions below.</span>`;
        }

        const candCount = pids.filter(pid => statusOf(sc(pid)) === 'Candidate').length;
        const officeCount = pids.length - candCount;
        const lineupHtml = `<span class="cmp-insight-lead">${officeCount} in office · ${candCount} candidate${candCount !== 1 ? 's' : ''}</span>`
          + `<span class="cmp-insight-sub">${(candCount && officeCount) ? 'Mixed — track records vs. pledges' : candCount ? 'All candidates — compare pledges' : 'All hold office — compare records'}</span>`;

        // Issue Agreement — how the picks line up on the issues both have a
        // documented position on. Replaces the static Promise-Score-only read for
        // thin fields where the stances are the only real signal.
        const overlap = issueCmp.nAgree + issueCmp.nDiffer + issueCmp.nPartial;
        let issueHtml;
        if (overlap > 0) {
          const lead = issueCmp.nDiffer > issueCmp.nAgree
            ? `Differ on ${issueCmp.nDiffer} · agree on ${issueCmp.nAgree}`
            : `Agree on ${issueCmp.nAgree} · differ on ${issueCmp.nDiffer}`;
          const mineBit = issueCmp.nMineShared
            ? ` · <span class="cmp-insight-mine">🎯 ${issueCmp.nMineShared} of your issue${issueCmp.nMineShared !== 1 ? 's' : ''}</span>`
            : '';
          issueHtml = `<span class="cmp-insight-lead">${lead}</span>`
            + `<span class="cmp-insight-sub">Across ${overlap} issue${overlap !== 1 ? 's' : ''} both have a documented stance on${issueCmp.nPartial ? ' · ' + issueCmp.nPartial + ' mixed' : ''}${mineBit}</span>`;
        } else if (issueCmp.anyDocumented) {
          issueHtml = `<span class="cmp-insight-sub">No issue is documented for two of these picks yet — see each one's positions below.</span>`;
        } else if (issueCmp.anyRecord) {
          // NOT A VOID. There is no stated position to find common ground in, and
          // there is a formal file on every issue listed below, so the line says
          // which of those two facts it is rather than implying the second.
          const _recIssues = issueCmp.issues.filter(i => i.recCount > 0).length;
          issueHtml = `<span class="cmp-insight-lead">Records on file, no sourced positions</span>`
            + `<span class="cmp-insight-sub">Nobody here has a position we can quote yet — but ${_recIssues} issue${_recIssues !== 1 ? 's' : ''} below carry a formal record, compared as 🏛 what the record did.</span>`;
        } else {
          issueHtml = `<span class="cmp-insight-sub">Issue positions are still being documented for this lineup.</span>`;
        }

        insEl.innerHTML =
          `<div class="cmp-insight-card"><div class="cmp-insight-title">🤝 Common Ground</div><div class="cmp-insight-body">${commonBody}</div></div>`
          + `<div class="cmp-insight-card"><div class="cmp-insight-title">📊 Issue Agreement</div><div class="cmp-insight-body">${issueHtml}</div></div>`
          + `<div class="cmp-insight-card"><div class="cmp-insight-title">⚖️ Word vs Action</div><div class="cmp-insight-body">${spreadHtml}</div></div>`
          + `<div class="cmp-insight-card"><div class="cmp-insight-title">📋 Lineup</div><div class="cmp-insight-body">${lineupHtml}</div></div>`;
      }
    }

    const _getPhoto = (pid) => {
      if (typeof window._getPhotoUrl === 'function') return window._getPhotoUrl(pid) || '';
      if (typeof BROWSE_PHOTOS !== 'undefined' && BROWSE_PHOTOS[pid]) return BROWSE_PHOTOS[pid];
      return '';
    };

    thead.innerHTML = `<tr>
      <th class="cmp-row-label" style="background:rgba(10,15,30,0.98);"></th>
      ${pids.map(pid => {
        const p = sc(pid);
        // The column header used to carry the table's loudest percentage — a ring
        // reading "77%" off the pledge ledger. That figure is retired: the header
        // now reports the pledge RECEIPTS as counts, which is the attested part,
        // and leaves rating to ⚖️ Word vs Action on the profile. `_pdxDisplayScore`
        // survives here only as a has-a-closed-ledger flag, never as a figure.
        const hasLedger = (typeof window._pdxDisplayScore === 'function')
          ? (window._pdxDisplayScore(p) !== null && window._pdxDisplayScore(p) !== undefined)
          : false;
        const headCounts = (typeof window._pdxPledgeNote === 'function') ? window._pdxPledgeNote(p, 'short') : '';
        const headTrack = (!headCounts && typeof window._pdxTrackingNote === 'function')
          ? window._pdxTrackingNote(p, 'short') : '';
        const col = headCounts ? '#9fb4d4' : (headTrack ? '#f5c842' : 'rgba(159,180,212,0.35)');
        const photoUrl = _getPhoto(pid);
        const avatarHtml = photoUrl
          ? `<div class="cmp-col-avatar"><img loading="lazy" decoding="async" src="${photoUrl}" alt="${p.name}" onerror="this.style.display='none';this.parentElement.innerHTML='<div style=\\'display:flex;align-items:center;justify-content:center;width:100%;height:100%;font-size:1.5rem;\\'>${p.icon}</div>'"></div>`
          : `<div class="cmp-col-avatar" style="display:flex;align-items:center;justify-content:center;font-size:1.5rem;background:linear-gradient(135deg,rgba(30,53,96,0.7),rgba(10,15,30,0.8));">${p.icon}</div>`;
        return `<th style="min-width:${colW}px;background:rgba(10,15,30,0.98);">
          <div class="cmp-col-header">
            ${avatarHtml}
            <div class="cmp-col-name">${p.name}</div>
            <div class="cmp-col-office">${p.office} · ${p.state}</div>
            <div>${statusBadge(p, false)}</div>
            ${headCounts
              ? `<div class="cmp-score-note cmp-score-note-counts">🤝 ${headCounts}<br><span class="cmp-score-note-why">pledge receipts${hasLedger ? '' : ' · not itemized'}</span></div>`
              : (headTrack
                ? `<div class="cmp-score-note cmp-score-note-tracking">⏳ ${headTrack}</div>`
                : `<div class="cmp-score-note" style="color:${col};">No pledge record yet</div>`)}
            ${_alignActive ? (() => { const aScore = _alignBy[pid]; if (aScore === null || aScore === undefined) return '<div style="margin-top:0.4rem;"><span style="font-family:Barlow Condensed,sans-serif;font-size:0.58rem;color:#7e8aa3;font-weight:600;letter-spacing:0.05em;border:1px dashed rgba(159,180,212,0.3);padding:0.12rem 0.5rem;border-radius:999px;">🎯 No match data yet</span></div>'; const aCol = aScore >= 70 ? '#4ade80' : aScore >= 50 ? '#f5c842' : '#f87171'; const isLeader = pid === _alignLeaderPid; const crown = isLeader ? '<div style="margin-top:0.3rem;"><span style="font-family:Barlow Condensed,sans-serif;font-size:0.6rem;font-weight:800;letter-spacing:0.08em;text-transform:uppercase;color:#0b1020;background:linear-gradient(135deg,#fde68a,#f5c842);padding:0.14rem 0.6rem;border-radius:999px;box-shadow:0 2px 10px rgba(245,200,66,0.35);">🏆 Best Match</span></div>' : ''; return '<div style="margin-top:0.4rem;display:flex;flex-direction:column;align-items:center;gap:0.15rem;"><span style="font-family:Barlow Condensed,sans-serif;font-size:0.62rem;color:' + aCol + ';font-weight:800;letter-spacing:0.06em;border:1px solid ' + aCol + (isLeader ? '99' : '55') + ';background:' + aCol + (isLeader ? '24' : '14') + ';padding:0.12rem 0.55rem;border-radius:999px;">🎯 ' + aScore + '% Aligned</span>' + crown + '</div>'; })() : ''}
          </div>
        </th>`;
      }).join('')}
    </tr>`;

    const row = (label, cells, icon, cellClasses) => `<tr>
      <td class="cmp-row-label">${icon ? icon + ' ' : ''}${label}</td>
      ${pids.map((pid, i) => `<td class="${cellClasses && cellClasses[i] ? cellClasses[i] : ''}" style="text-align:center;">${cells[i]}</td>`).join('')}
    </tr>`;

    const sectionRow = (label) => `<tr class="cmp-section-divider"><td colspan="${pids.length + 1}">${label}</td></tr>`;

    let rows = '';

    // Each major section is assembled into its own string so the order can adapt
    // to the lineup. For thin/new fields with no Promise Scores, the documented
    // issue positions are the only real signal, so they lead instead of a wall of
    // "—" promise rows (see the `thinLineup` ordering below).
    let promiseBlock = '', alignBlock = '', focusBlock = '', standBlock = '';

    promiseBlock += sectionRow('🤝 Promise Receipts');
    // `_psVals` is a HAS-A-CLOSED-LEDGER flag, not a figure. Nothing below prints
    // it: the retired Promise Score row it used to fill is gone, and the counts
    // rows further down are the comparison now. It survives because the ordering
    // logic (`thinLineup`) needs to know which picks have any pledge record.
    const _psVals = pids.map(pid => { const s = window._pdxDisplayScore(sc(pid)); return (s === null || s === undefined) ? null : s; });
    // One row, counts only: what each pick actually settled, and what is still
    // open. A pick with a closed ledger reads as receipts; a pick with pledges
    // still in flight reads as tracking; a blank record reads as blank — and none
    // of the three gets rated here, because ⚖️ Word vs Action does the rating.
    promiseBlock += row('Pledges settled', pids.map(pid => {
      const p = sc(pid);
      const cn = (typeof window._pdxPledgeNote === 'function') ? window._pdxPledgeNote(p, 'short') : '';
      const pend = (typeof window._pdxPendingNote === 'function') ? window._pdxPendingNote(p) : '';
      if (cn) {
        const itemized = (typeof window._pdxHasItemizedPledges === 'function') ? window._pdxHasItemizedPledges(p) : false;
        return `<span class="cmp-ft-counts">🤝 ${cn}</span>`
          + (pend ? `<div class="cmp-score-note">${pend}</div>` : '')
          + `<div class="cmp-score-note-why">${itemized ? 'each pledge itemized' : 'counts on file · not itemized'}</div>`;
      }
      const track = (typeof window._pdxTrackingNote === 'function') ? window._pdxTrackingNote(p) : '';
      return track ? `<div class="cmp-score-note cmp-score-note-tracking">⏳ ${track}</div>` : na;
    }), '');
    promiseBlock += row('Promises Kept', pids.map(pid => {
      const p = sc(pid);
      return `<span class="cmp-stat-pill" style="background:rgba(74,222,128,0.12);border:1px solid rgba(74,222,128,0.25);color:#4ade80;">✓ ${p.kept}</span>`;
    }), '');
    promiseBlock += row('Promises Broken', pids.map(pid => {
      const p = sc(pid);
      return `<span class="cmp-stat-pill" style="background:rgba(248,113,113,0.12);border:1px solid rgba(248,113,113,0.25);color:#f87171;">✗ ${p.broken}</span>`;
    }), '');
    promiseBlock += row('Pending / In Progress', pids.map(pid => {
      const p = sc(pid);
      return `<span class="cmp-stat-pill" style="background:rgba(245,200,66,0.12);border:1px solid rgba(245,200,66,0.25);color:#f5c842;">⏳ ${p.pending}</span>`;
    }), '');
    promiseBlock += row('Office / Role', pids.map(pid => {
      const p = sc(pid);
      return `<span style="font-size:0.75rem;color:#9fb4d4;">${p.office}</span>`;
    }), '');
    promiseBlock += row('Party', pids.map(pid => {
      const p = sc(pid);
      return `<span style="font-family:'Barlow Condensed',sans-serif;font-size:0.78rem;font-weight:700;letter-spacing:0.08em;color:#9fb4d4;">${p.party}</span>`;
    }), '');
    promiseBlock += row('Status', pids.map(pid => statusBadge(sc(pid), true)), '');
    // Time in Office — how long each pick has actually held power, the accountability
    // context the Status badge alone doesn't convey. Sitting officeholders read in
    // green ("Since 2019 · N yrs"), former ones in steel ("2015–2023"). Only sitting
    // officeholders compete for the 👑 "Longest serving" badge so a former's past span
    // can't out-rank a current incumbent. Picks with no recorded start show "—".
    const _tenObjs = pids.map(pid => (typeof window._pdxTenure === 'function') ? window._pdxTenure(sc(pid)) : null);
    if (_tenObjs.some(Boolean)) {
      const _tenVals = _tenObjs.map(t => (t && t.current) ? t.years : null);
      const _tenLeader = leaderClasses(_tenVals);
      promiseBlock += row('Time in Office', pids.map((pid, i) => {
        const t = _tenObjs[i];
        if (!t) return na;
        const col = t.current ? '#86efac' : '#cbd5e1';
        const big = t.years >= 1 ? (t.years + ' yr' + (t.years === 1 ? '' : 's')) : '< 1 yr';
        const sub = t.current ? ('Since ' + t.start.year) : (t.start.year + '–' + (t.end ? t.end.year : ''));
        const lead = _tenLeader[i] ? '<div class="cmp-leader-badge">👑 Longest serving</div>' : '';
        return `<div style="display:flex;flex-direction:column;align-items:center;gap:0.18rem;">
            <span class="cmp-score-val" style="color:${col};font-size:1.2rem;">${big}</span>
            <span style="font-family:'Barlow Condensed',sans-serif;font-size:0.6rem;letter-spacing:0.05em;text-transform:uppercase;color:#9fb4d4;white-space:nowrap;">${sub}</span>
          </div>${lead}`;
      }), '🗓️', _tenLeader);
    }

    if (_alignActive) {
      alignBlock += sectionRow('🎯 Personalized Alignment');
      // A plain-language read on who fits best, right where the numbers are — so
      // the visitor doesn't have to eyeball the row to find their match.
      if (_alignLeaderPid) {
        const _lp = sc(_alignLeaderPid);
        const _lShort = (_lp.name || '').split(' ').pop() || _lp.name;
        alignBlock += `<tr class="cmp-issue-intro"><td colspan="${pids.length + 1}">`
          + `🏆 <strong style="color:#fde68a;">${_lShort}</strong> aligns with your issues best at <strong>${_alignLeaderScore}%</strong> — ranked first below. `
          + `Lower-matching picks follow; any with no documented positions yet can't be scored on your issues.`
          + `</td></tr>`;
      }
      const _alVals = pids.map(pid => _alignBy[pid]);
      const _alLeader = pids.map(pid => pid === _alignLeaderPid ? 'cmp-leader-cell' : '');
      alignBlock += row('🎯 Your Match', pids.map((pid, i) => {
        const alignScore = _alVals[i];
        if (alignScore === null || alignScore === undefined) return `<span class="cmp-na">—</span>`;
        const aCol = alignScore >= 70 ? '#4ade80' : alignScore >= 50 ? '#f5c842' : '#f87171';
        const crown = pid === _alignLeaderPid ? '<div class="cmp-leader-badge">👑 Best fit</div>' : '';
        return `<div style="display:flex;flex-direction:column;align-items:center;gap:0.2rem;">
          <div style="width:48px;height:48px;border-radius:50%;border:2px solid ${aCol}99;display:flex;align-items:center;justify-content:center;background:${aCol}14;font-family:'Bebas Neue',sans-serif;font-size:1.1rem;color:${aCol};">${alignScore}%</div>
          <span style="font-family:'Barlow Condensed',sans-serif;font-size:0.55rem;color:${aCol}99;letter-spacing:0.08em;text-transform:uppercase;">Alignment</span>
        </div>${crown}`;
      }), '🎯', _alLeader);

      // Say-vs-Do consistency row — the record-vs-words companion to Your Alignment,
      // shown directly beneath it so the two scores compare column-for-column. Honest
      // states: "Ltd" (stated positions, no record yet), "…" (loading), "—" (nothing
      // to check). Neutral: it measures whether votes back up words, not agreement.
      const _consBy = pids.map(pid => (typeof _calcConsistencyScore === 'function') ? _calcConsistencyScore(pid) : null);
      if (_consBy.some(c => c)) {
        alignBlock += row('⚖️ Say-vs-Do', pids.map((pid, i) => {
          const c = _consBy[i];
          if (!c) return `<span class="cmp-na">—</span>`;
          if (c.pending) return `<span class="cmp-na" title="Checking their voting record…">⚖️ …</span>`;
          if (c.score === null) return c.stated > 0
            ? `<span class="cmp-na" title="States positions; little or no voting record to verify yet" style="color:#b9add9;">⚖️ Ltd</span>`
            : `<span class="cmp-na">—</span>`;
          const cCol = c.score >= 70 ? '#4ade80' : c.score >= 50 ? '#f5c842' : '#f87171';
          const flag = c.contradictions > 0 ? `<span title="${c.contradictions} contradiction${c.contradictions === 1 ? '' : 's'}" style="font-family:'Barlow Condensed',sans-serif;font-size:0.5rem;font-weight:800;color:#fca5a5;background:rgba(248,113,113,0.14);border:1px solid rgba(248,113,113,0.45);padding:0.02rem 0.28rem;border-radius:999px;margin-top:0.15rem;display:inline-block;">⚑${c.contradictions}</span>` : '';
          return `<div style="display:flex;flex-direction:column;align-items:center;gap:0.15rem;">
            <div style="width:46px;height:46px;border-radius:50%;border:2px solid ${cCol}99;display:flex;align-items:center;justify-content:center;background:${cCol}14;font-family:'Bebas Neue',sans-serif;font-size:1.05rem;color:${cCol};">${c.score}%</div>
            <span style="font-family:'Barlow Condensed',sans-serif;font-size:0.55rem;color:${cCol}99;letter-spacing:0.06em;text-transform:uppercase;">⚖️ Say-vs-Do</span>${flag}
          </div>`;
        }), '⚖️');
      }
    }

    focusBlock += sectionRow('🎯 Key Issues & Focus Areas');
    focusBlock += row('Focus Areas', pids.map(pid => {
      const p = sc(pid);
      return `<div style="display:flex;flex-wrap:wrap;gap:0.3rem;justify-content:center;">${(p.issues && p.issues.length) ? p.issues.slice(0,3).map(i => {
        const shared = sharedIssues.has(i.trim());
        return `<span class="cmp-tag"${shared ? ' style="background:rgba(74,222,128,0.14);border-color:rgba(74,222,128,0.35);color:#6ee7a0;" title="Shared focus area"' : ''}>${i}</span>`;
      }).join('') : (typeof window._pdxFocusEmptyNote === 'function' ? window._pdxFocusEmptyNote(p, { center: true }) : '')}</div>`;
    }), '');

    // ── Money & Funding — who bankrolls each pick ──────────────────────────
    // Pulled from the curated Follow-the-Money records (window._pdxFunding), which
    // are keyed the same way this table is. Rendered only when at least one pick
    // has funding on file; picks without simply read "Not on file" — never a
    // fabricated figure. Three rows keep it scannable: how much they raised, their
    // single biggest funder, and how grassroots vs. big-money that support is.
    let moneyBlock = '';
    const _cmpEsc = (t) => String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    const _fundBy = {};
    let _anyFund = false;
    pids.forEach(pid => {
      const f = (typeof window._pdxFunding === 'function') ? window._pdxFunding(pid) : null;
      _fundBy[pid] = f;
      if (f) _anyFund = true;
    });
    if (_anyFund) {
      moneyBlock += sectionRow('💰 Money & Funding');
      moneyBlock += `<tr class="cmp-issue-intro"><td colspan="${pids.length + 1}">`
        + `Who bankrolls each pick — from public FEC / OpenSecrets filings. `
        + `<strong><span class="cmp-issue-agree-ico">🌱 Grassroots</span></strong> funding leans on small-dollar donors; `
        + `<strong><span class="cmp-issue-differ-ico">🏦 Big-money</span></strong> leans on named mega-donors, PACs and industries. `
        + `Donations are legal and don't imply corruption — this is about <em>who has financial access</em>.`
        + `</td></tr>`;

      // Total raised. The biggest war chest is highlighted (not crowned "best" —
      // more money isn't a virtue), so a voter can see the spending gap at a glance.
      const _raisedVals = pids.map(pid => _fundBy[pid] ? _fundBy[pid].raised : null);
      const _raisedLeader = leaderClasses(_raisedVals);
      moneyBlock += row('Total Raised', pids.map((pid, i) => {
        const f = _fundBy[pid];
        if (!f) return `<span class="cmp-fund-none">Not on file</span>`;
        const lead = _raisedLeader[i] ? '<div class="cmp-leader-badge cmp-leader-neutral">💰 Largest war chest</div>' : '';
        return `<span class="cmp-score-val cmp-fund-raised">${f.raisedFmt}</span>${lead}`;
      }), '', _raisedLeader);

      // Top funder — the single "who's behind them" headline.
      moneyBlock += row('Top Funder', pids.map(pid => {
        const f = _fundBy[pid];
        if (!f || !f.topFunder) return na;
        return `<div class="cmp-fund-top">`
          + `<span class="cmp-fund-top-name">${_cmpEsc(f.topFunder.name)}</span>`
          + `<span class="cmp-fund-top-amt">${f.topFunder.amountFmt}</span>`
          + `</div>`;
      }), '');

      // Funding base — grassroots vs. big-money, the character read that turns two
      // dollar figures into an actual contrast a voter can weigh.
      moneyBlock += row('Funding Base', pids.map(pid => {
        const f = _fundBy[pid];
        if (!f || !f.character) return na;
        const c = f.character;
        const cls = c.kind === 'grassroots' ? 'is-grass' : c.kind === 'bigmoney' ? 'is-big' : c.kind === 'mixed' ? 'is-mixed' : 'is-unknown';
        return `<span class="cmp-fund-base ${cls}">${c.icon} ${_cmpEsc(c.label)}</span>`;
      }), '');

      // A one-tap path to the primary source for anyone who wants to verify.
      moneyBlock += row('Source', pids.map(pid => {
        const f = _fundBy[pid];
        if (!f) return na;
        return `<a class="cmp-fund-src" href="${_cmpEsc(f.source)}" target="_blank" rel="noopener noreferrer">📄 Filings ↗</a>`;
      }), '');
    }

    // Is this a thin field? When 2+ picks are compared, at least one has a
    // documented issue position, and NONE has a settled pledge record, the
    // traditional record rows are empty — so we lead with where they actually
    // stand. (`_psVals` is the has-a-ledger flag here, not a score.)
    const _anyScore = pids.some((pid, i) => _psVals[i] !== null && _psVals[i] !== undefined);
    const thinLineup = pids.length >= 2 && issueCmp.anyDocumented && !_anyScore;

    if (issueCmp.anyDocumented || issueCmp.anyRecord) {
      // ── Where They Stand — issue-by-issue, from documented ISSUE_STANCE_DATA.
      // This is the heart of comparing thin/new candidates: it lines up each
      // pick's real positions on the same issue so agreement and contrast are
      // obvious, with no fabricated stances — a pick with nothing on file simply
      // reads "Not documented yet".
      standBlock += sectionRow(issueCmp.anyDocumented
        ? '🏛 Where They Stand — Issue by Issue'
        : '🏛 What Their Records Did — Issue by Issue');
      const nCols = pids.length + 1;
      // Lead-in adapts: when the visitor has set Alignment, point out that their
      // own flagged issues are pulled to the top; otherwise the standard read.
      const mineLead = (issueCmp.mineActive && issueCmp.nMineShared)
        ? `<strong><span class="cmp-issue-mine-ico">🎯 ${issueCmp.nMineShared} of your issue${issueCmp.nMineShared !== 1 ? 's' : ''}</span></strong> ${issueCmp.nMineShared !== 1 ? 'are' : 'is'} pulled to the top — the positions you flagged in the Alignment Tool, compared head-to-head. `
        : '';
      const thinLead = thinLineup
        ? `<strong style="color:#cbd9ec;">These are new candidates with no record to test yet</strong>, so their documented positions are the clearest way to compare them. `
        : '';
      // Two lanes, named. The 🏛 line only appears when a record row is actually
      // on the board, and it says out loud that a record is not a stance — the one
      // sentence that keeps an outlined cell from being read as a quote.
      const recLead = issueCmp.anyRecord
        ? ` Where a pick has no sourced position but does have a formal file, the cell shows <strong>what their record did</strong> under a 🏛 mark — that is the record, not a stated position, and it is never counted as agreement or difference.`
        : '';
      const standLead = issueCmp.anyDocumented
        ? `Real positions from each one's public record — so even a new candidate with nothing settled can still be compared on where they stand. `
          + `<strong><span class="cmp-issue-agree-ico">✓ Agree</span></strong> and <strong><span class="cmp-issue-differ-ico">✗ Differ</span></strong> mark issues where two or more picks each have a documented position.`
        : `None of these picks has a sourced position we can quote yet — but their formal records are on file, so this compares what those records actually did.`;
      standBlock += `<tr class="cmp-issue-intro"><td colspan="${nCols}">`
        + thinLead + mineLead + standLead + recLead
        + `</td></tr>`;

      // ── Four-state stance legend — decodes the canonical window.PDXStance pills
      // shown in every cell (Supported / Opposed / Mixed / No Clear Position),
      // built straight from PDXStance.STATES so its colours and labels can never
      // drift from the pills themselves.
      const _PDX = window.PDXStance;
      if (_PDX && _PDX.ORDER) {
        const legItems = _PDX.ORDER.map(k => {
          const s = _PDX.STATES[k];
          return `<span class="cmp-stance-lg"><i style="background:${s.color};"></i>${_PDX.esc(s.label)}</span>`;
        }).join('');
        standBlock += `<tr class="cmp-issue-intro"><td colspan="${nCols}">`
          + `<div class="cmp-stance-legend">${legItems}</div></td></tr>`;
      }

      // ── Overlap meter: turns the agree / differ / mixed counts into one bar so
      // the shape of where these picks line up is readable before a single row.
      const _mShared = issueCmp.nAgree + issueCmp.nDiffer + issueCmp.nPartial;
      const _mSolo = issueCmp.issues.filter(i => i.count === 1).length;
      const _mRec = issueCmp.issues.filter(i => i.count === 0).length;
      if (_mShared > 0) {
        const pct = (n) => (100 * n / _mShared).toFixed(1) + '%';
        const seg = (n, cls) => n > 0 ? `<div class="seg ${cls}" style="width:${pct(n)}"></div>` : '';
        const leg = (n, k, lbl) => n > 0 ? `<span><i class="${k}"></i><b>${n}</b> ${lbl}</span>` : '';
        standBlock += `<tr class="cmp-issue-intro"><td colspan="${nCols}" style="padding:0;border:0;background:transparent;">`
          + `<div class="cmp-issue-meter-wrap">`
          + `<div class="cmp-issue-meter">${seg(issueCmp.nDiffer,'seg-differ')}${seg(issueCmp.nPartial,'seg-partial')}${seg(issueCmp.nAgree,'seg-agree')}</div>`
          + `<div class="cmp-issue-meter-legend">`
          + leg(issueCmp.nDiffer, 'k-differ', 'differ')
          + leg(issueCmp.nAgree, 'k-agree', 'agree')
          + leg(issueCmp.nPartial, 'k-partial', 'mixed')
          + leg(_mSolo, 'k-solo', 'one side only')
          + leg(_mRec, 'k-record', 'record only')
          + `</div></div></td></tr>`;
      }

      // ── Filter chips: jump straight to the contrasts, the common ground, or the
      // issues the visitor flagged in the Alignment Tool. Each carries a live
      // count and only appears when it would match something.
      const _chip = (mode, extraCls, label, n) =>
        `<button class="cmp-issue-fbtn${extraCls ? ' ' + extraCls : ''}${_cmpIssueFilterMode === mode ? ' active' : ''}" data-cmp-fmode="${mode}" onclick="_cmpFilterIssues('${mode}')">${label}<span class="cmp-fb-n"> (${n})</span></button>`;
      let chips = `<span class="cmp-fb-label">Show</span>` + _chip('all', '', 'All', issueCmp.total);
      if (issueCmp.nDiffer > 0) chips += _chip('differ', 'fb-differ', '✗ Differences', issueCmp.nDiffer);
      if (issueCmp.nAgree > 0)  chips += _chip('agree', 'fb-agree', '✓ Common ground', issueCmp.nAgree);
      if (issueCmp.mineActive && issueCmp.nMine > 0) chips += _chip('mine', 'fb-mine', '🎯 Your issues', issueCmp.nMine);
      // Only worth a toolbar when there is more than one thing to switch between.
      const _hasFilters = (issueCmp.nDiffer > 0) || (issueCmp.nAgree > 0) || (issueCmp.mineActive && issueCmp.nMine > 0);
      if (_hasFilters) {
        standBlock += `<tr class="cmp-issue-toolbar" id="cmp-issue-toolbar" data-cap="${_CMP_ISSUE_CAP}" data-total="${issueCmp.total}"><td colspan="${nCols}"><div class="cmp-issue-fbtns">${chips}</div></td></tr>`;
      }

      const badgeMeta = {
        agree:   { cls:'is-agree',   ico:'✓', lbl:'Agree' },
        differ:  { cls:'is-differ',  ico:'✗', lbl:'Differ' },
        partial: { cls:'is-partial', ico:'~', lbl:'Mixed' },
        solo:    { cls:'is-solo',    ico:'•', lbl:'1 documented' },
        record:  { cls:'is-record',  ico:'🏛', lbl:'Record only' },
      };
      // Render every documented issue (no longer capped to a dead-end). Rows past
      // the cap start hidden and are revealed by the inline "Show all" toggle, so
      // nothing is lost off-screen and the comparison stays inside the tool.
      issueCmp.issues.forEach((iss, idx) => {
        const bm = badgeMeta[iss.agreement] || badgeMeta.solo;
        const overCap = idx >= _CMP_ISSUE_CAP;
        const rowCls = (iss.mine ? 'cmp-issue-mine-row ' : '')
                     + (iss.agreement === 'agree' ? 'cmp-issue-agree-row'
                      : iss.agreement === 'differ' ? 'cmp-issue-differ-row' : '')
                     + (overCap ? ' cmp-issue-hidden' : '');
        // "🎯 Your issue" flags a topic the visitor chose to weigh — it marks
        // interest, not agreement; the cells below still show each real stance.
        // When the visitor has a SAVED directional position on this exact issue,
        // show it as a "You: 👍 Support" chip instead — that turns the row into a
        // literal "Your Stance vs Their Record" line (your direction here, their
        // documented record in the cells).
        let youChip = '';
        try { if (iss.issueKey && window.PDXStances && typeof window.PDXStances.myStanceChip === 'function') youChip = window.PDXStances.myStanceChip(iss.issueKey) || ''; } catch (e) { youChip = ''; }
        const mineTag = youChip
          ? `<div class="cmp-issue-you">${youChip}</div>`
          : (iss.mine ? `<div><span class="cmp-issue-mine-badge">🎯 Your issue</span></div>` : '');
        const mandateTag = (iss.issueKey && typeof window._pdxMandateChip === 'function')
          ? window._pdxMandateChip(iss.issueKey, { compact: true }) : '';
        // "See everyone's evidence ↗" — the broad counterpart to the per-cell
        // drill-in. A single cell click opens the Locker for ONE pick on this
        // issue; this opens it for the WHOLE issue (every politician on record),
        // carrying the current lineup along as context. Shown when the issue has
        // a tracked key the Locker can filter on AND there's evidence on record
        // for it (or the library hasn't loaded yet, so we can't rule it out) — so
        // the link never lands on an empty file.
        let _allEvOk = !!(iss.issueKey && typeof window._pdxOpenEvidenceLocker === 'function');
        if (_allEvOk && typeof window._pdxEvidenceOnRecord === 'function') {
          const _onRec = window._pdxEvidenceOnRecord([iss.issueKey]);   // null = library still loading
          if (_onRec !== null && _onRec.length === 0) _allEvOk = false;
        }
        const allEv = _allEvOk
          ? `<div><button type="button" class="cmp-issue-allev" onclick="_cmpOpenIssueEvidence('${String(iss.issueKey).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}')" title="Open the Evidence Locker on this issue — everyone on record, with the picks you're comparing highlighted">📂 See everyone’s evidence ↗</button></div>`
          : '';
        const labelCell = `<td class="cmp-row-label cmp-issue-label">${iss.label}`
          + mineTag
          + _cmpAxisHint(iss.issueKey)
          + (mandateTag ? `<div style="margin-top:0.25rem;">${mandateTag}</div>` : '')
          + `<div><span class="cmp-issue-agree-badge ${bm.cls}">${bm.ico} ${bm.lbl}</span></div>`
          + allEv + `</td>`;
        const cells = iss.cells.map((c, ci) => {
          // Consistency dot placeholder (stance vs. actual votes), hydrated from
          // /api/voting-record/compare. Only where the issue has a tracked key.
          const vdot = iss.issueKey ? `<span class="cmp-vdot" data-vrdot="${pids[ci]}|${iss.issueKey}"></span>` : '';
          return `<td style="text-align:center;vertical-align:top;">${_cmpIssueCell(c, pids[ci], iss.issueKey)}${vdot}</td>`;
        }).join('');
        // Tag the row with its topic category so the Priorities dashboard can
        // open this overlay focused on one specific issue (scroll + highlight).
        const issCat = (iss.issueKey && typeof window._pdxIssueCatOf === 'function') ? window._pdxIssueCatOf(iss.issueKey) : '';
        standBlock += `<tr class="${rowCls.trim()}" data-cmp-issue="1" data-idx="${idx}" data-agreement="${iss.agreement}" data-mine="${iss.mine ? '1' : '0'}" data-cmp-cat="${issCat}">${labelCell}${cells}</tr>`;
      });
      // Empty state for when a filter matches nothing — hidden until a filter
      // applies and the rows it would show don't exist for this lineup.
      standBlock += `<tr class="cmp-issue-empty cmp-issue-hidden" id="cmp-issue-empty"><td colspan="${nCols}"></td></tr>`;
      // Inline expand/collapse replacing the old "open a profile" dead-end.
      if (issueCmp.total > _CMP_ISSUE_CAP) {
        const extra = issueCmp.total - _CMP_ISSUE_CAP;
        standBlock += `<tr class="cmp-issue-showall" id="cmp-issue-showall" data-total="${issueCmp.total}"><td colspan="${nCols}">`
          + `<button class="cmp-issue-showall-btn" onclick="_cmpToggleAllIssues()">▾ Show all ${issueCmp.total} issues (${extra} more)</button>`
          + `</td></tr>`;
      }
    } else {
      // Fallback for the rare lineup with no documented issue positions at all:
      // the legacy curated head-to-head on a fixed set of high-salience topics.
      standBlock += sectionRow('🏛 Policy Positions — Head to Head');
      const stanceLabels = [
        ['border',      '🛡 Border / Immigration'],
        ['debt',        '💰 Debt / Spending'],
        ['gun',         '🔫 Second Amendment'],
        ['termLimits',  '⏳ Term Limits'],
        ['campaign',    '💸 Campaign Finance'],
        ['dataCenters', '🖥 Data Centers / Tech'],
        ['healthcare',  '🏥 Healthcare'],
        ['audit',       '🏦 Audit the Fed'],
      ];
      stanceLabels.forEach(([key, label]) => {
        standBlock += row(label, pids.map(pid => {
          const stance = CMP_DATA[pid]?.stances?.[key] || '—';
          if (stance === 'N/A' || stance === '—') return na;
          const color = stance.includes('❌') ? '#f87171' : stance.includes('🔥') ? '#fb923c' : '#9fb4d4';
          return `<div class="cmp-stance-cell" style="color:${color};">${stance}</div>`;
        }), '');
      });
    }

    // Order the assembled sections. Thin fields lead with the personal Alignment
    // read and the documented positions (the only real signal); established
    // lineups keep the record-first order. Money & Funding sits alongside the
    // record — high-signal accountability context, after the promise/alignment read.
    rows += thinLineup
      ? (alignBlock + standBlock + focusBlock + moneyBlock + promiseBlock)
      : (promiseBlock + alignBlock + moneyBlock + focusBlock + standBlock);

    rows += sectionRow('🔗 Actions');
    rows += row('Add to My Team', pids.map(pid => {
      const onTeam = (typeof window._pdxIsOnTeam === 'function') && window._pdxIsOnTeam(pid);
      return `<button class="cmp-btn-team${onTeam ? ' on-team' : ''}" onclick="_cmpToggleTeam('${pid}', this)">${onTeam ? '✓ On Your Team' : '⭐ Add to Team'}</button>`;
    }), '');
    rows += row('Full Profile', pids.map(pid => {
      return `<button class="cmp-btn-profile" onclick="closeCompare();setTimeout(()=>openModal('${pid}'),280)">
        <svg style="width:0.7rem;height:0.7rem;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
        View Profile
      </button>`;
    }), '');
    rows += row('Remove', pids.map(pid => {
      const p = sc(pid);
      return `<button class="cmp-remove-col-btn" onclick="removeCmpPid('${pid}')">✕ Remove ${p.name.split(' ').pop()}</button>`;
    }), '');

    tbody.innerHTML = rows;
    _cmpRenderGuide();
    _cmpRenderVerdict(pids);
    _cmpRenderCoach(pids);
    _cmpRenderFooter(pids);
    // Light up the head-to-head consistency dots (stance vs. actual votes) via one
    // batched /api/voting-record/compare call. Additive — no-op if unavailable.
    // The record-direction pass rides the same cached request: it fills the empty
    // cells (no documented position) with what that member's record actually did,
    // and skips every pair the dot above already scored.
    if (typeof window._pdxHydrateVoteDots === 'function') {
      setTimeout(function () { try { window._pdxHydrateVoteDots(document.getElementById('compare-overlay')); } catch (e) {} }, 0);
    }
    if (typeof window._pdxHydrateRecordDirection === 'function') {
      setTimeout(function () { try { window._pdxHydrateRecordDirection(document.getElementById('compare-overlay')); } catch (e) {} }, 0);
    }

    // ── ONE SECOND LOOK, AND ONLY WHERE THERE IS NOTHING TO DISTURB ───────────
    // The hydration passes above fill cells that are already on screen. They
    // cannot help the one case where the issue section is absent entirely: no
    // pick has a sourced position AND the formal index was cold, so the model
    // could not see the records either and there were no rows to hydrate.
    //
    // So when exactly that happened, warm the batched fetch once and rebuild.
    // Guarded per lineup and never repeated, because a rebuild throws away the
    // visitor's filter and scroll — which is why it is refused in every other
    // state, including the far more common one where the section IS showing and
    // a few more rows would be nice. Nothing was on screen here to throw away.
    if (issueCmp && issueCmp.recCold && !issueCmp.anyDocumented && !issueCmp.anyRecord &&
        pids.length >= 2 && window.PDXVotingRecord && typeof window.PDXVotingRecord.fetchCompare === 'function') {
      const warmKey = pids.slice().sort().join(',');
      if (_cmpRecWarmed !== warmKey) {
        _cmpRecWarmed = warmKey;
        window.PDXVotingRecord.fetchCompare(pids).then(function () {
          try {
            const ov = document.getElementById('compare-overlay');
            if (ov && ov.style.display !== 'none') _buildCmpTable();
          } catch (e) {}
        });
      }
    }
  }

  // ── Issue-section filtering & expansion ──────────────────────────────────
  // Operate on the already-rendered rows (no table rebuild) so switching views
  // is instant. A row is visible when it passes the active filter AND isn't
  // hidden by the overflow cap. Filtering to a subset (differences / common
  // ground / your issues) always reveals every match, since those sets are
  // naturally short and the visitor explicitly narrowed.
  function _cmpApplyIssueView() {
    const rows = document.querySelectorAll('#cmp-tbody tr[data-cmp-issue]');
    if (!rows.length) return;
    const mode = _cmpIssueFilterMode;
    const capActive = (mode === 'all' && !_cmpIssueExpanded);
    let visible = 0;
    rows.forEach(r => {
      const agree = r.getAttribute('data-agreement');
      const mine = r.getAttribute('data-mine') === '1';
      const idx = parseInt(r.getAttribute('data-idx'), 10) || 0;
      let pass = true;
      if (mode === 'differ') pass = (agree === 'differ');
      else if (mode === 'agree') pass = (agree === 'agree');
      else if (mode === 'mine') pass = mine;
      const show = pass && !(capActive && idx >= _CMP_ISSUE_CAP);
      r.classList.toggle('cmp-issue-hidden', !show);
      if (show) visible++;
    });
    // Sync chip active state.
    document.querySelectorAll('#cmp-issue-toolbar [data-cmp-fmode]').forEach(b => {
      b.classList.toggle('active', b.getAttribute('data-cmp-fmode') === mode);
    });
    // The expand toggle only belongs in the unfiltered "all" view.
    const showall = document.getElementById('cmp-issue-showall');
    if (showall) {
      showall.classList.toggle('cmp-issue-hidden', mode !== 'all');
      const btn = showall.querySelector('.cmp-issue-showall-btn');
      const total = parseInt(showall.getAttribute('data-total'), 10) || 0;
      if (btn) {
        btn.textContent = _cmpIssueExpanded
          ? '▴ Show fewer'
          : '▾ Show all ' + total + ' issues (' + Math.max(0, total - _CMP_ISSUE_CAP) + ' more)';
      }
    }
    // Empty-state row when a filter matches nothing in this lineup.
    const empty = document.getElementById('cmp-issue-empty');
    if (empty) {
      const labels = { differ: 'differences', agree: 'common ground', mine: 'flagged issues' };
      empty.classList.toggle('cmp-issue-hidden', visible > 0);
      const cell = empty.querySelector('td');
      if (cell && visible === 0) {
        cell.textContent = 'No ' + (labels[mode] || 'issues') + ' among these picks — switch back to All to see every documented position.';
      }
    }
  }
  window._cmpFilterIssues = function(mode) {
    _cmpIssueFilterMode = mode || 'all';
    _cmpApplyIssueView();
  };
  window._cmpToggleAllIssues = function() {
    _cmpIssueExpanded = !_cmpIssueExpanded;
    _cmpApplyIssueView();
  };

  // Bring one topic category into view inside the open Compare overlay: clear any
  // active issue filter, reveal every row (so a capped-off topic isn't hidden),
  // then scroll the first row in that category into the centre and flash it. Used
  // by the "My Priorities" dashboard's per-issue "Compare on this issue" button so
  // the voter lands directly on how their Home Team differs on that one topic.
  window._cmpFocusCategory = function(catKey) {
    try {
      if (!catKey) return;
      _cmpIssueFilterMode = 'all';
      _cmpIssueExpanded = true;
      try { _cmpApplyIssueView(); } catch (e) {}
      var esc = (window.CSS && CSS.escape) ? CSS.escape(catKey) : String(catKey).replace(/"/g, '\\"');
      var rows = document.querySelectorAll('#cmp-table tr[data-cmp-cat="' + esc + '"]');
      if (!rows || !rows.length) return;
      Array.prototype.forEach.call(rows, function(r) {
        r.classList.remove('cmp-issue-hidden');
        r.classList.add('cmp-issue-flash');
        setTimeout(function() { try { r.classList.remove('cmp-issue-flash'); } catch (e) {} }, 2600);
      });
      var first = rows[0];
      if (first && first.scrollIntoView) {
        try { first.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
        catch (e) { try { first.scrollIntoView(); } catch (e2) {} }
      }
    } catch (e) {}
  };

  // Show the "how to read this" guide unless the visitor dismissed it before.
  function _cmpRenderGuide() {
    const g = document.getElementById('cmp-guide');
    if (!g) return;
    let dismissed = false;
    try { dismissed = localStorage.getItem('pdx_cmp_guide_dismissed') === '1'; } catch (e) {}
    g.style.display = dismissed ? 'none' : '';
  }
  window.cmpDismissGuide = function() {
    const g = document.getElementById('cmp-guide');
    if (g) g.style.display = 'none';
    try { localStorage.setItem('pdx_cmp_guide_dismissed', '1'); } catch (e) {}
  };

  // ── The Bottom Line ────────────────────────────────────────────────────
  // The comparison table lays out pledge receipts, accountability and personal
  // Alignment in separate rows — but a first-time voter still has to combine those
  // in their head to reach a decision. This reads them together and states one
  // honest, plain-language recommendation, so the tools add up to an actual call
  // instead of disconnected stats. Read-only over the same data the table already
  // shows; it never invents a score.
  //
  // The record basis is now ⚖️ Word vs Action — the site's one integrity read —
  // rather than the retired pledge percentage. That is a demotion of arithmetic,
  // not of substance: Word vs Action pools the pledges this verdict used to divide
  // together with stated positions and issue branding, and tests all of it against
  // the roll-call record, so "strongest record" means the same thing it always
  // claimed to and is now backed by the number the profile actually publishes.
  function _cmpVerdictWordAction(pid, p) {
    var WA = window.PDXWordAction;
    if (!WA || typeof WA.read !== 'function') return null;
    try {
      var r = WA.read(pid, p);
      if (!r || !r.publishable || r.pct === null || r.pct === undefined) return null;
      return { pct: r.pct, verdict: r.verdict, tested: (r.coverage && r.coverage.tested) || 0 };
    } catch (e) { return null; }
  }
  // NO _cmpVerdictPledges() HERE, DELIBERATELY. There used to be one, returning the
  // settled pledge tally so the Bottom Line could append "…with 6 kept and 3 broken
  // pledges on file" to the sentence that states the ⚖️ Word vs Action read. Its
  // comment called it a tie-breaker; nothing ever broke a tie with it. All it did
  // was put a second set of counts inside the one verdict sentence, which is the
  // most expensive place on this surface for a reader to have to choose between two
  // numbers. A pledge is one FORM OF "said": word-action.js already tested it, so
  // it is inside `standout.score` and inside `standout.tested`, and saying it twice
  // does not say it better. The pledge data and the kept/broken/pending logic are
  // untouched and still published on each profile beside their own disclosure.
  function _cmpVerdictIsCandidate(p) {
    return /candidate|nominee/i.test(p.office || '');
  }
  function _cmpRenderVerdict(pids) {
    const el = document.getElementById('cmp-verdict');
    if (!el) return;
    // A verdict only means something with a real side-by-side; the coaching
    // banner handles the single-pick case.
    if (!pids || pids.length < 2) { el.innerHTML = ''; return; }

    const hasAlignment = (typeof _alignIssues !== 'undefined' && _alignIssues.size > 0);
    const recs = pids.map(pid => {
      const p = CMP_DATA[pid];
      const wa = _cmpVerdictWordAction(pid, p);
      const align = (hasAlignment && typeof _calcAlignmentScore === 'function') ? _calcAlignmentScore(pid) : null;
      return {
        pid,
        short: (p.name || '').split(' ').pop() || p.name,
        // `score` is the ⚖️ Word vs Action percentage — the one published read.
        score: wa ? wa.pct : null,
        waVerdict: (wa && wa.verdict && wa.verdict.label) ? wa.verdict.label : null,
        tested: wa ? wa.tested : 0,
        align: (align === null || align === undefined) ? null : align,
        isCand: _cmpVerdictIsCandidate(p),
        onTeam: (typeof window._pdxIsOnTeam === 'function') && window._pdxIsOnTeam(pid),
      };
    });

    // Pick the strongest pick and the basis we judged on. Alignment leads when
    // the visitor has set it (it answers "fits ME?"); otherwise we fall back to
    // the public record (Word vs Action, ties broken by how much was tested).
    const bestBy = (arr, key, tie) => arr.reduce((a, b) => {
      if (b[key] > a[key]) return b;
      if (b[key] === a[key] && tie && (b[tie] || 0) > (a[tie] || 0)) return b;
      return a;
    });
    let standout = null, basis = null, close = false;
    if (hasAlignment) {
      const withA = recs.filter(r => r.align !== null);
      if (withA.length) {
        standout = bestBy(withA, 'align', 'score');
        basis = 'alignment';
        const others = withA.filter(r => r !== standout);
        close = others.length > 0 && (standout.align - Math.max(...others.map(r => r.align))) <= 3;
      }
    }
    if (!standout) {
      const withS = recs.filter(r => r.score !== null);
      if (withS.length) {
        standout = bestBy(withS, 'score', 'tested');
        basis = 'record';
        const others = withS.filter(r => r !== standout);
        close = others.length > 0 && (standout.score - Math.max(...others.map(r => r.score))) <= 4;
      }
    }

    let kicker, lead, body, neutral = false;
    if (!standout) {
      // Nobody has a testable record or an alignment read yet — almost always an
      // all-new field of 2026 candidates. Don't fake a winner; point at the tools
      // that actually apply.
      neutral = true;
      kicker = 'The Bottom Line';
      lead = `There's no testable record here yet`;
      body = hasAlignment
        ? `Nothing they've said has been put to a vote yet, so weigh them on the <strong>policy positions</strong> below. Their personal <strong>🎯 Alignment</strong> match is your best signal here.`
        : `Nothing they've said has been put to a vote yet. Weigh them on the <strong>policy positions</strong> below, or set the <strong>🎯 Alignment Tool</strong> to see which one fits your values.`;
    } else if (basis === 'alignment') {
      kicker = 'The Bottom Line · Best fit for you';
      const hasScore = standout.score !== null;
      const recordBit = hasScore ? ` and their record backs their word <strong>${standout.score}%</strong> of the time it's been tested` : '';
      lead = close
        ? `It's close — <strong>${standout.short}</strong> edges ahead on your issues`
        : `<strong>${standout.short}</strong> is your strongest match`;
      const togetherBit = hasScore
        ? `Alignment shows they're with you on <em style="color:#c4b5fd;font-style:normal;">your</em> issues; <strong>⚖️ Word vs Action</strong> shows whether they act on what they say — ${standout.short} reads well on both.`
        : `Alignment shows they're with you on <em style="color:#c4b5fd;font-style:normal;">your</em> issues. Nothing they've said has been tested against a vote yet, so weigh the policy positions below alongside that match.`;
      body = `Based on the positions you set, ${standout.short} aligns with you most at <strong>${standout.align}%</strong>${recordBit}. ` +
             togetherBit +
             (close ? ` The runner-up is right behind, so skim the policy rows before you commit.` : '');
    } else {
      kicker = 'The Bottom Line · Strongest record';
      lead = close
        ? `It's close — <strong>${standout.short}</strong> has the slight edge on record`
        : `<strong>${standout.short}</strong> has the strongest track record`;
      body = `${standout.short} leads on <strong>⚖️ Word vs Action</strong> at <strong>${standout.score}%</strong>. ` +
             `That's the one accountability read — how often the record backs up what they said, across ${standout.tested} tested position${standout.tested === 1 ? '' : 's'}, campaign pledges included. ` +
             `<strong>Set the 🎯 Alignment Tool</strong> to also see who fits <em style="color:#93c5fd;font-style:normal;">your</em> values, not just who keeps their word.` +
             (close ? ` It's a tight race — the policy rows below break the tie.` : '');
    }

    // Next step, right in the verdict: claim the standout for the team, and/or
    // unlock the personalized read when alignment isn't set yet.
    let actions = '';
    if (standout) {
      actions += standout.onTeam
        ? `<button class="cmp-btn-team on-team" onclick="_cmpToggleTeam('${standout.pid}', this)">✓ ${standout.short} on your team</button>`
        : `<button class="cmp-btn-team" onclick="_cmpToggleTeam('${standout.pid}', this)">⭐ Add ${standout.short} to Team</button>`;
    }
    if (!hasAlignment) {
      actions += `<button class="cmp-footer-btn cmp-footer-btn-ghost" onclick="closeCompare();setTimeout(function(){var a=document.getElementById('alignment-panel');if(a){a.scrollIntoView({behavior:'smooth',block:'center'});if(typeof alignTogglePanel==='function')alignTogglePanel(true);}},320)">🎯 Set Your Alignment</button>`;
    }

    el.innerHTML =
      `<div class="cmp-verdict-card${neutral ? ' cmp-verdict-neutral' : ''}">` +
        `<div class="cmp-verdict-main">` +
          `<span class="cmp-verdict-ico">${neutral ? '🧭' : '🏅'}</span>` +
          `<div style="min-width:0;">` +
            `<div class="cmp-verdict-kicker">${kicker}</div>` +
            `<div class="cmp-verdict-lead">${lead}</div>` +
            `<div class="cmp-verdict-body">${body}</div>` +
          `</div>` +
        `</div>` +
        (actions ? `<div class="cmp-verdict-actions">${actions}</div>` : '') +
      `</div>`;
  }

  // Build the contextual next-steps footer. Guides the visitor from "I've
  // compared" to a concrete decision — pick someone, set up alignment, or
  // go find more people to weigh.
  function _cmpRenderFooter(pids) {
    const f = document.getElementById('cmp-footer');
    if (!f) return;
    // With fewer than two picks there is nothing to weigh yet — the coaching
    // banner above carries the next step, so keep the footer out of the way.
    if (pids.length < 2) { f.innerHTML = ''; return; }
    const onTeamCount = (typeof window._pdxIsOnTeam === 'function')
      ? pids.filter(pid => window._pdxIsOnTeam(pid)).length : 0;
    const hasAlignment = (typeof _alignIssues !== 'undefined' && _alignIssues.size > 0);

    // When every pick is running for the same seat, say so — it reassures the
    // voter they're doing the highest-value kind of comparison: one race, head
    // to head, before committing that seat on their ballot.
    let sameRaceNote = '';
    try {
      const sigs = pids.map(pid => _cmpRaceSig(pid));
      if (sigs.length >= 2 && sigs.every(s => s && s === sigs[0])) {
        sameRaceNote = `<span class="cmp-footer-samerace">✓ Same seat — you're comparing one race head-to-head, exactly how to decide who earns it.</span>`;
      } else {
        // Picks span seats we can confidently tell apart. Gently steer toward the
        // highest-value comparison: rivals for a single seat on their own ballot.
        const distinct = [...new Set(sigs.filter(Boolean))];
        if (distinct.length >= 2) {
          sameRaceNote = `<span class="cmp-footer-samerace" style="color:#9fb4d4;">🗺 These picks are running for different seats. To decide one race, compare just the candidates for that single seat in your district side-by-side.</span>`;
        }
      }
    } catch (e) {}

    let ico, msg;
    if (onTeamCount > 0) {
      ico = '✅';
      msg = `<strong>${onTeamCount} of these ${pids.length} ${onTeamCount === 1 ? 'is' : 'are'} on your team.</strong> Keep comparing, or head to My Voting Team to lock in the rest of your ballot.`;
    } else if (!hasAlignment) {
      ico = '🎯';
      msg = `<strong>Not sure who fits you best?</strong> Set your positions in the Alignment Tool — every politician then shows a personal match score right here.`;
    } else {
      ico = '⭐';
      msg = `<strong>Found your pick?</strong> Tap <strong>Add to Team</strong> in the Actions row above to claim their seat on your 2026 ballot.`;
    }

    const alignBtn = (!hasAlignment)
      ? `<button class="cmp-footer-btn cmp-footer-btn-ghost" onclick="closeCompare();setTimeout(function(){var a=document.getElementById('alignment-panel');if(a){a.scrollIntoView({behavior:'smooth',block:'center'});if(typeof alignTogglePanel==='function')alignTogglePanel(true);}},320)">🎯 Set Your Alignment</button>`
      : '';
    const teamBtn = (onTeamCount > 0)
      ? `<button class="cmp-footer-btn cmp-footer-btn-primary" onclick="closeCompare();setTimeout(function(){var t=document.getElementById('myteam-summary-box')||document.getElementById('my-politicians');if(t)t.scrollIntoView({behavior:'smooth',block:'start'});},320)">⭐ View My Team</button>`
      : '';

    f.innerHTML =
      `<div class="cmp-footer-msg"><span class="cmp-footer-ico">${ico}</span><span>${msg}${sameRaceNote}</span></div>`
      + `<div class="cmp-footer-actions">${alignBtn}${teamBtn}`
      + `<button class="cmp-footer-btn cmp-footer-btn-ghost" onclick="closeCompare();setTimeout(function(){var b=document.getElementById('myteam-browse-search')||document.getElementById('compare-hub');if(b)b.scrollIntoView({behavior:'smooth',block:'center'});},320)">🔍 Browse More</button>`
      + `</div>`;
  }

  // ── Race-aware coaching ────────────────────────────────────────────────
  // Classify which seat a politician is running for, well enough to find their
  // rivals from the same pool. We lean on the app's own race-key heuristic for
  // the office category, then narrow by state (and district, where it applies)
  // so "this race" means the people actually competing for the same seat — not
  // every senator in the country. Kept self-contained and read-only so it can't
  // disturb the ballot/team logic elsewhere.
  const _CMP_STATE_MAP = {
    'alabama':'al','alaska':'ak','arizona':'az','arkansas':'ar','california':'ca','colorado':'co',
    'connecticut':'ct','delaware':'de','florida':'fl','georgia':'ga','hawaii':'hi','idaho':'id',
    'illinois':'il','indiana':'in','iowa':'ia','kansas':'ks','kentucky':'ky','louisiana':'la',
    'maine':'me','maryland':'md','massachusetts':'ma','michigan':'mi','minnesota':'mn','mississippi':'ms',
    'missouri':'mo','montana':'mt','nebraska':'ne','nevada':'nv','new hampshire':'nh','new jersey':'nj',
    'new mexico':'nm','new york':'ny','north carolina':'nc','north dakota':'nd','ohio':'oh','oklahoma':'ok',
    'oregon':'or','pennsylvania':'pa','rhode island':'ri','south carolina':'sc','south dakota':'sd',
    'tennessee':'tn','texas':'tx','utah':'ut','vermont':'vt','virginia':'va','washington':'wa',
    'west virginia':'wv','wisconsin':'wi','wyoming':'wy'
  };
  const _CMP_CODE_SET = {}; for (const _n in _CMP_STATE_MAP) { _CMP_CODE_SET[_CMP_STATE_MAP[_n]] = 1; }
  // Statewide / national seats: everyone in the state (or country) is one race.
  const _CMP_STATEWIDE = { president:1, senate:1, governor:1, ltgovernor:1, attorneygeneral:1, secretaryofstate:1, secstate:1, chiefjustice:1, defense:1, intel:1 };
  // District seats: the district number, not just the state, defines the race.
  const _CMP_DISTRICT = { house:1, statesenate:1, statehouse:1 };
  const _CMP_NATIONAL = { president:1, chiefjustice:1, defense:1, intel:1 };

  function _cmpRaceKeyOf(pid) {
    try { return (typeof window._findRaceKeyForPolitician === 'function') ? (window._findRaceKeyForPolitician(pid) || '') : ''; }
    catch (e) { return ''; }
  }
  function _cmpStateCode(d) {
    const s = ((d && d.state) || '').toLowerCase();
    if (!s) return '';
    for (const name in _CMP_STATE_MAP) { if (s.indexOf(name) !== -1) return _CMP_STATE_MAP[name]; }
    const m = s.match(/\b([a-z]{2})\b/);
    if (m && _CMP_CODE_SET[m[1]]) return m[1];
    return s.split(/[^a-z]/)[0] || '';
  }
  function _cmpDistTok(d) {
    const hay = (((d && d.state) || '') + ' ' + ((d && d.office) || ''));
    let m = hay.match(/dist(?:rict|\.)?\s*\.?\s*0*(\d+)/i);
    if (m) return m[1];
    m = ((d && d.state) || '').match(/-\s*0*(\d+)/); // e.g. "UT-3"
    return m ? m[1] : '';
  }

  // Find a single politician's race rivals: same office category, same state,
  // and (for district seats) the same district when we can read one. Returns the
  // rival pids plus whether we're confident it's literally the same seat.
  function _cmpFindRacePeers(pid) {
    const out = { peers: [], sameRace: false };
    try {
      if (typeof CMP_DATA === 'undefined' || !CMP_DATA[pid]) return out;
      const rk = _cmpRaceKeyOf(pid);
      if (!rk || (!_CMP_STATEWIDE[rk] && !_CMP_DISTRICT[rk])) return out;
      const base = CMP_DATA[pid];
      const national = !!_CMP_NATIONAL[rk];
      const sc = national ? '' : _cmpStateCode(base);
      const dt = _cmpDistTok(base);
      let same = [];
      Object.keys(CMP_DATA).forEach(p => {
        if (p === pid || _cmpSelected.has(p)) return;
        const d = CMP_DATA[p]; if (!d) return;
        if (_cmpRaceKeyOf(p) !== rk) return;
        if (!national && _cmpStateCode(d) !== sc) return;
        same.push(p);
      });
      if (!same.length) return out;
      let sameRace;
      if (_CMP_DISTRICT[rk]) {
        if (dt) {
          const sd = same.filter(p => _cmpDistTok(CMP_DATA[p]) === dt);
          if (sd.length) { same = sd; sameRace = true; } else { sameRace = false; }
        } else { sameRace = false; }
      } else {
        sameRace = true; // one statewide / national seat
      }
      out.peers = same;
      out.sameRace = sameRace;
    } catch (e) {}
    return out;
  }

  // A stable "same seat" signature, used to recognise when every pick in the
  // table is competing for the identical seat. Null when we can't be sure.
  function _cmpRaceSig(pid) {
    try {
      const d = (typeof CMP_DATA !== 'undefined') ? CMP_DATA[pid] : null;
      if (!d) return null;
      const rk = _cmpRaceKeyOf(pid);
      if (!rk) return null;
      if (_CMP_NATIONAL[rk]) return rk;
      if (_CMP_STATEWIDE[rk]) return rk + '|' + _cmpStateCode(d);
      if (_CMP_DISTRICT[rk]) { const dt = _cmpDistTok(d); return dt ? (rk + '|' + _cmpStateCode(d) + '|' + dt) : null; }
      return null;
    } catch (e) { return null; }
  }

  // Select a politician for comparison and mirror that state across every
  // surface that shows a compare control for them (cards, power-map, checkboxes).
  function _cmpSelectPid(pid) {
    if (_cmpSelected.has(pid)) return;
    _cmpSelected.add(pid);
    document.querySelectorAll(`.compare-cb[data-pid="${pid}"]`).forEach(c => c.checked = true);
    document.querySelectorAll(`.bp-compare-btn[data-pid="${pid}"]`).forEach(b => {
      b.textContent = '✓ ADDED'; b.classList.add('added');
      b.closest('.card-holo')?.classList.add('cmp-highlight');
    });
    const pmBtn = document.getElementById('pmc-' + pid);
    if (pmBtn) { pmBtn.textContent = '✓ Added'; pmBtn.classList.add('added'); }
  }

  // One-tap "compare this race" — pull a single pick's rivals into the table,
  // up to a comfortable 4 columns, then re-render.
  window.cmpAddRacePeers = function(pid) {
    const found = _cmpFindRacePeers(pid);
    if (!found.peers.length) return;
    const room = Math.max(0, 4 - _cmpSelected.size);
    found.peers.slice(0, room || 3).forEach(p => _cmpSelectPid(p));
    _updateCmpFloat();
    _pmUpdateTray();
    _buildCmpTable();
  };

  // Coaching banner shown only when a lone politician is selected. A one-person
  // "comparison" is a dead end, so this explains the payoff of a real side-by-
  // side and — when the race can be identified — offers to load the rivals.
  function _cmpRenderCoach(pids) {
    const c = document.getElementById('cmp-coach');
    if (!c) return;
    if (pids.length >= 2) { c.style.display = 'none'; c.innerHTML = ''; return; }
    const pid = pids[0];
    const d = (typeof CMP_DATA !== 'undefined') ? CMP_DATA[pid] : null;
    const name = (d && d.name) ? d.name : 'this politician';
    const found = _cmpFindRacePeers(pid);
    const nPeers = Math.min(found.peers.length, 3);
    const peerWord = found.sameRace ? 'rival' : 'similar candidate';
    const inlinePhrase = nPeers ? (found.sameRace ? 'a rival from the same race' : 'a similar candidate') : 'another candidate';

    const rivalBtn = nPeers
      ? `<button class="cmp-coach-btn cmp-coach-btn-primary" onclick="cmpAddRacePeers('${pid}')">⚖️ Add ${nPeers} ${peerWord}${nPeers === 1 ? '' : 's'}${found.sameRace ? ' from this race' : ''}</button>`
      : '';
    const browseBtn = `<button class="cmp-coach-btn cmp-coach-btn-ghost" onclick="closeCompare();setTimeout(function(){var b=document.getElementById('myteam-browse-search')||document.getElementById('compare-hub');if(b)b.scrollIntoView({behavior:'smooth',block:'center'});},300)">🔍 Browse to add more</button>`;

    c.innerHTML =
      `<div class="cmp-coach-head"><span class="cmp-coach-ico">⚖️</span> Add one more to compare</div>`
      + `<div class="cmp-coach-body">A side-by-side needs <strong>2 or more</strong> picks. Put <strong>${name}</strong> next to ${inlinePhrase} to weigh their <strong>records</strong>, <strong>accountability</strong> and policy positions together — the clearest way to decide a seat <em>before</em> you add anyone to your team.</div>`
      + `<div class="cmp-coach-actions">${rivalBtn}${browseBtn}</div>`;
    c.style.display = '';
  }

  // Toggle a politician on/off the visitor's team straight from the compare
  // table, then re-render so the row and footer reflect the new state.
  window._cmpToggleTeam = function(pid, btn) {
    const wasOn = (typeof window._pdxIsOnTeam === 'function') && window._pdxIsOnTeam(pid);
    if (typeof window.mypolToggle === 'function') {
      window.mypolToggle(pid);
    }
    if (typeof window._showTeamToast === 'function') {
      window._showTeamToast(pid, wasOn ? 'remove' : 'add', {});
    }
    _buildCmpTable();
  };

  function removeCmpPid(pid) {
    _cmpSelected.delete(pid);
    document.querySelectorAll(`.compare-cb[data-pid="${pid}"]`).forEach(cb => cb.checked = false);
    document.querySelectorAll(`.bp-compare-btn[data-pid="${pid}"]`).forEach(b => { b.textContent = '+ COMPARE'; b.classList.remove('added'); });
    const pmBtn = document.getElementById('pmc-' + pid);
    if (pmBtn) { pmBtn.textContent = '+ Compare'; pmBtn.classList.remove('added'); }
    const card = document.querySelector(`.bp-compare-btn[data-pid="${pid}"]`)?.closest('.card-holo');
    if (card) card.classList.remove('cmp-highlight');
    _updateCmpFloat();
    _pmUpdateTray();
    if (_cmpSelected.size < 1) { closeCompare(); return; }
    _buildCmpTable();
  }

  function bpAddCompare(pid, btn) {
    if (_cmpSelected.has(pid)) {
      _cmpSelected.delete(pid);
      document.querySelectorAll(`.compare-cb[data-pid="${pid}"]`).forEach(c => c.checked = false);
      btn.textContent = '+ COMPARE';
      btn.classList.remove('added');
      const card = btn.closest('.card-holo');
      if (card) card.classList.remove('cmp-highlight');
      const pmBtn = document.getElementById('pmc-' + pid);
      if (pmBtn) { pmBtn.textContent = '+ Compare'; pmBtn.classList.remove('added'); }
    } else {
      _cmpSelected.add(pid);
      document.querySelectorAll(`.compare-cb[data-pid="${pid}"]`).forEach(c => c.checked = true);
      btn.textContent = '✓ ADDED';
      btn.classList.add('added');
      const card = btn.closest('.card-holo');
      if (card) card.classList.add('cmp-highlight');
      const pmBtn = document.getElementById('pmc-' + pid);
      if (pmBtn) { pmBtn.textContent = '✓ Added'; pmBtn.classList.add('added'); }
    }
    _updateCmpFloat();
    _pmUpdateTray();
  }

  // ── Trending Reforms Carousel ──────────────────────────────────────────────
  (function() {
    var trIdx = 0, trTotal = 5, trTimer = null, trProgress = 0, trRaf = null;
    var trInterval = 5000;
    function trUpdate() {
      var track = document.getElementById('tr-track');
      var dots = document.querySelectorAll('#tr-dots .tr-dot');
      if (!track) return;
      track.style.transform = 'translateX(-' + (trIdx * 100) + '%)';
      dots.forEach(function(d, i) { d.classList.toggle('active', i === trIdx); });
    }
    function trStartProgress() {
      trProgress = 0;
      var bar = document.getElementById('tr-progress');
      var start = performance.now();
      function tick(now) {
        var elapsed = now - start;
        trProgress = Math.min((elapsed / trInterval) * 100, 100);
        if (bar) bar.style.width = trProgress + '%';
        if (elapsed < trInterval) { trRaf = requestAnimationFrame(tick); }
      }
      if (trRaf) cancelAnimationFrame(trRaf);
      trRaf = requestAnimationFrame(tick);
    }
    function trStartAuto() {
      trStopAuto();
      trStartProgress();
      trTimer = setTimeout(function() {
        trIdx = (trIdx + 1) % trTotal;
        trUpdate();
        trStartAuto();
      }, trInterval);
    }
    function trStopAuto() {
      if (trTimer) { clearTimeout(trTimer); trTimer = null; }
      if (trRaf) { cancelAnimationFrame(trRaf); trRaf = null; }
    }
    window.trGoToSlide = function(i) {
      trIdx = i;
      trUpdate();
      trStartAuto();
    };
    window.trCarouselNav = function(dir) {
      trIdx = (trIdx + dir + trTotal) % trTotal;
      trUpdate();
      trStartAuto();
    };
    var carousel = document.getElementById('tr-carousel');
    if (carousel) {
      carousel.addEventListener('mouseenter', trStopAuto);
      carousel.addEventListener('mouseleave', trStartAuto);
      var touchStartX = 0;
      carousel.addEventListener('touchstart', function(e) { touchStartX = e.touches[0].clientX; trStopAuto(); }, { passive: true });
      carousel.addEventListener('touchend', function(e) {
        var diff = touchStartX - e.changedTouches[0].clientX;
        if (Math.abs(diff) > 50) { trCarouselNav(diff > 0 ? 1 : -1); }
        else { trStartAuto(); }
      }, { passive: true });
    }
    trStartAuto();
  })();

  // ── Power Map helpers ──────────────────────────────────────────────────────
  function pmToggle(id) {
    const tier = document.getElementById(id);
    if (!tier) return;
    tier.classList.toggle('open');
  }

  function pmToggleSub(label) {
    const group = label.closest('.pm-sub-group');
    if (group) group.classList.toggle('collapsed');
  }

  function pmExpandAll() {
    document.querySelectorAll('.pm-tier').forEach(t => t.classList.add('open'));
    document.querySelectorAll('.pm-sub-group.collapsed').forEach(g => g.classList.remove('collapsed'));
  }

  let _pmFullStateActive = false;
  function pmToggleFullState() {
    const btn = document.getElementById('pm-fullstate-btn');
    const stateSel = document.getElementById('pm-state-sel');
    const countySel = document.getElementById('pm-county-sel');
    const districtSel = document.getElementById('pm-district-sel');
    _pmFullStateActive = !_pmFullStateActive;
    if (_pmFullStateActive) {
      // Show the entire map (every tier, no location filter applied).
      stateSel.value = 'all';
      countySel.value = 'all';
      if (districtSel) districtSel.value = 'all';
      btn.innerHTML = '📍 Back to My Reps';
      btn.style.background = 'linear-gradient(135deg,rgba(52,211,153,0.2),rgba(34,197,94,0.1))';
      btn.style.borderColor = 'rgba(52,211,153,0.45)';
      btn.style.color = '#34d399';
      pmExpandAll();
      _pmApplyAllFilters();
    } else {
      // Return to the user's saved area — driven entirely by localStorage, never a
      // hardcoded city. _vhSyncBanner re-applies the saved location and re-filters.
      btn.innerHTML = '🗺 View Full Map';
      btn.style.background = 'linear-gradient(135deg,rgba(245,200,66,0.15),rgba(192,21,42,0.1))';
      btn.style.borderColor = 'rgba(245,200,66,0.35)';
      btn.style.color = '#fbbf24';
      if (districtSel) { districtSel.value = 'all'; districtSel.style.display = 'none'; }
      if (typeof window._vhSyncBanner === 'function') { window._vhSyncBanner(); }
      else { _pmApplyAllFilters(); }
    }
  }

  function pmAddCompare(pid, btn) {
    if (_cmpSelected.has(pid)) {
      _cmpSelected.delete(pid);
      document.querySelectorAll(`.compare-cb[data-pid="${pid}"]`).forEach(c => c.checked = false);
      btn.textContent = '+ Compare';
      btn.classList.remove('added');
      document.querySelectorAll(`.bp-compare-btn[data-pid="${pid}"]`).forEach(b => { b.textContent = '+ COMPARE'; b.classList.remove('added'); });
      document.querySelectorAll(`.bp-compare-btn[data-pid="${pid}"]`).forEach(b => { const card = b.closest('.card-holo'); if (card) card.classList.remove('cmp-highlight'); });
    } else {
      _cmpSelected.add(pid);
      document.querySelectorAll(`.compare-cb[data-pid="${pid}"]`).forEach(c => c.checked = true);
      btn.textContent = '✓ Added';
      btn.classList.add('added');
      document.querySelectorAll(`.bp-compare-btn[data-pid="${pid}"]`).forEach(b => { b.textContent = '✓ ADDED'; b.classList.add('added'); });
      document.querySelectorAll(`.bp-compare-btn[data-pid="${pid}"]`).forEach(b => { const card = b.closest('.card-holo'); if (card) card.classList.add('cmp-highlight'); });
    }
    _updateCmpFloat();
    _pmUpdateTray();
  }

  function _pmUpdateTray() {
    const tray  = document.getElementById('pm-compare-tray');
    const pills = document.getElementById('pm-compare-pills');
    if (!tray || !pills) return;
    const pids = [..._cmpSelected];
    if (pids.length === 0) { tray.style.display = 'none'; return; }
    tray.style.display = 'flex';
    pills.innerHTML = pids.map(pid => {
      const name = (typeof CMP_DATA !== 'undefined' && CMP_DATA[pid]) ? CMP_DATA[pid].name : pid;
      return `<span class="pm-compare-pill">${name} <button onclick="pmAddCompare('${pid}', document.getElementById('pmc-${pid}'));_pmUpdateTray()">✕</button></span>`;
    }).join('');
  }


  // ── Power Map location filter ─────────────────────────────────────────────
  let _pmActiveIssues = new Set();
  const _pmFilterTerms = {
    'taxes': ['tax', 'fiscal', 'budget', 'appropriation'],
    'public lands': ['public lands', 'lands transfer'],
    'environment': ['environment', 'air quality', 'climate', 'inversion', 'nepa'],
    'gun rights': ['second amendment', 'gun', 'firearm'],
    'healthcare': ['healthcare', 'health'],
    'education': ['education', 'school choice'],
    'border security': ['border', 'immigration'],
    'economy': ['economic', 'economy', 'small business', 'trade policy', 'commerce'],
    'water rights': ['water'],
    'constitutional': ['constitutional', 'civil liberties', 'religious liberty']
  };

  function pmFilterLocation() {
    _pmApplyAllFilters();
  }

  function _pmEnsureBadge(card) {
    let badge = card.querySelector('.pm-national-badge');
    if (!badge) {
      badge = document.createElement('div');
      badge.className = 'pm-national-badge';
      badge.innerHTML = '<span class="pm-nb-icon">\u{1F30D}</span> NATIONAL IMPACT <span class="pm-info-tip"><span class="pm-info-icon">ⓘ</span><span class="pm-tooltip"><strong>National Impact</strong> means this person doesn\'t represent your district directly, but their votes on federal taxes, spending, and law still affect your daily life — every American feels the ripple.</span></span> <span class="pm-nb-dot"></span> <span class="pm-nb-sub">Affects All Americans</span>';
      card.insertBefore(badge, card.firstChild);
    }
    return badge;
  }

  function _pmEnsureLocalBadge(card) {
    let badge = card.querySelector('.pm-local-badge');
    if (!badge) {
      badge = document.createElement('div');
      badge.className = 'pm-local-badge';
      badge.innerHTML = '<span class="pm-lb-star">★</span> YOUR REPRESENTATIVE <span class="pm-info-tip"><span class="pm-info-icon">ⓘ</span><span class="pm-tooltip"><strong>Your Representative</strong> means this person was elected by voters in your area. They work for you — your vote put them in office, and your vote can replace them. Local races are decided by just a few hundred votes.</span></span> <span class="pm-lb-dot"></span> <span class="pm-lb-sub">YOUR VOTE MATTERS</span>';
      card.insertBefore(badge, card.firstChild);
    }
    return badge;
  }

  function _pmEnsureUnopposedBadge(card) {
    let badge = card.querySelector('.pm-unopposed-badge-container');
    if (!badge) {
      badge = document.createElement('div');
      badge.className = 'pm-unopposed-badge-container';
      badge.style.padding = '5px 12px 0 12px';
      badge.innerHTML = (typeof window._pdxUnopposedBadge === 'function') ? window._pdxUnopposedBadge({ size: 'sm' }) : '';
      const inner = card.querySelector('.pm-card-inner');
      if (inner) {
        card.insertBefore(badge, inner);
      } else {
        card.appendChild(badge);
      }
    }
    return badge;
  }

  function _pmApplyAllFilters() {
    const stateSel  = document.getElementById('pm-state-sel');
    const countySel = document.getElementById('pm-county-sel');
    const districtSel = document.getElementById('pm-district-sel');
    const label     = document.getElementById('pm-location-label');
    const titleEl   = document.getElementById('pm-loc-title');
    if (!stateSel || !countySel) return;

    const stateVal  = stateSel.value;
    const countyVal = countySel.value;
    const districtVal = districtSel ? districtSel.value : 'all';
    // These selects are hidden engine controls driven from the saved location;
    // never reveal them (the visible picker is the unified Change Location form).
    countySel.style.display = 'none';
    if (districtSel) districtSel.style.display = 'none';

    const searchVal = (document.getElementById('pm-search-input')?.value || '').trim().toLowerCase();

    document.querySelectorAll('.pm-card[data-county]').forEach(card => {
      const cc = card.dataset.county;
      const cs = card.dataset.pmstate;
      const cd = card.dataset.district || '';
      let locShow = false;

      // Find the button inside the card that calls showProfile('...') to get the pid
      const profileBtn = card.querySelector('button[onclick*="showProfile"]');
      let pid = '';
      if (profileBtn) {
        const onclickAttr = profileBtn.getAttribute('onclick');
        const match = onclickAttr.match(/showProfile\(['"]([^'"]+)['"]\)/);
        if (match) pid = match[1];
      }

      if (!window._hasUserLocation) {
        // No saved location — do not default to any state tree.
        locShow = false;
      } else if (_pmFullStateActive) {
        // Full map view — show all cards
        locShow = true;
      } else if (stateVal === 'national') {
        locShow = (cs === 'national' || cc === 'all');
      } else {
        // Normal view: show only national figures and the user's local/state representatives!
        const isNational = (cs === 'national' || cc === 'all');
        const isLocal = pid ? _pdxIsLocalToUser(pid) : false;
        locShow = isNational || isLocal;
      }

      let searchShow = true;
      if (searchVal) {
        const name = (card.dataset.name || '').toLowerCase();
        const issues = (card.dataset.issues || '').toLowerCase();
        searchShow = name.includes(searchVal) || issues.includes(searchVal);
      }

      let issueShow = true;
      if (_pmActiveIssues.size > 0) {
        const cardIssues = (card.dataset.issues || '').toLowerCase();
        issueShow = [..._pmActiveIssues].every(f => {
          const terms = _pmFilterTerms[f] || [f];
          return terms.some(t => cardIssues.includes(t));
        });
      }

      const searchOverride = searchVal && searchShow && !locShow;
      const visible = ((locShow || searchOverride) && searchShow && issueShow);
      card.style.display = visible ? '' : 'none';

      const natBadge = _pmEnsureBadge(card);
      natBadge.style.display = (visible && searchOverride) ? 'flex' : 'none';

      const localBadge = _pmEnsureLocalBadge(card);
      const isLocal = pid ? _pdxIsLocalToUser(pid) : false;
      localBadge.style.display = (visible && locShow && isLocal && !searchOverride) ? 'flex' : 'none';
    });

    document.querySelectorAll('.pm-tier').forEach(tier => {
      const visCards = [...tier.querySelectorAll('.pm-card')].filter(c => c.style.display !== 'none');
      tier.style.display = visCards.length === 0 ? 'none' : '';
      if (searchVal && visCards.length > 0 && !tier.classList.contains('open')) {
        tier.classList.add('open');
      }
    });

    document.querySelectorAll('.pm-sub-group').forEach(group => {
      const visCards = [...group.querySelectorAll('.pm-card')].filter(c => c.style.display !== 'none');
      group.style.display = visCards.length === 0 ? 'none' : '';
      if (searchVal && visCards.length > 0) {
        group.classList.remove('collapsed');
      }
    });

    document.querySelectorAll('.pm-tier-connector').forEach(conn => {
      const next = conn.nextElementSibling;
      if (next && next.style.display === 'none') conn.style.display = 'none';
      else conn.style.display = '';
    });

    const noResults = document.getElementById('pm-no-results');
    const anyVisible = [...document.querySelectorAll('.pm-card[data-county]')].some(c => c.style.display !== 'none');
    if (noResults) noResults.style.display = anyVisible ? 'none' : 'block';

    const countyLabels = {
      'all': 'All Counties', 'davis': 'Davis County (Layton)',
      'slc': 'Salt Lake County / SLC', 'utah_co': 'Utah County',
      'weber': 'Weber County (Ogden)', 'washington': 'Washington County (St. George)',
      'cache': 'Cache County (Logan)', 'iron': 'Iron County (Cedar City)',
      'box_elder': 'Box Elder County', 'summit': 'Summit County (Park City)',
      'tooele': 'Tooele County', 'wasatch': 'Wasatch County (Heber)'
    };
    const districtLabels = {
      'all': '', 'district1': ' · District 1', 'district2': ' · District 2',
      'district3': ' · District 3', 'district4': ' · District 4', 'statewide': ' · Statewide'
    };
    const stateLabels = { 'utah': 'Utah', 'national': 'National', 'all': 'All' };
    if (stateVal === '') {
      // No saved location yet — keep the label neutral; never show a hardcoded place.
      if (label) label.innerHTML = '📍 Showing: <strong>all representatives</strong> — set your location to see who represents you';
      if (titleEl) titleEl.textContent = 'Your Representatives';
    } else {
      var cLabel;
      var _vl = window._currentVoterLocation || { state: '', county: '', district: '' };
      if (stateVal === 'utah') {
        cLabel = (countyLabels[countyVal] || countyVal) + (districtLabels[districtVal] || '');
      } else if (stateVal === 'all' && window._hasUserLocation && _vl.state && _vl.state !== 'National') {
        // A specific (non-Utah) state is saved — show its real name, not "All".
        var _vd = String(_vl.district || '').replace(/[^0-9]/g, '');
        cLabel = _vl.state + (_vd ? ' · District ' + _vd : '');
      } else {
        cLabel = stateLabels[stateVal] || stateVal;
      }
      if (label) label.innerHTML = `📍 Showing: <strong>${cLabel}</strong> — politicians who represent this area`;
      if (titleEl) titleEl.textContent = cLabel;
    }

    if (stateVal === 'utah' && countyVal !== 'all' && typeof window._vhUpdateLocationText === 'function') {
      window._vhUpdateLocationText(countyVal);
    }
  }

  function pmToggleFilter(chip) {
    const val = chip.dataset.filter;
    if (_pmActiveIssues.has(val)) {
      _pmActiveIssues.delete(val);
      chip.classList.remove('active');
    } else {
      _pmActiveIssues.add(val);
      chip.classList.add('active');
    }
    const clearBtn = document.getElementById('pm-clear-filters');
    const searchVal = (document.getElementById('pm-search-input')?.value || '').trim();
    if (clearBtn) clearBtn.style.display = (_pmActiveIssues.size > 0 || searchVal) ? 'inline-flex' : 'none';
    _pmApplyAllFilters();
  }

  function pmClearFilters() {
    _pmActiveIssues.clear();
    document.querySelectorAll('.pm-filter-chip.active').forEach(c => c.classList.remove('active'));
    const input = document.getElementById('pm-search-input');
    if (input) input.value = '';
    const clearBtn = document.getElementById('pm-clear-filters');
    if (clearBtn) clearBtn.style.display = 'none';
    _pmApplyAllFilters();
  }

  // ═══ Dynamic Power Map Card Injection ═══
  // Iterates PROFILES and creates Power Map cards for profiles without hardcoded cards
  (function pmInjectDynamicCards(){
    var META={
      dhenderson:['pm-tier-state','STATEWIDE EXECUTIVE OFFICES','all_ut','statewide'],
      sreyes:['pm-tier-state','STATEWIDE EXECUTIVE OFFICES','all_ut','statewide'],
      ddamschen:['pm-tier-state','STATEWIDE EXECUTIVE OFFICES','all_ut','statewide'],
      jdougall:['pm-tier-state','STATEWIDE EXECUTIVE OFFICES','all_ut','statewide'],
      dmccay:['pm-tier-state','STATE SENATE','slc','district4'],
      kgrover:['pm-tier-state','STATE SENATE','utah_co','district3'],
      lfillmore:['pm-tier-state','STATE SENATE','davis','district1'],
      wharper:['pm-tier-state','STATE SENATE','davis','district1'],
      mmckell:['pm-tier-state','STATE SENATE','summit','district3'],
      dhinkins:['pm-tier-state','STATE SENATE','utah_co','district3'],
      rwinterton:['pm-tier-state','STATE SENATE','utah_co','district3'],
      amillner:['pm-tier-state','STATE SENATE','davis','district1'],
      kriebe:['pm-tier-state','STATE SENATE','slc','district4'],
      lescamilla:['pm-tier-state','STATE SENATE','slc','district4'],
      dowens_st:['pm-tier-state','STATE SENATE','utah_co','district3'],
      dthatcher:['pm-tier-state','STATE SENATE','weber','district1'],
      janderegg:['pm-tier-state','STATE SENATE','utah_co','district3'],
      spitcher:['pm-tier-state','STATE SENATE','slc','district4'],
      cwilson:['pm-tier-state','STATE SENATE','weber','district1'],
      // Carl Albrecht is a REPRESENTATIVE (House District 70, Richfield/Sevier
      // County), not a senator, and Sevier County lies wholly inside Utah's 2nd
      // congressional district. This row spent its life keyed to `calbrecht` — the
      // duplicate id retired in July 2026 (db/vr-pid-aliases.json) — which is why
      // it never rendered: pmInjectDynamicCards only injects ids present in
      // PROFILES, and the browse-directory profile is `carl_albrecht`.
      carl_albrecht:['pm-tier-state','STATE HOUSE','sevier','district2'],
      jferry:['pm-tier-state','STATE HOUSE','box_elder','district1'],
      gsnow:['pm-tier-state','STATE HOUSE','davis','district1'],
      swaldrip:['pm-tier-state','STATE HOUSE','davis','district1'],
      cmusselman:['pm-tier-state','STATE SENATE','weber','district1'],
      klisonbee:['pm-tier-state','STATE HOUSE','davis','district1'],
      jburton:['pm-tier-state','STATE HOUSE','davis','district1'],
      cperry:['pm-tier-state','STATE HOUSE','weber','district1'],
      bking:['pm-tier-state','STATE HOUSE','slc','district4'],
      jbriscoe:['pm-tier-state','STATE HOUSE','slc','district4'],
      jdailey:['pm-tier-state','STATE HOUSE','slc','district4'],
      seliason:['pm-tier-state','STATE HOUSE','utah_co','district3'],
      rspendlove:['pm-tier-state','STATE HOUSE','utah_co','district3'],
      jteuscher:['pm-tier-state','STATE HOUSE','utah_co','district3'],
      cpierucci:['pm-tier-state','STATE HOUSE','utah_co','district3'],
      nthurston:['pm-tier-state','STATE HOUSE','utah_co','district3'],
      kstratton:['pm-tier-state','STATE SENATE','utah_co','district3'],
      kivory:['pm-tier-state','STATE HOUSE','slc','district4'],
      csnider:['pm-tier-state','STATE HOUSE','box_elder','district1'],
      dpulsipher:['pm-tier-state','STATE HOUSE','washington','district2'],
      sbeckstrom:['pm-tier-state','STATE HOUSE','washington','district2'],
      mroberts:['pm-tier-state','STATE HOUSE','washington','district2'],
      // Do NOT re-key to `tyler_clancy`: he resigned District 60 in March 2026 to
      // become the state homeless coordinator, and this is a 'STATE HOUSE' row, so
      // matching it to his roster id would inject a card calling a former member a
      // sitting representative. Left on the old pid, where it stays inert.
      tclancy:['pm-tier-state','STATE HOUSE','utah_co','district3'],
      mwinder:['pm-tier-state','STATE HOUSE','slc','district4'],
      jon_hawkins:['pm-tier-state','STATE HOUSE','utah_co','district3'],
      jellis:['pm-tier-state','STATE HOUSE','davis','district1'],
      mballard:['pm-tier-state','STATE HOUSE','slc','district4'],
      jjohnson:['pm-tier-state','STATE HOUSE','utah_co','district3'],
      pstrong:['pm-tier-state','STATE HOUSE','slc','district4'],
      sstoddard:['pm-tier-state','STATE HOUSE','davis','district1'],
      mwhalen:['pm-tier-local','MAYORS','weber','district1'],
      jpike:['pm-tier-local','MAYORS','washington','district2'],
      bperry:['pm-tier-local','MAYORS','davis','district1'],
      bscott:['pm-tier-local','MAYORS','davis','district1'],
      cpetersen:['pm-tier-local','MAYORS','davis','district1'],
      slockhart:['pm-tier-local','MAYORS','utah_co','district3'],
      dwatts:['pm-tier-local','MAYORS','slc','district4'],
      dramsey:['pm-tier-local','MAYORS','slc','district4'],
      rwood:['pm-tier-local','MAYORS','slc','district4'],
      mpovey:['pm-tier-local','MAYORS','weber','district1'],
      jshepherd:['pm-tier-state','2026 CANDIDATES','slc','district4'],
      kreese:['pm-tier-state','2026 CANDIDATES','washington','district2'],
      btucker:['pm-tier-state','2026 CANDIDATES','all_ut','statewide'],
      dirk_burton_wjordan:['pm-tier-local','MAYORS','slc','district4'],
      mark_shepherd_clearfield:['pm-tier-local','MAYORS','davis','district1'],
      tamara_tran_kaysville:['pm-tier-local','MAYORS','davis','district1'],
      lharris:['pm-tier-state','2026 CANDIDATES','all_ut','statewide']
    };
    // District-tag integrity pass. The 4th tag on each card is the politician's
    // U.S. House (congressional) district, used for the "· District N" label and
    // the district pills. Several Davis / Weber / Box Elder / Washington County
    // entries were authored with a stale congressional district — Davis, Weber
    // and Box Elder all sit in Utah's 2nd District and Washington in the 3rd —
    // which is what labelled those counties' legislators as "District 1".
    // Re-derive the tag from each card's county using the authoritative
    // single-district county→CD map so a county that lies wholly inside one
    // congressional district can never carry the wrong number. Counties split
    // across two districts (Salt Lake, Utah) are left exactly as authored, since
    // their congressional district can't be inferred from the county alone.
    var _PM_COUNTY_CD = { davis: 2, weber: 2, box_elder: 2, washington: 3, cache: 2 };
    Object.keys(META).forEach(function(_pmId) {
      var _pmMeta = META[_pmId];
      if (!_pmMeta || _pmMeta.length < 4) return;
      var _pmCd = _PM_COUNTY_CD[_pmMeta[2]];
      if (_pmCd) _pmMeta[3] = 'district' + _pmCd;
    });
    var TC={
      'pm-tier-federal':{s:'#f87171',b:'rgba(239,68,68,0.2)',d:'#f87171',p:'rgba(239,68,68,0.4)',i:'\u{1F985}',c:'#f87171'},
      'pm-tier-state':{s:'#f5c842',b:'rgba(245,200,66,0.2)',d:'#fb923c',p:'rgba(245,200,66,0.4)',i:'\u{1F3DB}',c:'#f5c842'},
      'pm-tier-local':{s:'#34d399',b:'rgba(52,211,153,0.2)',d:'#34d399',p:'rgba(52,211,153,0.4)',i:'\u{1F3D9}',c:'#34d399'},
      'pm-tier-watch':{s:'#f87171',b:'rgba(192,21,42,0.18)',d:'#f87171',p:'rgba(248,113,113,0.3)',i:'\u{1F6A8}',c:'#f87171'}
    };
    function getSub(tid,lbl){
      var t=document.getElementById(tid);if(!t)return null;
      var trunk=t.querySelector('.pm-tree-trunk');if(!trunk)return null;
      var gs=trunk.querySelectorAll('.pm-sub-group');
      for(var j=0;j<gs.length;j++){var l=gs[j].querySelector('.pm-sub-label');if(l&&l.textContent.trim()===lbl)return gs[j].querySelector('.pm-sub-cards');}
      var tc=TC[tid],g=document.createElement('div');g.className='pm-sub-group';
      g.innerHTML='<div class="pm-sub-label" style="--tier-color:'+tc.c+';">'+lbl+'</div><div class="pm-tree-branch"><div class="pm-sub-cards"></div></div>';
      trunk.appendChild(g);return g.querySelector('.pm-sub-cards');
    }
    function run(){
      var ids=Object.keys(PROFILES);
      for(var i=0;i<ids.length;i++){
        var id=ids[i];
        if(document.getElementById('pmc-'+id))continue;
        var m=META[id];if(!m)continue;
        var p=PROFILES[id];if(!p)continue;
        var tid=m[0],sub=m[1],cty=m[2],dist=m[3],tc=TC[tid];
        var cont=getSub(tid,sub);if(!cont)continue;
        var iss=(p.keyIssues||[]).join(',');
        // THE SCORE SLOT CARRIES THE ONE READ. This slot held a colour-coded
        // "Promise Score" percentage, then a pledge COUNT under the label "Pledges
        // settled". The count was honest about what it measured, but it was still
        // pledge vocabulary occupying the position on the card that a reader treats
        // as the finding — with the kept / broken / pending pills right underneath
        // it, so the card's whole left rail was one lane.
        //
        // A campaign pledge is one FORM OF "said" and is already tested inside ⚖️
        // Word vs Action, so the slot now shows that verdict, in the one vocabulary
        // and the one palette (PDXConsistency.VERDICTS). Below the publishing floor
        // it states coverage, never a conclusion — PDXWordAction owns when a read is
        // sayable. The pledge receipts stay on the card as EVIDENCE in the stat pills
        // below, which is where a supporting detail belongs; they are no longer the
        // headline.
        var _plTally=(typeof window._pdxPromiseTally==='function')?window._pdxPromiseTally(p):null;
        var plRes=_plTally?_plTally.resolved:0;
        var plOpen=_plTally?_plTally.unresolved:0;
        var _waR=null;
        try{var _waM=window.PDXWordAction;if(_waM&&typeof _waM.read==='function')_waR=_waM.read(id,p);}catch(e){}
        var pmScoreWrap;
        if(_waR&&_waR.publishable&&_waR.verdict){
          var _wv=_waR.verdict;
          pmScoreWrap='<div class="pm-card-score-wrap"><div class="pm-card-score" style="color:'+(_wv.color||'#9fb4d4')+';">'+(_wv.ico||'⚖')+'</div><div class="pm-card-score-label">Word vs Action</div><div class="pm-card-score-norec" style="color:'+(_wv.color||'#647a9c')+';">'+_wv.label+'</div></div>';
        } else {
          var _waSub=(_waR&&_waR.coverage&&_waR.coverage.word>0)?'Not enough record yet':'No stated positions yet';
          pmScoreWrap='<div class="pm-card-score-wrap"><div class="pm-card-score pm-card-score-na">—</div><div class="pm-card-score-label">Word vs Action</div><div class="pm-card-score-norec">'+_waSub+'</div></div>';
        }
        var pmStatus=(typeof window._pdxStatusBadge==='function')?window._pdxStatusBadge(p,{size:'sm'}):'';
        // Secondary "Early in Term" / "Limited Record" chip for sparse officeholders,
        // matching the shared card shell so a thin sitting member reads as intentional.
        var pmDepth=(typeof window._pdxDepthBadge==='function')?window._pdxDepthBadge(p,{size:'sm'}):'';
        var pmParty=(typeof window._pdxPartyChip==='function')?window._pdxPartyChip(p.party):'';
        var pmOffice=(typeof window._pdxOfficeLine==='function')?window._pdxOfficeLine(p):(p.office||'');
        var pmStats=((plRes>0||plOpen>0)&&typeof window._pdxStatPills==='function')?window._pdxStatPills(p.kept,p.broken,p.pending,{record:p}):'';
        // First sentence of the bio as a one-line "impact" blurb. Guard the empty
        // case (no bio) so the row never renders as a lone period, and avoid cutting
        // at an abbreviation such as "U.S." or "Sen." by falling back to a longer
        // clamp when the first split fragment is suspiciously short.
        var bioRaw=(p.bio||'').trim();
        var bioSnip='';
        if(bioRaw){var first=bioRaw.split('. ')[0];bioSnip=((first.length<24?bioRaw.slice(0,140).replace(/\s+\S*$/,''):first).replace(/[.\s]*$/,''))+'.';}
        var impactHtml=bioSnip?'<div class="pm-card-impact"><span class="pm-impact-dot" style="background:'+tc.d+';"></span>'+bioSnip+'</div>':'';
        // Real documented positions, surfaced right on the district-tree card so a
        // voter sees where this official stands before opening the profile. Empty
        // string when nothing is on record, so nothing is ever fabricated.
        var pmStances=(typeof window._pdxStanceChips==='function')?window._pdxStanceChips(id,p,{max:3}):'';
        var ph=p.photo?'<img loading="lazy" decoding="async" src="'+p.photo+'" alt="'+p.name+'" onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'flex\'"><div class="pm-card-photo-placeholder" style="display:none;">'+(p.icon||tc.i)+'</div>':'<div class="pm-card-photo-placeholder" style="display:flex;">'+(p.icon||tc.i)+'</div>';
        var c=document.createElement('div');c.className='pm-card';c.style.border='1px solid '+tc.b;
        c.dataset.county=cty;c.dataset.pmstate='utah';c.dataset.district=dist;c.dataset.name=p.name;c.dataset.issues=iss;
        c.innerHTML='<div class="pm-card-inner"><div class="pm-card-top"><div class="pm-card-photo" style="border-color:'+tc.p+';">'+ph+'</div><div class="pm-card-info"><div class="pm-card-name">'+p.name+'</div><div class="pm-card-office">'+pmOffice+'</div>'+((pmStatus||pmDepth||pmParty)?'<div class="pm-card-meta">'+pmStatus+pmDepth+pmParty+'</div>':'')+'</div>'+pmScoreWrap+'</div>'+(pmStats?'<div class="pm-card-stats">'+pmStats+'</div>':'')+impactHtml+pmStances+'<div class="pm-card-actions"><button class="pm-btn-profile" onclick="showProfile(\''+id+'\')">View Full Profile</button><button class="pm-btn-compare" id="pmc-'+id+'" onclick="pmAddCompare(\''+id+'\',this)">+ Compare</button><button class="pm-btn-share" onclick="window.pdxSharePolitician(\''+id+'\',event)" aria-label="Share profile" title="Share"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"/></svg></button></div></div>';
        cont.appendChild(c);
      }
    }
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run);else run();
  })();

  // Initialize on page load — reflect the user's saved voter location.
  // With nothing saved, the map stays in its neutral, location-free state
  // (no county forced) until the visitor picks where they vote.
  (function initPmFilter() {
    const ready = () => {
      if (typeof window._vhSyncBanner === 'function') {
        // Single source of truth: syncs the banner, the state/county selectors
        // and the visible cards from the saved location.
        window._vhSyncBanner();
      } else if (typeof pmFilterLocation === 'function') {
        // Defensive fallback only — apply the existing (neutral) filter state
        // without forcing any specific state or county.
        pmFilterLocation();
      }
      const searchInput = document.getElementById('pm-search-input');
      if (searchInput) {
        searchInput.addEventListener('input', function() {
          const clearBtn = document.getElementById('pm-clear-filters');
          if (clearBtn) clearBtn.style.display = (this.value.trim() || _pmActiveIssues.size > 0) ? 'inline-flex' : 'none';
          _pmApplyAllFilters();
        });
      }
      document.querySelectorAll('.pm-sub-label').forEach(label => {
        label.addEventListener('click', function() { pmToggleSub(this); });
      });
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ready);
    else ready();
  })();

  // ── "Why This Matters to You" injection + Score tooltips ──────────────
  (function initPmEnhancements() {
    const whyMap = {
      'Donald Trump': 'Directly sets your income tax rates, controls tariff costs on everyday goods you buy, and shapes healthcare rules for your family.',
      'Tulsi Gabbard': 'Decides how far the government can go in monitoring your phone calls, emails, and online activity.',
      'Pete Hegseth': 'Manages the defense budget funding Hill AFB — Davis County’s largest employer and your neighbors\' paychecks.',
      'John Curtis': 'Votes on the federal taxes you pay every April, Utah water rights your community depends on, and broadband reaching rural areas.',
      'Mike Lee': 'Fights to protect your gun rights, religious freedom, and private property from federal overreach — 14 years of Senate influence.',
      'Burgess Owens': 'His school choice votes affect what your kids learn, which schools they can attend, and how much your district receives.',
      'Celeste Maloy': 'Controls Western water allocation and public lands access — affects your hiking trails, ranching neighbors, and outdoor recreation in District 2.',
      'Thomas Massie': 'His consistent “No” votes block surveillance expansion and runaway spending that would raise your taxes. Rare independence in Congress.',
      'Blake Moore': 'Sits on Ways & Means — the committee that literally writes the federal tax code you file every April. Your most direct federal voice.',
      'Spencer Cox': 'Signs every state law and budget that funds your kids\' schools, the roads you commute on, and the water coming out of your tap.',
      'Stuart Adams': 'As Senate President, he single-handedly decides which bills live or die — including ones on your property taxes and zoning.',
      'Mike Schultz': 'As Speaker of the Utah House, he decides which bills reach a vote — from school-choice scholarships and income-tax cuts to the zoning rules that determine whether your family can afford a home.',
      'Jerry Stevenson': 'Chairs Transportation funding — decides state highway funding for I-15, SR-89, and UTA routes you rely on for your daily commute.',
      'Brad Wilson': 'As Utah House Speaker through 2023, he set which budget and tax bills reached a vote — the record behind today\'s school and infrastructure funding, not a seat he still holds.',
      'Trevor Lee': 'Your state representative — votes on education funding, small business rules, and tax policy affecting your family and local businesses.',
      'Jordan Teuscher': 'Your state representative and a House leader — his votes on tech and kids\' online safety, taxes, and how fast-growing South Jordan and Riverton handle roads and schools hit close to home.',
      'Karianne Lisonbee': 'Your Davis County representative and House Majority Whip — helps decide which bills reach the floor and carries some of Utah\'s highest-profile votes on abortion, taxes, and gun rights.',
      'Phil Lyman': 'If elected, would push federal land transfer to state control — affecting hiking, ranching, and conservation statewide.',
      'Mike Kennedy': 'Healthcare policy expertise could reshape how Utah families access and afford medical care.',
      'Chris Stewart': 'His decade of intelligence and spending votes still shape programs and budgets affecting Utah today.',
      'Erin Mendenhall': 'Manages SLC housing, air quality, and public safety — directly impacts daily life for 220,000 residents.',
      'Jenny Wilson': 'Controls a $1.3B county budget covering health services, criminal justice, and parks for 1.1M residents.',
      'Joy Petro': 'Your mayor — decides your city budget, when your road gets repaved, police staffing, and every zoning decision in your neighborhood.',
      'Lauren Boebert': 'Her votes on gun legislation and federal spending set national precedents that affect your constitutional rights.',
      'Marjorie Taylor Greene': 'High-profile opposition votes influence national spending and policy direction that ripple into your tax bill.',
      'Matt Gaetz': 'His actions forced the Speaker crisis that stalled legislation — showing how one person can hold up laws affecting your daily life.',
      'Dan Bilzerian': 'If elected, would cast votes on federal spending, healthcare, and border security that touch every American household.',
      'Randy Fine': 'His school choice and anti-mandate record signals what he\'d push at the federal level — affecting education and health policy nationwide.',
      'Ed Gallrein': 'As Massie\'s replacement, his votes on surveillance, spending, and civil liberties will directly affect your freedoms.',
      'Scott Sandall': 'Controls agricultural water funding and USU appropriations — shapes the economy and water future for every Cache Valley family.',
      'Jack Draxler': 'Votes on school funding formulas, tax rates, and USU campus investments that directly affect Logan and North Logan residents.',
      'Evan Vickers': 'Former Senate Majority Leader who controls rural healthcare access, SUU funding, and public lands policy for Iron, Beaver, and Garfield counties.',
      'John Westwood': 'Votes on education, tourism, and tax policy that shape Cedar City\'s economy and Iron County\'s quality of life.'
    };

    function inject() {
      document.querySelectorAll('.pm-card[data-name]').forEach(function(card) {
        if (card.querySelector('.pm-card-why')) return;
        var name = card.dataset.name;
        var text = whyMap[name];
        if (!text) return;
        var impact = card.querySelector('.pm-card-impact');
        var el = document.createElement('div');
        el.className = 'pm-card-why';
        el.innerHTML = '<strong>Why This Matters to You:</strong> <span>' + text + '</span>';
        if (impact) {
          impact.parentNode.insertBefore(el, impact.nextSibling);
        } else {
          // No bio snippet on this card — still surface the "why" note by placing it
          // just above the action row so the highlight is never silently dropped.
          var actions = card.querySelector('.pm-card-actions');
          if (actions) actions.parentNode.insertBefore(el, actions);
          else return;
        }
      });

      document.querySelectorAll('#voter-hub .pm-card-score-label').forEach(function(label) {
        if (label.querySelector('.pm-info-tip')) return;
        var tip = document.createElement('span');
        tip.className = 'pm-info-tip';
        tip.innerHTML = '<span class="pm-info-icon">ⓘ</span><span class="pm-tooltip">These are their <strong>promise receipts</strong> — how many public pledges have actually settled, and how many of those were kept or broken, from verified sourced records. PolitiDex publishes no promise percentage: pledges are one input to the single <strong>⚖️ Word vs Action</strong> read on their profile, which tests everything they have said against how they voted.</span>';
        label.appendChild(tip);
      });
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', inject);
    else inject();
  })();


  // Lightweight global accessor so other <script> blocks (e.g. the "Your Voting
  // Districts" strip in the Voter Hub) can resolve a politician's display record
  // — name, party, office — from a pid without importing the whole CMP_DATA map.
  // Returns null when the id is unknown. (Photos still come from _getPhotoUrl.)
  window._pdxPersonById = function(pid) {
    try { return (typeof CMP_DATA !== 'undefined' && pid && CMP_DATA[pid]) ? CMP_DATA[pid] : null; }
    catch (e) { return null; }
  };

  function pmClearAll() {
    [..._cmpSelected].forEach(pid => {
      const btn = document.getElementById('pmc-' + pid);
      if (btn) { btn.textContent = '+ Compare'; btn.classList.remove('added'); }
    });
    document.querySelectorAll('.bp-compare-btn.added').forEach(b => { b.textContent = '+ COMPARE'; b.classList.remove('added'); });
    document.querySelectorAll('.card-holo.cmp-highlight').forEach(c => c.classList.remove('cmp-highlight'));
    _cmpSelected.clear();
    document.querySelectorAll('.compare-cb').forEach(c => c.checked = false);
    _updateCmpFloat();
    _pmUpdateTray();
  }

  
