/* ══════════════════════════════════════════════════════════════════════════
   judge-file.js — /p/<pid> for a retention seat
   ──────────────────────────────────────────────────────────────────────────
   A judge file is a person file. Same address (/p/<pid>), same funnel
   (PDXPerson.open → openModal), same kicker, same share link. What differs is
   what is IN it, and the difference is the whole point of this file.

   ── THE LETTERHEAD IS THE COURT, NOT A VERDICT ───────────────────────────
   A legislator's file opens on ⚖️ Word vs Action, because a legislator makes
   promises and casts votes and the gap between them is the record. A judge
   makes neither. Opening a judge's file on that hero would require inventing
   a word to weigh an action against, and the only material available for the
   invention is case holdings — which is exactly the thing this pass refuses
   to grade. One decision is not a broken pledge.

   So the hero is the OFFICE: court, seat, retention election. It carries no
   percentage and no ring. There is nowhere on this surface for a figure to
   appear, which is not an oversight to be corrected later.

   ── WHY THIS INTERCEPTS openModal INSTEAD OF RENDERING A PROFILE ─────────
   openModal renders from the roster: party chip, score ring, promise ledger,
   Direction Match, publication-floor notices. Handing it a judge would make
   every one of those say something false — a party where there is no party
   line, a score where there is nothing to score, "record still being built"
   over a record that is complete for what this office does. So the wrapper
   answers for a judge and never calls through. Everything else passes
   straight to the original renderer, untouched.

   The one thing it does NOT re-implement is the address. PDXPerson owns
   /p/<pid> — stamp, kicker, mounted, restore — and this file calls it rather
   than writing to history itself, because a second writer of the address bar
   is how two surfaces end up disagreeing about which file is open.

   ── THE EMPTY LANES ARE THE RECORD ───────────────────────────────────────
   The formal lane says, in words: no legislative roll-call file — this office
   does not vote bills. That is not a thin record. It is the correct record for
   the third branch, and saying it plainly is the difference between "we hold
   nothing" and "there is nothing of this kind to hold."

   The JPEC block either quotes the commission's recommendation with its source
   URL, or says no JPEC report on file and points at judges.utah.gov. It never
   substitutes a PolitiDex reading for a missing official one.

   The appointing governor deep-links to the governor's own file, because that
   is the GOVERNOR's record. It is not an attribute of the judge, and this file
   never treats it as one — no inferred ideology, no "appointee of" chip
   standing in for a party chip.
   ══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  function fn(x) { return typeof x === 'function'; }
  function J() { return window.PDXJudicial || null; }
  function esc(s) {
    if (s == null) return '';
    return String(s).replace(/[&<>"]/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c];
    });
  }
  function isJudge(pid) {
    var j = J();
    try { return !!(j && fn(j.isJudge) && j.isJudge(pid)); } catch (e) { return false; }
  }
  function link(pid, label) {
    var L = window.PDXPersonLink;
    if (L && fn(L.anchor)) return L.anchor(pid, label, { cls: 'jf-plink' });
    return '<span>' + esc(label) + '</span>';
  }

  // ── Blocks ──────────────────────────────────────────────────────────────

  function letterhead(j) {
    var Jj = J();
    var eyebrow = esc(j.state + ' · ' + j.courtShort + ' · retention election');
    var role = j.role ? esc(j.role) : '';
    var seat = j.area ? esc(j.area) : '';
    var sub = [];
    if (role) sub.push(role);
    if (seat) sub.push(seat);
    if (j.term) sub.push(j.term + '-year term');
    return '<header class="jf-head">' +
      '<p class="jf-eyebrow">' + eyebrow + '</p>' +
      '<h1 class="jf-name">' + esc(j.name) + '</h1>' +
      (sub.length ? '<p class="jf-sub">' + sub.join(' · ') + '</p>' : '') +
      // The state courts directory's own page for this judge. Every identity
      // fact above was read off it, so the reader gets the source rather than
      // our word for it.
      (j.bio
        ? '<p class="jf-src">Official biography: <a class="jf-a" href="' + esc(j.bio) +
          '" target="_blank" rel="noopener">' +
          esc(String(j.bio).replace(/^https?:\/\//, '').split('/')[0]) + '</a></p>'
        : '') +
      (j.sourceNote ? '<p class="jf-note">' + esc(j.sourceNote) + '</p>' : '') +
      '<p class="jf-wall">' + esc(Jj.WALL) + '</p>' +
      '</header>';
  }

  function retentionBlock(j) {
    var Jj = J();
    var rt = Jj.retention(j.pid);
    var body;
    if (rt.stands) {
      // The question as the state filed it, where the official list carries the
      // wording. A retention question is a sentence on a filing, not a sentence
      // this file writes, and printing our own version next to a citation to
      // theirs would be a paraphrase presented as a ballot.
      var q = fn(Jj.slateQuestion) ? Jj.slateQuestion(j.pid) : null;
      var qt = (q && q.question) ? q.question : ('Shall ' + j.title + ' ' + j.name + ' be retained?');
      body = '<p class="jf-stat"><b class="jf-locked">' + esc(rt.label) + '</b> · ' +
        esc(rt.when) + '</p>' +
        '<p class="jf-q">' + esc(qt) + '</p>' +
        (q && q.filedOffice
          ? '<p class="jf-src">Filed as: ' + esc(q.filedOffice) + '</p>'
          : '') +
        '<p class="jf-note">A retention question is unopposed and carries no party. ' +
        'The ballot asks yes or no.</p>';
      // Two official sources disagreeing about which court holds the seat is
      // stated here, on the seat, and left unresolved.
      if (j.slateConflict) {
        body += '<p class="jf-conflict">' + esc(j.slateConflict) + '</p>';
      }
    } else {
      body = '<p class="jf-empty">' + esc(rt.why) + '</p>';
    }
    if (j.ambiguous) {
      body += '<p class="jf-empty">Two records on this court share this name. ' +
        'Until the roster can tell them apart, no retention question is claimed for either.</p>';
    }
    return block('Retention', '🗳', body);
  }

  function jpecBlock(j) {
    var Jj = J();
    var c = Jj.jpec(j.pid);
    var out = '<p class="jf-stat"><b class="jf-locked">' + esc(c.label) + '</b>' +
      (c.year ? ' · ' + esc(String(c.year)) : '') + '</p>';
    if (c.scores) {
      // The four official categories, printed as the commission's own figures
      // with the commission's own labels. They are a CITATION, not a PolitiDex
      // reading, which is why they only ever render when a report is on file
      // and why nothing here averages them into a fifth number.
      out += '<ul class="jf-scores">';
      [
        ['legal', 'Legal ability'],
        ['temperament', 'Integrity and judicial temperament'],
        ['admin', 'Administrative performance'],
        ['fairness', 'Procedural fairness']
      ].forEach(function (pair) {
        var v = c.scores[pair[0]];
        out += '<li><span>' + esc(pair[1]) + '</span><b>' +
          (v == null ? 'not on file' : esc(String(v))) + '</b></li>';
      });
      out += '</ul>';
    } else {
      out += '<p class="jf-note">The official evaluation — legal ability, integrity and ' +
        'judicial temperament, administrative performance, procedural fairness — is published ' +
        'by the ' + esc(window.PDX_JUDICIAL ? window.PDX_JUDICIAL.JPEC_NAME : 'commission') +
        '. PolitiDex does not compute a substitute for it.</p>';
    }
    if (c.url) {
      out += '<p class="jf-src">Official source: <a class="jf-a" href="' + esc(c.url) +
        '" target="_blank" rel="noopener">' + esc(String(c.url).replace(/^https?:\/\//, '')) +
        '</a></p>';
    }
    if (c.priorUrl) {
      out += '<p class="jf-src">' + esc(c.priorLabel || 'Prior evaluation page') + ': ' +
        '<a class="jf-a" href="' + esc(c.priorUrl) + '" target="_blank" rel="noopener">' +
        esc(String(c.priorUrl).replace(/^https?:\/\//, '')) + '</a></p>';
    }
    return block('Judicial performance evaluation', '📋', out);
  }

  function seatBlock(j) {
    var out = '';
    var rows = j.record || [];
    if (rows.length) {
      out += '<ul class="jf-rows">';
      rows.forEach(function (r) {
        var by = '';
        if (r.by) {
          by = ' · ' + (j.appointedByPid && r.by === j.appointedBy
            ? link(j.appointedByPid, r.by)
            : esc(r.by));
        }
        out += '<li><span class="jf-when">' + esc(r.when ? J().dateLabel(r.when) : 'date not on file') +
          '</span><span class="jf-what">' + esc(r.what) + by + '</span></li>';
      });
      out += '</ul>';
    } else {
      out += '<p class="jf-empty">How this seat was filled is not on file.</p>';
    }
    out += '<p class="jf-note">Utah fills a judgeship by assisted appointment: the governor ' +
      'appoints from a nominating commission’s slate, the Senate confirms, and the judge then ' +
      'stands unopposed for retention at the first general election more than three years later. ' +
      'Who appointed a judge is a fact about the appointment and the appointing governor’s own ' +
      'record — it is not a description of the judge.</p>';
    return block('How this seat was filled', '🖋', out);
  }

  function formalBlock() {
    return block('Formal record', '🏛',
      '<p class="jf-empty">' + esc(J().NO_FORMAL) + '</p>' +
      '<p class="jf-note">Rulings are not promises. PolitiDex does not read a holding as a ' +
      'kept or broken pledge, and does not build a voting pattern out of case outcomes.</p>');
  }

  function historyBlock(j) {
    var rows = J().history(j.pid);
    var out;
    if (rows.length) {
      out = '<ul class="jf-rows">';
      rows.forEach(function (h) {
        out += '<li><span class="jf-when">' + esc(h.year) + '</span>' +
          '<span class="jf-what"><b class="jf-locked">' + esc(h.result) + '</b></span></li>';
      });
      out += '</ul>';
    } else {
      out = '<p class="jf-empty">No prior retention result on file.</p>';
    }
    return block('Prior retention', '📜', out);
  }

  function publicBlock(j) {
    var rows = J().publicLane(j.courtKey);
    if (!rows.length) return '';
    var out = '<ul class="jf-pub">';
    rows.forEach(function (p) {
      out += '<li><span class="jf-what">' + esc(p.what) + '</span>' +
        (p.url ? '<a class="jf-a" href="' + esc(p.url) + '" target="_blank" rel="noopener">' +
          esc(p.cite || 'source') + '</a>' : '') + '</li>';
    });
    out += '</ul>';
    out += '<p class="jf-note">These are things people said in public, carried with a cite and ' +
      'attached to the court rather than to a judge. They are quoted, never scored.</p>';
    return block('Public lane · what people said', '💬', out);
  }

  function block(title, icon, body) {
    return '<section class="jf-block">' +
      '<h2 class="jf-h2"><span class="jf-ico">' + icon + '</span>' + esc(title) + '</h2>' +
      body + '</section>';
  }

  function html(j) {
    return '<div class="jf" data-jf-pid="' + esc(j.pid) + '">' +
      letterhead(j) +
      retentionBlock(j) +
      jpecBlock(j) +
      seatBlock(j) +
      formalBlock() +
      historyBlock(j) +
      publicBlock(j) +
      '</div>';
  }

  // ── Render ──────────────────────────────────────────────────────────────
  // The modal chrome is set here rather than left to openModal, which never
  // ran. Deliberately mirrors openModal's own sequence — content, top bar,
  // reveal, scroll reset, current-id, PDXPerson — so a judge file and a person
  // file leave the page in the same state and closing one is the same act.
  function render(pid) {
    var Jj = J();
    if (!Jj || !fn(Jj.judge)) return false;
    var j = Jj.judge(pid);
    if (!j) return false;
    var host = document.getElementById('modal-content');
    if (!host) return false;

    host.innerHTML = html(j);

    var ico = document.getElementById('modal-icon');
    if (ico) {
      ico.textContent = '⚖';
      try {
        ico.style.background = 'rgba(148,163,184,0.20)';
        ico.style.borderColor = 'rgba(148,163,184,0.42)';
      } catch (e) {}
    }
    var nm = document.getElementById('modal-name-small');
    if (nm) nm.textContent = j.name;
    var of = document.getElementById('modal-office-small');
    // The court label already carries the state ("Utah Supreme Court"), so the
    // top bar names the court and the seat rather than repeating the state.
    if (of) of.textContent = j.courtLabel + (j.role ? ' · ' + j.role : '');

    // The footer's "Add to My Team" and "Evidence" buttons act on a roster
    // record — team scoring, a submission form keyed to a politician. Neither
    // has a meaning for a retention seat, so the panel is marked and the CSS
    // hides them. Marked rather than mutated, so the next non-judge file that
    // opens gets its footer back by having the mark removed.
    mark(true);

    var ov = document.getElementById('modal-overlay');
    if (ov) {
      try {
        ov.style.setProperty('display', 'flex', 'important');
        ov.style.setProperty('opacity', '1', 'important');
        ov.style.setProperty('visibility', 'visible', 'important');
      } catch (e) {}
    }
    var body = document.getElementById('modal-body');
    if (body) { try { body.scrollTop = 0; } catch (e) {} }
    try { document.body.style.overflow = 'hidden'; } catch (e) {}

    window._pdxCurrentProfileId = pid;

    var P = window.PDXPerson;
    if (P) {
      try { if (fn(P.mounted)) P.mounted(pid); } catch (e) {}
      try { if (fn(P.stamp)) P.stamp(pid); } catch (e) {}
      try { if (fn(P.kicker)) P.kicker(pid); } catch (e) {}
      try { if (fn(P.chrome)) P.chrome(pid); } catch (e) {}
    }
    return true;
  }

  function mark(on) {
    var panel = document.getElementById('modal-panel');
    if (!panel) return;
    try {
      if (on) panel.setAttribute('data-pdx-judge', '1');
      else panel.removeAttribute('data-pdx-judge');
    } catch (e) {}
  }

  // ── Hooks ───────────────────────────────────────────────────────────────
  // openModal is the one funnel every route into a file passes through —
  // PDXPerson.open from a cold /p/<pid> arrival, showProfile from a card, a
  // ballot row, a share link. Wrapping it once covers all of them, which is
  // why there is no second entry point in this file.
  function hookOpen() {
    if (!fn(window.openModal) || window.openModal.__jfOpen) return;
    var orig = window.openModal;
    var w = function (id) {
      if (isJudge(id)) {
        var done = false;
        try { done = render(id); } catch (e) { done = false; }
        // Falling through on a failed render would hand a judge to the roster
        // renderer, which is the one outcome this wrapper exists to prevent.
        // A failed render is reported as a failure instead.
        if (!done) { try { console.warn('judge file could not render', id); } catch (e2) {} }
        return done;
      }
      mark(false);
      return orig.apply(this, arguments);
    };
    w.__jfOpen = true;
    try { window.openModal = w; } catch (e) {}
  }

  function hookClose() {
    if (!fn(window.closeModal) || window.closeModal.__jfClose) return;
    var orig = window.closeModal;
    var w = function () {
      var out;
      try { out = orig.apply(this, arguments); } catch (e) { out = undefined; }
      mark(false);
      return out;
    };
    w.__jfClose = true;
    try { window.closeModal = w; } catch (e) {}
  }

  function boot() {
    hookOpen();
    hookClose();
    // The renderer is defined in a deferred script and this one may load first;
    // a few settle attempts cost nothing and are the same idiom the other late
    // hooks in this app use.
    [0, 400, 1200, 3000].forEach(function (ms) {
      setTimeout(function () { hookOpen(); hookClose(); }, ms);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  window.PDXJudgeFile = {
    render: render,
    _html: html,
    _isJudge: isJudge,
    _mark: mark,
    _boot: boot
  };
})();
