/* ══════════════════════════════════════════════════════════════════════════
   judicial-ballot.js — the third branch, on the two doors
   ──────────────────────────────────────────────────────────────────────────
   Two surfaces, one owner. Both read judicial-retention.js and neither one
   decides anything for itself.

   ── DOOR 2: the retention band ───────────────────────────────────────────
   A Utah ballot in an even year carries judicial retention questions. Door 2
   resolved six legislative seats and said nothing about them, which meant the
   workspace called itself "your ballot" while a whole branch of government was
   missing from it.

   The band is a SIBLING of #bw-body inside #ballot-workspace, not a child of
   it. ballot-workspace.js's sync() assigns #bw-body.innerHTML in a single
   write, so anything appended inside that element is destroyed on the next
   repaint — the same reason issue-file.js mounts its letterhead as a sibling.

   And the band is not a seat. It does not join seats(), which is what
   door2-spine.js counts to say "3 of 6 decided": a retention question is a
   yes/no on one name, not a field of candidates to choose between, so adding
   it to that denominator would make the progress counter measure two different
   acts at once and the spine has no pick engine for the second one. The rail
   shows the question. It does not ask the reader to pick a winner, and there
   is no pick to save.

   ── WHAT IT REFUSES TO DO ────────────────────────────────────────────────
   Outside Utah it prints no judge. Statewide retention resolves from a STATE,
   which is a claim the resolver's own output supports; district, juvenile and
   justice-court retention resolves from geography PolitiDex does not hold, so
   those courts report WHICH MAP IS MISSING rather than offering the nearest
   judge on file. That is the same honesty the U.S. House row already practices
   for a voter in Ohio, applied to a Utah voter in a county we cannot place.

   ── DOOR 1: the archive listing ──────────────────────────────────────────
   Chamber-and-state shaped, exactly like archive-browse.js: "Utah · Supreme
   Court", alphabetical, no party chip, no composite, no seat claim. It renders
   for a reader in Ohio unchanged, because a roster slice is a true statement
   about the archive no matter where the reader is standing — and it is the
   answer to "the ballot can't help me here, is there anything to read".

   States. Does not gate. This module appends; it never blocks a click, never
   rewrites another module's DOM, and is safe to no-op.
   ══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var BAND_ID = 'jr-band';
  var ARCH_ID = 'jr-arch';
  var MOUNT_ID = 'ballot-workspace';

  // Reader-facing copy. "Also on your ballot" is the only ballot claim in this
  // file and it is made only inside the Utah + located branch.
  var KICKER = 'Also on your ballot · judicial retention';
  var LEAD = 'Utah voters decide whether judges stay in office. The question is yes or no, ' +
    'there is no opponent, and there is no party on the line.';
  var YN = 'This is the ballot’s own question. PolitiDex takes no position on it and publishes ' +
    'no rating of a judge.';
  var ARCH_KICKER = 'Archive · Utah courts · not a ballot';
  var ARCH_LEAD = 'Judicial retention records in the archive, by court.';
  // Held apart from the lead, in a note, so the one sentence on this surface
  // that mentions the reader's ballot is a DISCLAIMER and is structurally
  // marked as one. A claim and a denial that read alike are how a listing turns
  // into a seat assignment.
  var ARCH_NOTE = 'A listing here is not a claim that these questions are on your ballot.';

  function fn(x) { return typeof x === 'function'; }
  function J() { return window.PDXJudicial || null; }
  function esc(s) {
    if (s == null) return '';
    return String(s).replace(/[&<>"]/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c];
    });
  }
  function reps() {
    try { return fn(window.pdxRepsForMe) ? window.pdxRepsForMe() : null; } catch (e) { return null; }
  }
  function plink(pid, label) {
    var L = window.PDXPersonLink;
    if (L && fn(L.anchor)) return L.anchor(pid, label, { cls: 'jr-plink' });
    return '<span class="jr-plink">' + esc(label) + '</span>';
  }

  // ── Door 2 markup ───────────────────────────────────────────────────────

  function rowHtml(row) {
    var jp = row.jpec || {};
    return '<li class="jr-row">' +
      '<span class="jr-office">' + esc(row.courtShort) + '</span>' +
      '<span class="jr-q">' + esc(row.question) + '</span>' +
      '<span class="jr-who">' + plink(row.pid, row.name) +
        (row.role ? '<span class="jr-role"> · ' + esc(row.role) + '</span>' : '') + '</span>' +
      '<span class="jr-yn"><i class="jr-box">Retain</i><i class="jr-box">Do not retain</i></span>' +
      '<span class="jr-jpec">' + esc(jp.label || '') + '</span>' +
      (row.when ? '<span class="jr-when">' + esc(row.when) + '</span>' : '') +
      '</li>';
  }

  function bandHtml() {
    var Jj = J();
    if (!Jj || !fn(Jj.ballot)) return '';
    var b = Jj.ballot(reps());
    if (!b.located) return '';

    var head = '<p class="jr-kicker">' + esc(b.utah ? KICKER : 'Judicial retention · not on this ballot') + '</p>';

    if (!b.utah) {
      // No Utah judge can reach this branch: the rows are built inside the
      // Utah branch of ballot() and this one returns before any of them.
      return head +
        '<p class="jr-lead">' + esc(b.note) + '</p>' +
        '<p class="jr-note">The archive listing of Utah courts is further down the page, and it ' +
        'makes no claim about your ballot.</p>';
    }

    var out = head + '<p class="jr-lead">' + esc(LEAD) + '</p>';
    if (b.note) out += '<p class="jr-warn">' + esc(b.note) + '</p>';

    if (b.rows.length) {
      out += '<ul class="jr-rows">';
      b.rows.forEach(function (r) { out += rowHtml(r); });
      out += '</ul>';
      out += '<p class="jr-note">' + esc(YN) + '</p>';
    } else {
      out += '<p class="jr-empty">No judicial retention question is on file for your ballot yet.</p>';
    }

    // The per-court status list, INCLUDING the courts with nothing in them.
    // A court that is missing from this list reads as a court with no question;
    // a court that is present and says which map is missing reads as what it
    // is, which is the whole difference between a blank and a lie.
    out += '<ul class="jr-courts">';
    b.courts.forEach(function (c) {
      out += '<li class="jr-court jr-court--' + esc(c.status) + '">' +
        '<span class="jr-court-l">' + esc(c.label) + '</span>' +
        '<span class="jr-court-n">' + esc(c.note) + '</span>' +
        '</li>';
    });
    out += '</ul>';

    if (b.missing.length) {
      out += '<p class="jr-missing"><b>Maps not on file:</b> ' +
        esc(b.missing.join(' · ')) + '</p>';
    }
    return out;
  }

  // ── Door 1 markup ───────────────────────────────────────────────────────

  function archHtml() {
    var Jj = J();
    if (!Jj || !fn(Jj.archive)) return '';
    var groups = Jj.archive();
    if (!groups.length) return '';
    var out = '<p class="jr-kicker">' + esc(ARCH_KICKER) + '</p>' +
      '<p class="jr-lead">' + esc(ARCH_LEAD) + '</p>' +
      '<p class="jr-note">' + esc(ARCH_NOTE) + '</p>';
    groups.forEach(function (g) {
      out += '<div class="jr-group">' +
        '<h4 class="jr-group-h">' + esc(g.label) +
        (g.term ? '<span class="jr-term"> · ' + esc(String(g.term)) + '-year term</span>' : '') +
        '</h4>';
      if (!g.rows.length) {
        out += '<p class="jr-empty">' + esc(g.note) + '</p>';
      } else {
        out += '<ul class="jr-list">';
        g.rows.forEach(function (r) {
          var tail = [];
          if (r.role) tail.push(r.role);
          if (r.area) tail.push(r.area);
          if (!r.seated) tail.push('Senate confirmation not on file');
          if (r.former) tail.push('no longer on the court');
          out += '<li class="jr-li">' + plink(r.pid, r.name) +
            (tail.length ? '<span class="jr-tail"> · ' + esc(tail.join(' · ')) + '</span>' : '') +
            '</li>';
        });
        out += '</ul>';
      }
      out += '</div>';
    });
    out += '<p class="jr-note">' + esc(Jj.WALL) + '</p>';
    return out;
  }

  // ── Mounts ──────────────────────────────────────────────────────────────
  // The band goes INTO #ballot-workspace and NEXT TO #bw-body, never inside
  // it. See the header: sync() owns that element's innerHTML outright.
  function bandSlot() {
    var mount = document.getElementById(MOUNT_ID);
    if (!mount) return null;
    var el = document.getElementById(BAND_ID);
    if (el) return el;
    el = document.createElement('div');
    el.id = BAND_ID;
    el.className = 'jr-band';
    try { mount.appendChild(el); } catch (e) { return null; }
    return el;
  }
  function archSlot() {
    var host = document.querySelector('#who-represents-me .wrm-inner');
    if (!host) return null;
    var el = document.getElementById(ARCH_ID);
    if (el) return el;
    el = document.createElement('div');
    el.id = ARCH_ID;
    el.className = 'jr-band jr-band--arch';
    try { host.appendChild(el); } catch (e) { return null; }
    return el;
  }

  function paint() {
    var band = bandSlot();
    if (band) {
      var h = bandHtml();
      band.innerHTML = h;
      try {
        if (h) band.removeAttribute('hidden');
        else band.setAttribute('hidden', 'hidden');
      } catch (e) {}
    }
    var arch = archSlot();
    if (arch) arch.innerHTML = archHtml();
  }

  function sync() { try { paint(); } catch (e) {} }

  // ── Boot ────────────────────────────────────────────────────────────────
  // Wrap rather than poll, the same four hooks the rest of Door 2 uses: a
  // location being set, the team-position refresh that follows it, a pick
  // landing (which repaints the workspace and would otherwise leave the band
  // stale beside a fresh rail) and the race sheet's own refresh. The settle
  // timers cover the deferred-script order we do not control.
  function wrap(name, flag) {
    var f = window[name];
    if (!fn(f) || f[flag]) return;
    var wrapped = function () {
      var r = f.apply(this, arguments);
      setTimeout(sync, 0);
      return r;
    };
    wrapped[flag] = true;
    try { window[name] = wrapped; } catch (e) {}
  }

  function boot() {
    wrap('pdxFindMyReps', '__jrReps');
    wrap('_updateTeamPositionsForLocation', '__jrLoc');
    wrap('ballotPickCard', '__jrPick');
    wrap('_pdxRaceSheetRefresh', '__jrSheet');
    sync();
    [400, 1200, 3000].forEach(function (ms) { setTimeout(sync, ms); });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  window.PDXJudicialBallot = {
    sync: sync,
    _band: bandHtml,
    _arch: archHtml,
    _boot: boot,
    BAND_ID: BAND_ID,
    ARCH_ID: ARCH_ID
  };
})();
