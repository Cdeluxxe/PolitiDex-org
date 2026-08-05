// ─────────────────────────────────────────────────────────────────────────────
// PolitiDex — Profile Summary Card  ·  window.PDXProfileCard
// ─────────────────────────────────────────────────────────────────────────────
// The shareable REPORT CARD for a person, as opposed to a single receipt.
//
// What existed before this: two share pipelines, both of them one-fact images.
// PDXReceiptCards prints one floor vote against one stated position;
// PDXReceipts prints one curated said-this / did-that pair. Both are excellent
// at what they do, and neither answers the question a reader actually arrives
// with — "so what is this person's record?" A single receipt shared out of the
// app reads as one anecdote, and an anecdote is exactly the thing PolitiDex
// exists not to be.
//
// So this module renders the whole read, in the site's own hierarchy:
//
//   1. ONE signal, in plain language — ⚖️ Word vs Action's verdict: does what
//      they say match what they do? Words, not a percentage. Word vs Action's
//      pooled figure is real and is published in the app beside its own
//      coverage disclosure, but a bare "68%" travelling alone on an image, with
//      no denominator next to it, is precision the card cannot support. The
//      verdict already fails closed (word-action.js Rule 4) and it survives
//      being screenshotted.
//   2. The breakdown underneath it as COUNTS — backed up / mixed /
//      contradicted — plus a proportional bar, so the verdict shows its work.
//   3. Coverage, stated outright: how much word is on file, how much record it
//      was tested against, how much of it is testable at all. A thin profile
//      says it is thin on the card rather than shipping a confident stamp.
//   4. One or two highlights (clearest cases where the record backs the word)
//      and one or two lowlights (clearest contradictions, or — where there are
//      none — the real gaps).
//   5. Promise receipts as kept / broken / open counts. NOT a percentage: the
//      Promise Follow-Through rate is retired sitewide, and this card is not
//      the place it comes back.
//
// Three properties are load-bearing.
//
// · IT INVENTS NOTHING. Every number and every line of prose is read through a
//   public accessor of the module that owns it — PDXWordAction.read/dots for the
//   verdict, the tiers and the tested items; _pdxRecordMappedCounts for the vote
//   coverage; _pdxPromiseTally for the pledge ledger; PDXConsistency.VERDICTS
//   for the words. This file scores nothing and relaxes no guard.
// · IT DEGRADES OUT LOUD. There is no minimum-data gate that silently produces
//   a worse card. A brand-new candidate with three stated positions and no votes
//   gets a card that says, in the signal slot, that there is no record to test
//   yet — and prints the positions as coverage. The only refusal is a person
//   with no documented word at all, which is not a report card, it is a blank.
// · THE IMAGE IS SELF-CONTAINED. The portrait is fetched through the SAME-ORIGIN
//   image proxy and proved readable before it is composited, and a monogram is
//   what the frame gets whenever there is no usable bitmap — so the canvas is
//   never tainted and toBlob()/share() always succeed, offline included (see THE
//   FACE below). Branding, the honesty note and politidex.fyi are all painted in,
//   so the card survives being cropped out of the app.
//
// Depends on nothing being loaded: read() returns null and the caller falls back.
// ─────────────────────────────────────────────────────────────────────────────
(function () {
  'use strict';
  if (window.PDXProfileCard) return; // idempotent

  var IMG_W = 1080, IMG_H = 1350, PAD = 64;
  var SHARE_URL = 'https://politidex.fyi/';

  // Tone colours, borrowed from the shared consistency palette rather than
  // re-picked here, so a card cannot say "green" where the app says "amber".
  var TONE = { good: '#6ee7a0', bad: '#f89b9b', warn: '#93c5fd', muted: '#9fb4d4' };

  function WA() { return window.PDXWordAction || null; }
  function CS() { return window.PDXConsistency || null; }

  // ══════════════════════════════════════════════════════════════════════════
  // READ  ·  everything the card prints, gathered from owning modules
  // ══════════════════════════════════════════════════════════════════════════
  function record(pid) {
    try {
      return (window.PROFILES && window.PROFILES[pid]) ||
             (window.CMP_DATA && window.CMP_DATA[pid]) || null;
    } catch (e) { return null; }
  }

  function partyChip(raw) {
    var c = String(raw || '').trim().charAt(0).toUpperCase();
    if (c === 'R') return { label: 'REPUBLICAN', color: '#f87171' };
    if (c === 'D') return { label: 'DEMOCRAT', color: '#60a5fa' };
    if (c === 'I') return { label: 'INDEPENDENT', color: '#a78bfa' };
    return null;
  }

  function officeLine(p) {
    if (!p) return '';
    // The roster's own office formatter when it is loaded, so the card's second
    // line matches every card in the app. Its icon prefix is dropped: the canvas
    // has no emoji font guarantee and a tofu box is worse than no glyph.
    try {
      if (typeof window._pdxOfficeLine === 'function') {
        var s = window._pdxOfficeLine(p);
        if (s) return String(s).replace(/^[^\w(]+/, '').replace(/\s*•\s*/g, ' · ').trim();
      }
    } catch (e) {}
    return [p.office, p.district, p.state].filter(Boolean).join(' · ');
  }

  // How many roll-call votes are on file, and how many of them are mapped to a
  // curated issue. Only the mapped ones can test anything anyone said, so the
  // mapped figure is the one the coverage line prints — reporting 100 votes as
  // coverage when 9 of them touch a documented position would overstate exactly
  // the thing this card is for. Null when the record has not warmed.
  function voteCoverage(pid) {
    try {
      if (typeof window._pdxRecordMappedCounts !== 'function') return null;
      return window._pdxRecordMappedCounts(pid) || null;
    } catch (e) { return null; }
  }

  function pledgeTally(p) {
    try {
      if (typeof window._pdxPromiseTally !== 'function') return null;
      var t = window._pdxPromiseTally(p);
      return (t && (t.resolved || t.unresolved)) ? t : null;
    } catch (e) { return null; }
  }

  // One tested word item, reduced to the two lines the card can print: what they
  // said, and the formal action that tested it. `actions` comes from
  // PDXWordAction.dots(), which names the vote ("H.R. 22 · On Motion to Recommit
  // · Voted Yea") rather than counting it.
  function toCase(row) {
    var act = (row.actions && row.actions.length && row.actions[0].text) ? String(row.actions[0].text) : '';
    return {
      title: String(row.title || '').trim(),
      word: String(row.word || '').replace(/\s+/g, ' ').trim(),
      action: act.replace(/\s+/g, ' ').trim(),
      token: (row.outcome && row.outcome.token) || 'limited',
      verdict: row.verdict || null
    };
  }

  // The gaps a thin record has, named rather than left as silence. Ordered by how
  // much a reader can do about them: an untested position is a real gap in the
  // public record; a position derived from the record itself can never be tested
  // and is a limit of the method, so it is said last.
  function gapsOf(r) {
    var out = [];
    var byReason = {};
    (r.untested || []).forEach(function (it) {
      var why = (it.test && it.test.reason) || 'unknown';
      byReason[why] = (byReason[why] || 0) + 1;
    });
    if (byReason.no_action_yet) {
      out.push({
        title: byReason.no_action_yet + ' stated position' + (byReason.no_action_yet === 1 ? '' : 's') + ' with no matching vote yet',
        action: 'Nothing on the floor has tested ' + (byReason.no_action_yet === 1 ? 'it' : 'them') + ' — so nothing here counts for or against them.'
      });
    }
    if (byReason.unresolved) {
      out.push({
        title: byReason.unresolved + ' tracked pledge' + (byReason.unresolved === 1 ? '' : 's') + ' still open',
        action: 'Not yet settled either way, so ' + (byReason.unresolved === 1 ? 'it is' : 'they are') + ' held against no one.'
      });
    }
    if (byReason.not_issue_linked) {
      out.push({
        title: byReason.not_issue_linked + ' signature issue' + (byReason.not_issue_linked === 1 ? '' : 's') + ' with no issue mapping',
        action: 'Campaign branding we cannot point at a specific vote.'
      });
    }
    if (byReason.record_derived) {
      out.push({
        title: byReason.record_derived + ' position' + (byReason.record_derived === 1 ? '' : 's') + ' drawn from the record itself',
        action: 'The record cannot test a position it wrote — reported as coverage, never as a mark.'
      });
    }
    if (byReason.warming || byReason.engine_absent) {
      out.push({
        title: 'Part of the voting record was still loading',
        action: 'Re-share once the record settles for the fullest read.'
      });
    }
    return out;
  }

  // The whole card, as data. Null only when there is no documented word at all —
  // a report card on nothing is not a thin card, it is a fabrication.
  //
  // Split in two on purpose. brief() is the verdict, the counts and the coverage:
  // one PDXWordAction.read(), which is what a share button needs to know whether
  // it can offer a card and what to call it. read() adds the cited examples, which
  // cost a dots() pass and a named-action lookup per row — real work, only done
  // for a card that is actually being drawn.
  function brief(pid, p) {
    pid = String(pid || '');
    if (!pid) return null;
    p = p || record(pid);
    if (!p) return null;
    var wa = WA();
    if (!wa || typeof wa.read !== 'function') return null;

    var r;
    try { r = wa.read(pid, p); } catch (e) { return null; }
    if (!r || !r.coverage || !r.coverage.word) return null;

    var counts = r.counts || {};
    var vc = voteCoverage(pid);
    var items = r.items || [];
    var nPledges = items.filter(function (it) { return it.kind === 'pledge-tracked'; }).length;
    var nBranding = items.filter(function (it) { return it.kind === 'branding'; }).length;
    var nStances = items.length - nPledges - nBranding;
    var v = r.verdict || (CS() && CS().VERDICTS ? CS().VERDICTS.no_record : null);
    var tone = (v && v.tone) || 'muted';

    return {
      pid: pid,
      name: String(p.name || pid),
      office: officeLine(p),
      party: partyChip(p.party),
      // ── the one signal ──
      verdict: v,
      accent: (v && v.color) || TONE[tone] || TONE.muted,
      // Plain-language, and honest about the floor: below it the read says it is
      // still looking rather than stamping a verdict on one tested item.
      publishable: !!r.publishable,
      signal: signalLine(r, v),
      // ── the breakdown, as counts ──
      breakdown: {
        consistent: counts.consistent || 0,
        mixed: (counts.mixed || 0) + (counts.limited || 0),
        contradicts: counts.contradicts || 0
      },
      // ── coverage ──
      coverage: {
        word: r.coverage.word, tested: r.coverage.tested,
        scorable: r.coverage.scorable, untested: r.coverage.untested,
        stances: nStances, pledges: nPledges, branding: nBranding,
        votes: vc ? vc.votes : null, votesTotal: vc ? vc.total : null,
        voteIssues: vc ? vc.issues : null,
        warming: !!r.coverage.warming
      },
      pledges: pledgeTally(p),
      _r: r
    };
  }

  // Memoised for the share CONTROL only — every list row asks "is there a card for
  // this person?" on every repaint, and search re-renders on each keystroke. The
  // memo is dropped whenever the answer can have changed (a record settling is the
  // only thing that changes it), and drawing a card never reads it: share() always
  // recomputes against the record it just warmed.
  var _briefMemo = {};
  function briefCached(pid, p) {
    pid = String(pid || '');
    if (!pid) return null;
    if (Object.prototype.hasOwnProperty.call(_briefMemo, pid)) return _briefMemo[pid];
    var v = null;
    try { v = brief(pid, p); } catch (e) { v = null; }
    _briefMemo[pid] = v;
    return v;
  }
  function bust() { _briefMemo = {}; }
  try {
    window.addEventListener('pdx-consistency-warm', bust);
    window.addEventListener('pdx-voting-warm', bust);
    document.addEventListener('pdx:data:acctSpotlight', bust);
  } catch (e) {}

  function read(pid, p) {
    var d = brief(pid, p);
    if (!d) return null;
    var wa = WA();
    var rows = [];
    try {
      rows = (wa && typeof wa.dots === 'function' ? wa.dots(pid, p || record(pid), { limit: 60 }) : []) || [];
    } catch (e) { rows = []; }
    var cases = rows.map(toCase);

    // dots() is already sorted worst-first and weight-desc inside each verdict,
    // so the strongest example of each kind is the first one of that kind.
    var backs = cases.filter(function (c) { return c.token === 'consistent'; });
    var against = cases.filter(function (c) { return c.token === 'contradicts'; });
    var mixed = cases.filter(function (c) { return c.token === 'mixed'; });

    // ── proof, both directions ──
    d.highlights = backs.slice(0, 2);
    d.lowlights = against.length ? against.slice(0, 2) : mixed.slice(0, 1);
    d.lowlightKind = against.length ? 'contradicts' : (mixed.length ? 'mixed' : 'gap');
    d.gaps = gapsOf(d._r);
    return d;
  }

  // The sentence under the verdict. It reports what the verdict rests on, in the
  // same numbers the coverage line prints, so the two can never disagree — and
  // below the publishing floor it says so instead of narrating a finding.
  function signalLine(r, v) {
    var n = r.coverage.tested;
    if (!r.publishable) {
      if (r.coverage.warming) return 'The voting record was still loading when this card was built.';
      if (!n) {
        return r.coverage.scorable
          ? 'Nothing they have said has met a formal action yet — there is no record to test it against.'
          : 'What is on file is not the kind of word a vote can test yet.';
      }
      return 'Only ' + n + ' statement' + (n === 1 ? ' has' : 's have') +
        ' been tested so far — too little to call it either way.';
    }
    return (v && v.short ? v.short + ' ' : '') +
      'Weighed across ' + n + ' documented statement' + (n === 1 ? '' : 's') +
      ' a formal action can test.';
  }

  // ══════════════════════════════════════════════════════════════════════════
  // CANVAS  ·  no libraries, no hotlinked pixels, no new data
  // ══════════════════════════════════════════════════════════════════════════
  function ensureFonts() {
    if (!document.fonts || !document.fonts.load) return Promise.resolve();
    var wants = [
      '700 40px "Bebas Neue"', '700 40px "Barlow Condensed"', '800 40px "Barlow Condensed"',
      '600 40px "Barlow Condensed"', '400 40px "Barlow"', '600 40px "Barlow"', '700 40px "Barlow"'
    ];
    var loads = wants.map(function (f) { try { return document.fonts.load(f); } catch (e) { return Promise.resolve(); } });
    // Never block a share on a slow font fetch — 1.2s cap, then draw.
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

  // Word-wrap to `maxW`, at most `maxLines`, ellipsis on the last line if cut.
  function wrapText(ctx, text, maxW, maxLines) {
    var words = String(text == null ? '' : text).trim().split(/\s+/).filter(Boolean);
    var lines = [], cur = '';
    for (var i = 0; i < words.length; i++) {
      var probe = cur ? cur + ' ' + words[i] : words[i];
      if (ctx.measureText(probe).width <= maxW || !cur) cur = probe;
      else {
        lines.push(cur); cur = words[i];
        if (maxLines && lines.length === maxLines) { cur = ''; break; }
      }
    }
    if (cur && (!maxLines || lines.length < maxLines)) lines.push(cur);
    if (maxLines && lines.length === maxLines) {
      var consumed = lines.join(' ').split(/\s+/).length;
      if (consumed < words.length) {
        var last = lines[maxLines - 1];
        while (last && ctx.measureText(last + '…').width > maxW) {
          var shorter = last.replace(/\s*\S+$/, '');
          if (shorter === last) { last = last.slice(0, -1); }
          else { last = shorter; }
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

  // ── THE FACE ────────────────────────────────────────────────────────────────
  // Every other card PolitiDex draws puts a monogram in this frame, for one hard
  // reason: a cross-origin bitmap TAINTS the canvas, and toBlob() then throws at
  // the exact moment the reader taps share — on a device the author will never
  // see. So "no hotlinked photos" was never an aesthetic choice.
  //
  // A face is worth having on THIS card, though. It is the one artifact built to
  // leave the app and be recognised in a stranger's feed, and a monogram is the
  // one element on it that says nothing. So the constraint is SATISFIED rather
  // than relaxed: the portrait is fetched from /.netlify/images, which is our own
  // origin, so the pixels arrive same-origin no matter which host holds the
  // original and there is nothing to taint. The hosts are allowlisted in
  // netlify.toml ([images] remote_images, the same six the photo-coverage test
  // pins); an un-allowlisted host 404s, which lands in exactly the same place a
  // dead network does — the monogram.
  //
  // Three properties still have to hold, and each has its own guard, because all
  // three fail INSIDE a share gesture where there is no second chance:
  //   · the share must not HANG on a slow portrait → AVATAR_MS cap, then draw
  //   · the share must not FAIL on a tainted canvas → a 1×1 scratch probe runs
  //     getImageData before the bitmap goes anywhere near the card
  //   · the frame must not be EMPTY → the monogram is not a bolted-on fallback,
  //     it is what this path draws whenever it has no usable bitmap
  var AVATAR_MS = 2500;
  // Twice the drawn box, so the face is sharp on the 1080px card without pulling
  // a full-resolution portrait through a phone connection to draw it at 116px.
  var AVATAR_PX = 232;

  function photoUrl(pid) {
    try {
      if (typeof window._getPhotoUrl === 'function') return String(window._getPhotoUrl(pid) || '');
    } catch (e) {}
    return '';
  }

  // The address the canvas is allowed to load. Remote portraits go through the
  // same-origin proxy; inline and root-relative ones are already ours and are
  // passed straight through (the proxy cannot fetch a data: URL anyway).
  function avatarSrc(pid) {
    var raw = photoUrl(pid).trim();
    if (!raw) return '';
    if (/^data:image\//i.test(raw)) return raw;
    if (/^\/\//.test(raw)) raw = 'https:' + raw;
    if (/^https?:/i.test(raw)) {
      return '/.netlify/images?url=' + encodeURIComponent(raw) +
             '&w=' + AVATAR_PX + '&h=' + AVATAR_PX + '&fit=cover&fm=png';
    }
    if (raw.charAt(0) === '/') return raw;
    return ''; // anything else is not an address we can vouch for
  }

  // Prove the bitmap is readable BEFORE it touches the card. getImageData is the
  // same read toBlob() performs internally, so a pass here means the share cannot
  // die of a SecurityError, and a throw here leaves us holding a card with a
  // monogram in it rather than an exception mid-gesture.
  function taintSafe(img) {
    try {
      var s = document.createElement('canvas');
      s.width = 1; s.height = 1;
      var sc = s.getContext && s.getContext('2d');
      if (!sc || !sc.drawImage || !sc.getImageData) return false;
      sc.drawImage(img, 0, 0, 1, 1);
      sc.getImageData(0, 0, 1, 1);
      return true;
    } catch (e) { return false; }
  }

  // Resolves to a drawable, proven-readable image — or to null, which is not a
  // failure state. Never rejects: a card is due either way.
  function loadAvatar(src) {
    return new Promise(function (resolve) {
      var Img = window.Image;
      if (!src || typeof Img !== 'function') { resolve(null); return; }
      var settled = false;
      var finish = function (v) { if (!settled) { settled = true; resolve(v); } };
      var img;
      try { img = new Img(); } catch (e) { finish(null); return; }
      try { setTimeout(function () { finish(null); }, AVATAR_MS); } catch (e) {}
      img.onload = function () {
        var w = img.naturalWidth || img.width, h = img.naturalHeight || img.height;
        finish((w && h && taintSafe(img)) ? img : null);
      };
      img.onerror = function () { finish(null); };
      try { img.src = src; } catch (e) { finish(null); }
    });
  }

  // Cover-fit inside the circle: the portrait keeps its aspect ratio and the
  // overflow is clipped, so no one's head is squashed to fit a square. Returns
  // false when it drew nothing, which is the caller's cue to draw the monogram.
  function drawAvatar(ctx, img, cx, cy, r) {
    var iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
    if (!iw || !ih || !ctx.drawImage) return false;
    var scale = Math.max((r * 2) / iw, (r * 2) / ih);
    var dw = iw * scale, dh = ih * scale;
    ctx.save();
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.clip();
    ctx.drawImage(img, cx - dw / 2, cy - dh / 2, dw, dh);
    ctx.restore();
    return true;
  }

  function initials(name) {
    var parts = String(name || '').trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return '★';
    var a = parts[0][0] || '';
    var b = parts.length > 1 ? (parts[parts.length - 1][0] || '') : '';
    return (a + b).toUpperCase();
  }

  // A verdict label with its glyph, in a font the canvas can actually draw. The
  // shared palette's icons are ✓ ⚠ ◑ … — all of them plain glyphs rather than
  // colour emoji, so they render. Kept as one helper so the card and the caption
  // cannot drift apart.
  function verdictText(v) {
    if (!v) return 'BUILDING THE RECORD';
    return String(v.ico + ' ' + v.label).toUpperCase();
  }

  // The eyebrow above one of the two proof blocks.
  var LOWLIGHT_HEAD = {
    contradicts: 'WHERE THE RECORD CONTRADICTS THEM',
    mixed: 'WHERE THE RECORD CUTS BOTH WAYS',
    gap: 'WHERE THE RECORD IS STILL MISSING'
  };

  function renderCanvas(d) {
    // The fonts and the face are fetched together — two independent waits, each
    // with its own cap, so the slower one is the only cost. Both resolve to
    // "draw without it" rather than rejecting.
    return Promise.all([ensureFonts(), loadAvatar(avatarSrc(d.pid))]).then(function (got) {
      var photo = got[1];
      var c = document.createElement('canvas');
      c.width = IMG_W; c.height = IMG_H;
      var ctx = c.getContext('2d');
      var accent = d.accent;
      var x = PAD, right = IMG_W - PAD, contentW = right - x;

      // ── Background, glow, tiled watermark, verdict rail ──
      var bg = ctx.createLinearGradient(0, 0, 0, IMG_H);
      bg.addColorStop(0, '#0c1326'); bg.addColorStop(0.55, '#0b1120'); bg.addColorStop(1, '#080d1a');
      ctx.fillStyle = bg; ctx.fillRect(0, 0, IMG_W, IMG_H);
      var glow = ctx.createRadialGradient(IMG_W / 2, -80, 40, IMG_W / 2, -80, 720);
      glow.addColorStop(0, accent + '30'); glow.addColorStop(1, 'transparent');
      ctx.fillStyle = glow; ctx.fillRect(0, 0, IMG_W, 420);

      ctx.save();
      ctx.fillStyle = 'rgba(255,255,255,0.035)';
      ctx.font = '700 64px "Bebas Neue", "Barlow Condensed", sans-serif';
      ctx.textBaseline = 'middle';
      ctx.translate(IMG_W / 2, IMG_H / 2); ctx.rotate(-28 * Math.PI / 180);
      for (var wy = -IMG_H; wy < IMG_H; wy += 150) {
        for (var wx = -IMG_W; wx < IMG_W; wx += 520) ctx.fillText('POLITIDEX', wx, wy);
      }
      ctx.restore();

      ctx.fillStyle = accent; ctx.fillRect(0, 0, 12, IMG_H);
      ctx.strokeStyle = 'rgba(255,255,255,0.10)'; ctx.lineWidth = 2;
      roundRect(ctx, 24, 24, IMG_W - 48, IMG_H - 48, 28); ctx.stroke();

      var y = PAD + 24;
      ctx.textBaseline = 'top'; ctx.textAlign = 'left';

      // ── Header: wordmark + tagline · what this card is ──
      ctx.font = '700 54px "Bebas Neue", "Barlow Condensed", sans-serif';
      ctx.fillStyle = '#ffffff'; ctx.fillText('POLITI', x, y);
      var wI = ctx.measureText('POLITI').width;
      ctx.fillStyle = '#f0475f'; ctx.fillText('DEX', x + wI, y);
      ctx.font = '700 20px "Barlow Condensed", sans-serif';
      ctx.fillStyle = '#f5c842';
      ctx.fillText('B O U N D   B Y   T R U T H', x + 3, y + 58);

      ctx.textAlign = 'right';
      ctx.font = '800 26px "Barlow Condensed", sans-serif';
      ctx.fillStyle = '#9fb4d4';
      ctx.fillText('RECORD CARD', right, y + 6);
      ctx.font = '700 20px "Barlow Condensed", sans-serif';
      ctx.fillStyle = '#7596c0';
      ctx.fillText('WORD  vs  ACTION', right, y + 40);
      ctx.textAlign = 'left';

      y += 100;
      ctx.strokeStyle = 'rgba(255,255,255,0.10)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(right, y); ctx.stroke();
      y += 30;

      // ── Identity: portrait (monogram when there is none) + name + office + party ──
      var av = 116, avx = x, avy = y;
      var ringCol = d.party ? d.party.color : '#7596c0';
      var acx = avx + av / 2, acy = avy + av / 2;
      var drewFace = false;
      if (photo) { try { drewFace = drawAvatar(ctx, photo, acx, acy, av / 2); } catch (e) { drewFace = false; } }
      if (!drewFace) {
        ctx.beginPath(); ctx.arc(acx, acy, av / 2, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,255,255,0.06)'; ctx.fill();
        ctx.fillStyle = '#eef4ff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.font = '700 48px "Bebas Neue", "Barlow Condensed", sans-serif';
        ctx.fillText(initials(d.name), acx, acy + 3);
        ctx.textAlign = 'left'; ctx.textBaseline = 'top';
      }
      // The party ring is drawn last either way, over the edge of a photo, so the
      // frame reads the same whichever of the two is inside it.
      ctx.beginPath(); ctx.arc(acx, acy, av / 2, 0, Math.PI * 2);
      ctx.lineWidth = 4; ctx.strokeStyle = ringCol; ctx.stroke();

      var nx = avx + av + 26, nw = right - nx;
      ctx.font = '700 58px "Bebas Neue", "Barlow Condensed", sans-serif';
      ctx.fillStyle = '#ffffff';
      var nameLines = wrapText(ctx, d.name, nw, 2);
      var ny = avy + (nameLines.length === 1 ? 6 : 0);
      var afterName = drawLines(ctx, nameLines, nx, ny, 54);
      var idBottom = afterName;
      if (d.office) {
        ctx.font = '600 26px "Barlow Condensed", sans-serif';
        ctx.fillStyle = '#9fb4d4';
        ctx.fillText(wrapText(ctx, d.office, nw, 1)[0] || '', nx, afterName + 4);
        idBottom = afterName + 36;
      }
      if (d.party) {
        ctx.font = '800 20px "Barlow Condensed", sans-serif';
        var pw = ctx.measureText(d.party.label).width + 30;
        var py = afterName + (d.office ? 38 : 6);
        ctx.fillStyle = d.party.color + '22';
        ctx.strokeStyle = d.party.color + '88'; ctx.lineWidth = 2;
        roundRect(ctx, nx, py, pw, 34, 17); ctx.fill(); ctx.stroke();
        ctx.fillStyle = d.party.color; ctx.textBaseline = 'middle';
        ctx.fillText(d.party.label, nx + 15, py + 18);
        ctx.textBaseline = 'top';
        idBottom = py + 34;
      }
      // Whichever side of the band is taller wins. A two-line name plus an office
      // line plus a party chip is taller than the 116px avatar, and taking the
      // avatar's height as the band's height would run the chip under the signal
      // box. The avatar wants more breathing room below it than the chip does —
      // it is a circle, so its ink stops well before its box — hence the two
      // different gaps rather than one applied to the taller side.
      y = Math.max(avy + av + 26, idBottom + 10);

      // ── THE ONE SIGNAL ──────────────────────────────────────────────────────
      // The question in the reader's words, then the verdict in the app's words.
      // No percentage: see the module header.
      ctx.font = '400 28px "Barlow", sans-serif';
      var sigLines = wrapText(ctx, d.signal, contentW - 56, 3);
      var bandH = 44 + 62 + sigLines.length * 36 + 26;
      ctx.fillStyle = accent + '14';
      ctx.strokeStyle = accent + '55'; ctx.lineWidth = 3;
      roundRect(ctx, x, y, contentW, bandH, 20); ctx.fill(); ctx.stroke();

      var by = y + 22;
      ctx.font = '800 22px "Barlow Condensed", sans-serif';
      ctx.fillStyle = '#9fb4d4';
      ctx.fillText('DOES WHAT THEY SAY MATCH WHAT THEY DO?', x + 28, by);
      by += 32;
      ctx.font = '700 52px "Bebas Neue", "Barlow Condensed", sans-serif';
      ctx.fillStyle = accent;
      ctx.fillText(wrapText(ctx, verdictText(d.verdict), contentW - 56, 1)[0] || '', x + 28, by);
      by += 58;
      ctx.font = '400 28px "Barlow", sans-serif';
      ctx.fillStyle = '#dbe6f7';
      drawLines(ctx, sigLines, x + 28, by, 36);
      y += bandH + 26;

      // ── Breakdown: proportional bar + counts ────────────────────────────────
      var b = d.breakdown;
      var tot = b.consistent + b.mixed + b.contradicts;
      ctx.font = '800 22px "Barlow Condensed", sans-serif';
      ctx.fillStyle = '#9fb4d4';
      ctx.fillText(tot ? 'HOW THE TESTED STATEMENTS LANDED' : 'NOTHING HAS BEEN TESTED YET', x, y);
      y += 30;
      var barH = 18;
      if (tot) {
        var segs = [[b.consistent, TONE.good], [b.mixed, TONE.warn], [b.contradicts, TONE.bad]];
        var sx = x;
        segs.forEach(function (s) {
          if (!s[0]) return;
          var w = Math.max(6, Math.round(contentW * s[0] / tot));
          if (sx + w > right) w = right - sx;
          ctx.fillStyle = s[1];
          roundRect(ctx, sx, y, w, barH, 9); ctx.fill();
          sx += w + 3;
        });
      } else {
        ctx.fillStyle = 'rgba(255,255,255,0.07)';
        roundRect(ctx, x, y, contentW, barH, 9); ctx.fill();
      }
      y += barH + 16;
      // Legend — the counts themselves, one row, never a percentage.
      var legend = [
        ['BACKED UP', b.consistent, TONE.good],
        ['MIXED', b.mixed, TONE.warn],
        ['CONTRADICTED', b.contradicts, TONE.bad]
      ];
      var lx = x;
      legend.forEach(function (l) {
        ctx.font = '800 30px "Barlow Condensed", sans-serif';
        ctx.fillStyle = l[2];
        ctx.fillText(String(l[1]), lx, y);
        var numW = ctx.measureText(String(l[1])).width;
        ctx.font = '700 20px "Barlow Condensed", sans-serif';
        ctx.fillStyle = '#9fb4d4';
        ctx.fillText(l[0], lx + numW + 9, y + 9);
        lx += numW + 9 + ctx.measureText(l[0]).width + 40;
      });
      y += 44;

      // ── Coverage, stated outright ───────────────────────────────────────────
      // Terse on purpose: this line has to survive a phone-sized crop, and the
      // caption carries the same figures in full sentences. "mapped votes" rather
      // than "votes on record" because the mapped ones are the only votes that can
      // test anything anyone said — the total on file is a bigger, emptier number.
      var cov = d.coverage;
      var covBits = [cov.stances + ' stance' + (cov.stances === 1 ? '' : 's')];
      if (cov.pledges) covBits.push(cov.pledges + ' pledge' + (cov.pledges === 1 ? '' : 's'));
      covBits.push(cov.votes === null ? 'votes still loading'
                                     : cov.votes + ' mapped vote' + (cov.votes === 1 ? '' : 's'));
      covBits.push(cov.tested + ' of ' + cov.scorable + ' testable');
      ctx.font = '600 25px "Barlow Condensed", sans-serif';
      ctx.fillStyle = '#8fd0ff';
      y = drawLines(ctx, wrapText(ctx, 'COVERAGE: ' + covBits.join('  ·  '), contentW, 2), x, y, 30) + 8;

      // ── Footer geometry, reserved before any proof is drawn ─────────────────
      var footH = d.pledges ? 130 : 100;
      var footTop = IMG_H - PAD - footH;

      // ── Highlights / lowlights ─────────────────────────────────────────────
      // Each block takes as many rows as the space above the footer allows, and
      // no more. A row that would be clipped is not drawn at all: half a cited
      // vote is not a citation. The heading is drawn LAZILY, with the first row
      // that fits — a heading with nothing under it reads as a section the card
      // silently failed to fill, which is worse than the section being absent.
      function block(head, headCol, cases, ico) {
        if (!cases || !cases.length) return;
        var headDrawn = false;
        for (var i = 0; i < cases.length; i++) {
          var cse = cases[i];
          ctx.font = '700 30px "Barlow", sans-serif';
          var tLines = wrapText(ctx, (ico ? ico + '  ' : '') + (cse.title || ''), contentW, 2);
          ctx.font = '400 24px "Barlow", sans-serif';
          var aLines = cse.action ? wrapText(ctx, cse.action, contentW - 22, 2) : [];
          var need = tLines.length * 36 + aLines.length * 30 + 14 + (headDrawn ? 0 : 32);
          if (y + need > footTop) break;
          if (!headDrawn) {
            ctx.font = '800 22px "Barlow Condensed", sans-serif';
            ctx.fillStyle = headCol;
            ctx.fillRect(x, y + 3, 5, 22);
            ctx.fillText(head, x + 16, y);
            y += 32;
            headDrawn = true;
          }
          ctx.font = '700 30px "Barlow", sans-serif';
          ctx.fillStyle = '#ffffff';
          y = drawLines(ctx, tLines, x, y, 36);
          if (aLines.length) {
            ctx.font = '400 24px "Barlow", sans-serif';
            ctx.fillStyle = '#a9bcd6';
            y = drawLines(ctx, aLines, x + 22, y + 2, 30);
          }
          y += 14;
        }
        if (headDrawn) y += 8;
      }

      block('WHERE THE RECORD BACKS THEM UP', TONE.good, d.highlights, '✓');
      var lowHead = LOWLIGHT_HEAD[d.lowlightKind] || LOWLIGHT_HEAD.gap;
      if (d.lowlights && d.lowlights.length) {
        block(lowHead, d.lowlightKind === 'mixed' ? TONE.warn : TONE.bad, d.lowlights,
              d.lowlightKind === 'mixed' ? '◑' : '⚠');
        // A card with citations on both sides still owes the reader what is
        // UNPROVEN, and the space below the lowlights is exactly where a reader
        // would otherwise conclude they had seen everything. Printed only if it
        // fits whole — block() drops a row it would have to clip.
        if (d.gaps && d.gaps.length) block('AND WHAT IS STILL UNTESTED', TONE.muted, d.gaps.slice(0, 1), '—');
      } else if (d.gaps && d.gaps.length) {
        block(LOWLIGHT_HEAD.gap, TONE.muted, d.gaps.slice(0, 2), '—');
      }

      // ── Footer: pledge receipts · honesty note · branding ──────────────────
      var fy = footTop;
      ctx.strokeStyle = 'rgba(255,255,255,0.10)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x, fy); ctx.lineTo(right, fy); ctx.stroke();
      fy += 18;
      if (d.pledges) {
        var t = d.pledges;
        ctx.font = '800 24px "Barlow Condensed", sans-serif';
        var plx = x;
        ctx.fillStyle = '#9fb4d4'; ctx.fillText('PLEDGE RECEIPTS:', plx, fy);
        plx += ctx.measureText('PLEDGE RECEIPTS:') .width + 12;
        var plBits = [[t.kept + ' KEPT', TONE.good], [t.broken + ' BROKEN', TONE.bad]];
        if (t.unresolved) plBits.push([t.unresolved + ' OPEN', '#f5c842']);
        plBits.forEach(function (pb, i) {
          if (i) { ctx.fillStyle = '#4a5a75'; ctx.fillText('·', plx, fy); plx += 16; }
          ctx.fillStyle = pb[1]; ctx.fillText(pb[0], plx, fy);
          plx += ctx.measureText(pb[0]).width + 12;
        });
        fy += 32;
      }
      ctx.font = '600 21px "Barlow Condensed", sans-serif';
      ctx.fillStyle = '#7596c0';
      var note = 'Built only from sourced votes and documented positions. No score where the record is too thin to carry one. Check it yourself.';
      drawLines(ctx, wrapText(ctx, note, contentW - 210, 2), x, fy, 26);

      ctx.textAlign = 'right';
      ctx.font = '700 28px "Barlow Condensed", sans-serif';
      ctx.fillStyle = '#f5c842';
      ctx.fillText('politidex.fyi', right, fy);
      ctx.font = '700 19px "Barlow Condensed", sans-serif';
      ctx.fillStyle = '#9fb4d4';
      ctx.fillText('BOUND BY TRUTH', right, fy + 34);
      ctx.textAlign = 'left';

      return c;
    });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // CAPTION  ·  the half of a share that arrives as text
  // ──────────────────────────────────────────────────────────────────────────
  // Same facts, same order, same refusals as the image — a caption that says more
  // than the card would be a second, unsourced claim.
  // ══════════════════════════════════════════════════════════════════════════
  function profileUrl(pid) {
    try {
      if (typeof window.pdxShareUrl === 'function') return window.pdxShareUrl(pid);
    } catch (e) {}
    return SHARE_URL + '?p=' + encodeURIComponent(pid);
  }

  function caption(d) {
    var L = [];
    L.push('⚖️ WORD vs ACTION — ' + d.name + (d.office ? ' (' + d.office + ')' : ''));
    L.push('');
    L.push('Does what they say match what they do? ' + (d.verdict ? d.verdict.ico + ' ' + d.verdict.label + '.' : 'Still building the record.'));
    L.push(d.signal);
    L.push('');
    var b = d.breakdown;
    if (b.consistent + b.mixed + b.contradicts) {
      L.push('Tested statements: ' + b.consistent + ' backed up · ' + b.mixed + ' mixed · ' + b.contradicts + ' contradicted');
    }
    var cov = d.coverage;
    L.push('Coverage: ' + cov.stances + ' stance' + (cov.stances === 1 ? '' : 's') +
      (cov.pledges ? ' · ' + cov.pledges + ' tracked pledge' + (cov.pledges === 1 ? '' : 's') : '') +
      (cov.votes === null ? '' : ' · ' + cov.votes + ' mapped vote' + (cov.votes === 1 ? '' : 's') + ' on record') +
      ' · ' + cov.tested + ' of ' + cov.scorable + ' testable');
    if (d.pledges) {
      L.push('Pledge receipts: ' + d.pledges.kept + ' kept · ' + d.pledges.broken + ' broken' +
        (d.pledges.unresolved ? ' · ' + d.pledges.unresolved + ' still open' : '') +
        ' (counts, not a percentage — PolitiDex publishes one integrity read, not two)');
    }
    if ((d.highlights || []).length) {
      L.push('');
      L.push('✓ Record backs them: ' + d.highlights[0].title + (d.highlights[0].action ? ' — ' + d.highlights[0].action : ''));
    }
    if ((d.lowlights || []).length) {
      L.push((d.lowlightKind === 'mixed' ? '◑ Cuts both ways: ' : '⚠ Record contradicts them: ') +
        d.lowlights[0].title + (d.lowlights[0].action ? ' — ' + d.lowlights[0].action : ''));
    } else if ((d.gaps || []).length) {
      L.push('— Still missing: ' + d.gaps[0].title);
    }
    L.push('');
    L.push('Built only from sourced votes and documented positions. Check it yourself:');
    L.push(profileUrl(d.pid));
    L.push('');
    L.push('PolitiDex · Bound by Truth · politidex.fyi');
    return L.join('\n');
  }

  // ══════════════════════════════════════════════════════════════════════════
  // SHARE
  // ══════════════════════════════════════════════════════════════════════════
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

  function slugify(s) {
    return String(s || 'record').toLowerCase().replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '').slice(0, 40) || 'record';
  }

  function toast(msg) {
    try { if (typeof window._showToast === 'function') { window._showToast(msg); return; } } catch (e) {}
    try {
      var t = document.createElement('div');
      t.className = 'svd-toast'; t.textContent = msg;
      document.body.appendChild(t);
      requestAnimationFrame(function () { t.classList.add('is-in'); });
      setTimeout(function () {
        t.classList.remove('is-in');
        setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 320);
      }, 2800);
    } catch (e) {}
  }

  function download(dataUrl, name) {
    var a = document.createElement('a');
    a.href = dataUrl; a.download = name;
    document.body.appendChild(a); a.click();
    setTimeout(function () { if (a.parentNode) a.parentNode.removeChild(a); }, 60);
  }

  function copyText(txt) {
    if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(txt).catch(function () {});
    try {
      var ta = document.createElement('textarea');
      ta.value = txt; document.body.appendChild(ta); ta.select();
      document.execCommand('copy'); document.body.removeChild(ta);
    } catch (e) {}
    return Promise.resolve();
  }

  // Desktop / no-file-share fallback. Same shell and same CSS as the receipt
  // menu (.svd-share-menu), because a reader who has met one should not have to
  // learn a second.
  var _menuEl = null;
  function closeMenu() {
    if (_menuEl && _menuEl.parentNode) _menuEl.parentNode.removeChild(_menuEl);
    _menuEl = null;
    document.removeEventListener('click', onDocClick, true);
  }
  function onDocClick(e) { if (_menuEl && !_menuEl.contains(e.target)) closeMenu(); }

  function openFallbackMenu(d, dataUrl, fileName, btn) {
    closeMenu();
    var cap = caption(d);
    var url = profileUrl(d.pid);
    download(dataUrl, fileName);
    var m = document.createElement('div');
    m.className = 'svd-share-menu';
    m.innerHTML =
      '<div class="svd-sm-head">Share this record card</div>' +
      '<div class="svd-sm-note">✅ Image saved to your device — attach it to your post.</div>' +
      '<button type="button" data-act="save">📥 Save image again</button>' +
      '<button type="button" data-act="copy">🔗 Copy the summary</button>' +
      '<button type="button" data-act="x">𝕏  Post on X</button>' +
      '<button type="button" data-act="fb">📘 Share on Facebook</button>';
    document.body.appendChild(m);
    _menuEl = m;
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
      var bt = e.target.closest && e.target.closest('button'); if (!bt) return;
      var act = bt.getAttribute('data-act');
      if (act === 'save') download(dataUrl, fileName);
      else if (act === 'copy') copyText(cap).then(function () { toast('Summary copied'); });
      else if (act === 'x') window.open('https://twitter.com/intent/tweet?text=' +
        encodeURIComponent(shortPost(d)) + '&url=' + encodeURIComponent(url), '_blank', 'noopener');
      else if (act === 'fb') window.open('https://www.facebook.com/sharer/sharer.php?u=' +
        encodeURIComponent(url) + '&quote=' + encodeURIComponent(shortPost(d)), '_blank', 'noopener');
      if (act !== 'copy') closeMenu();
    });
    setTimeout(function () { document.addEventListener('click', onDocClick, true); }, 0);
  }

  // The 280-character version. The address travels separately in the intent URL,
  // so the whole budget goes to the finding — verdict, then the counts that back
  // it, then coverage. Nothing here is a claim the card does not also make.
  function shortPost(d) {
    var b = d.breakdown;
    var head = '⚖️ ' + d.name + ' — ' + (d.verdict ? d.verdict.ico + ' ' + d.verdict.label : 'record still building');
    var mid = (b.consistent + b.mixed + b.contradicts)
      ? b.consistent + ' backed up · ' + b.mixed + ' mixed · ' + b.contradicts + ' contradicted'
      : d.coverage.stances + ' stated position' + (d.coverage.stances === 1 ? '' : 's') + ', none tested by a vote yet';
    var tail = 'Word vs Action on PolitiDex.';
    var out = head + '\n' + mid + '\n' + tail;
    return out.length <= 280 ? out : (head + '\n' + tail);
  }

  // The record has to be warm for the vote coverage and the tested items to be
  // real, so a cold tap warms it inside the same gesture — one tap, still. Capped
  // so a dead network produces a thin-but-honest card instead of a hang.
  function warm(pid) {
    var waits = [];
    try {
      var rc = window.PDXReceiptCards;
      if (rc && typeof rc.warm === 'function') waits.push(Promise.resolve(rc.warm(pid)).catch(function () {}));
    } catch (e) {}
    try {
      var cs = CS();
      if (cs && typeof cs.warm === 'function') cs.warm(pid); // fire-and-forget queue
    } catch (e) {}
    if (!waits.length) return Promise.resolve();
    return Promise.race([
      Promise.all(waits),
      new Promise(function (res) { setTimeout(res, 3000); })
    ]);
  }

  var _sharing = false;
  function setBusy(btn, on) {
    if (!btn || !btn.classList) return;
    if (on) { btn.classList.add('pdxsa-busy'); btn.setAttribute('aria-busy', 'true'); }
    else { btn.classList.remove('pdxsa-busy'); btn.removeAttribute('aria-busy'); }
  }

  // One tap. Returns a promise so PDXShareAnywhere can chain, and never rejects:
  // every failure path ends in a toast and a resolved promise.
  function share(pid, btn) {
    pid = String(pid || '');
    if (!pid) return Promise.resolve(null);
    if (_sharing) return Promise.resolve(null);
    _sharing = true; setBusy(btn, true);
    var done = function (v) { _sharing = false; setBusy(btn, false); return v; };

    return warm(pid).then(function () {
      var d = read(pid);
      if (!d) { toast('No documented record to build a card from yet'); return null; }
      var fileName = 'politidex-record-' + slugify(d.name) + '.png';
      return renderCanvas(d).then(function (canvas) {
        return canvasToBlob(canvas).then(function (blob) {
          var file = null;
          try { file = new File([blob], fileName, { type: 'image/png' }); } catch (e) {}
          var payload = { text: caption(d) };
          if (file) payload.files = [file];
          if (file && navigator.canShare && navigator.canShare({ files: [file] }) && navigator.share) {
            return navigator.share(payload).catch(function (e) {
              if (e && (e.name === 'AbortError' || e.name === 'NotAllowedError')) return; // cancelled
              openFallbackMenu(d, canvas.toDataURL('image/png'), fileName, btn);
            });
          }
          openFallbackMenu(d, canvas.toDataURL('image/png'), fileName, btn);
          return null;
        });
      });
    }).catch(function () {
      toast('Could not build the card on this device');
      return null;
    }).then(done, done);
  }

  // Is there a card to offer? Cheap (one read, memoised), synchronous, and
  // deliberately generous: any documented word at all is enough, because the
  // card's job on a thin profile is to SAY it is thin. PDXShareAnywhere calls this
  // to resolve its top tier, once per person per repaint.
  function available(pid, p) {
    return !!briefCached(pid, p);
  }

  // A one-line description of what the card would say, for the share sheet's hint
  // line. Kept here rather than in the share control so the promise and the image
  // are written in one place.
  function summaryHint(pid, p) {
    var d = briefCached(pid, p);
    if (!d) return '';
    var b = d.breakdown;
    var verdict = d.verdict ? d.verdict.label : 'record still building';
    var counts = (b.consistent + b.mixed + b.contradicts)
      ? ' · ' + b.consistent + ' backed up, ' + b.contradicts + ' contradicted'
      : '';
    return 'Record card — ' + verdict + counts + ', with coverage and receipts.';
  }

  window.PDXProfileCard = {
    read: read,
    brief: briefCached,
    available: available,
    summaryHint: summaryHint,
    share: share,
    warm: warm,
    renderImage: function (pid, p) {
      var d = read(pid, p);
      return d ? renderCanvas(d).then(canvasToBlob) : Promise.reject(new Error('no card'));
    },
    // Exposed for scripts/test-profile-card.mjs. The card's promises — never a
    // pledge percentage, always an honest thin state, counts that match the
    // caption — are worth what the test that measures real output is worth.
    _caption: caption,
    _shortPost: shortPost,
    _signalLine: signalLine,
    _wrapText: wrapText,
    _gapsOf: gapsOf,
    _initials: initials,
    _verdictText: verdictText,
    // The portrait path, exposed for the same reason: "the canvas is never
    // tainted" is a promise about an address and a probe, and the test has to be
    // able to check both without a browser.
    _avatarSrc: avatarSrc,
    _loadAvatar: loadAvatar,
    _bust: bust
  };
})();
