/* ═══════════════════════════════════════════════════════════════════════════
   PolitiDex — In-context education layer  ·  window.PDXLearn
   ───────────────────────────────────────────────────────────────────────────
   WHAT THIS IS
   A calm, optional teaching layer that explains legislative concepts *where they
   appear*, so a first-time visitor can read a voting-record card or a multi-issue
   contradiction without already knowing how Congress works.

   WHAT THIS IS NOT
   It computes nothing. It scores nothing. It reads no politician data and owns no
   verdicts. Every surface keeps its own rendering; this module only supplies
   markup for teaching affordances and one shared popover/sheet to show them in.
   Removing this file degrades the product to exactly what it was before.

   FIVE PRIMITIVES (one visual language — see pdx-learn.css)
     term(key, text)      inline dotted-underline term → definition popover
     expander(keys)       a <details> "What is this?" block (works with JS off)
     note(id, {...})      a dismissible teaching note, remembered per visitor
     howto(sheetId)       a quiet "How to read this" pill → step-by-step sheet
     openGlossary()       the full, filterable glossary

   ACCESSIBILITY
   Terms are real <button>s (keyboard + touch for free) with aria-expanded and
   aria-describedby. The popover is role="dialog" (non-modal): Esc closes it,
   focus moves in on click/keyboard but NOT on hover, and focus returns to the
   trigger on close. Under 560px every popover becomes a bottom sheet so nothing
   lands off-screen or under a thumb. Sheets trap focus and restore it on close.

   VOICE
   Short, factual, nonpartisan, mechanism-only. A definition explains the
   *process*, never whether a policy or a politician is good. Where a concept
   affects how PolitiDex scores something, the entry says so plainly under
   "How PolitiDex uses it" — that is the honesty requirement, not an aside.
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  if (window.PDXLearn) return; // idempotent

  /* ── escape helpers ─────────────────────────────────────────────────────── */
  function esc(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function escAttr(v) { return esc(v).replace(/`/g, '&#96;'); }

  /* ═══════════════════════════════════════════════════════════════════════
     THE GLOSSARY
     ───────────────────────────────────────────────────────────────────────
     One entry per concept. Fields:
       term    display name (also the popover heading)
       kind    short category chip ("Bill type", "Procedure", …)
       cat     glossary grouping
       aka     alternate spellings — used by the auto-scanner and the filter
       short   the answer, in one sentence. Always present.
       long    optional second layer, 1–2 sentences (progressive disclosure)
       why     optional "How PolitiDex uses it" — the bridge from civics to the
               product. Only where our treatment of the concept is a real,
               checkable choice a voter deserves to know about.
       see     related keys, rendered as cross-links in the popover
       src     an authoritative outside source, when one exists
     ═══════════════════════════════════════════════════════════════════════ */

  var CONGRESS_GLOSSARY = { label: 'Congress.gov glossary', url: 'https://www.congress.gov/help/legislative-glossary' };

  var GLOSSARY = {
    /* ── Bill types ─────────────────────────────────────────────────────── */
    hr: {
      term: 'H.R.', kind: 'Bill type', cat: 'What the numbers mean', aka: ['H. R.', 'HR'],
      short: '“House of Representatives” — a bill introduced in the House. The number after it is just the order it was introduced in that two-year Congress.',
      long: 'H.R. 1 is the first House bill of a Congress, H.R. 4758 the 4,758th. A bill has to pass both the House and the Senate in identical form before it can be signed into law, so an H.R. number alone tells you nothing about whether it passed.',
      see: ['s', 'house', 'congress'], src: CONGRESS_GLOSSARY
    },
    s: {
      term: 'S.', kind: 'Bill type', cat: 'What the numbers mean', aka: ['S '],
      short: '“Senate” — a bill introduced in the Senate. As with H.R., the number is just its introduction order in that Congress.',
      long: 'A Senate bill and a House bill can cover the same policy and carry completely unrelated numbers. Only the version that passes both chambers becomes law.',
      see: ['hr', 'senate', 'congress'], src: CONGRESS_GLOSSARY
    },
    resolution: {
      term: 'Resolution', kind: 'Bill type', cat: 'What the numbers mean',
      aka: ['H.Res.', 'S.Res.', 'H. Res.', 'S. Res.', 'H.Con.Res.', 'S.Con.Res.'],
      short: 'A measure a chamber uses for its own business — internal rules, procedure, or a formal statement of opinion. A simple resolution does not become law.',
      long: 'H.Res. and S.Res. affect only the chamber that passes them. A joint resolution (H.J.Res. / S.J.Res.) is different: it does go to the President and carries the force of law, which is why constitutional amendments and some funding measures use that form.',
      why: 'Many House resolutions are “providing for consideration of…” — floor-procedure votes whipped along party lines. PolitiDex deliberately leaves those unmapped to issues, because scoring one would read party discipline as personal conviction.',
      see: ['procedural', 'house'], src: CONGRESS_GLOSSARY
    },
    amendment: {
      term: 'Amendment', kind: 'Bill type', cat: 'What the numbers mean',
      aka: ['H.Amdt.', 'S.Amdt.', 'Amdt.'],
      short: 'A proposed change to a bill that is already on the floor — added text, deleted text, or a wholesale replacement.',
      long: 'Amendments get their own roll-call votes, so a member can vote for an amendment and against the final bill, or the reverse. Both are real votes on the record.',
      why: 'PolitiDex nests amendment votes under their parent bill so you can see the sequence, rather than showing them as unrelated records.',
      see: ['rollcall', 'hr'], src: CONGRESS_GLOSSARY
    },
    congress: {
      term: 'Congress (119th, 120th…)', kind: 'Term of office', cat: 'What the numbers mean',
      aka: ['119th Congress', '119th'],
      short: 'A numbered two-year term of the legislature. The 119th Congress runs 2025–2027, split into two one-year sessions.',
      long: 'Bill numbers reset with each new Congress, so “H.R. 1” exists in every one of them and means a different bill each time. Any bill not passed by the end of a Congress dies and has to be reintroduced.',
      see: ['hr', 's'], src: CONGRESS_GLOSSARY
    },

    /* ── The two chambers ───────────────────────────────────────────────── */
    house: {
      term: 'House of Representatives', kind: 'Chamber', cat: 'The two chambers', aka: ['the House'],
      short: '435 members, each representing one district, all elected every two years. Seats are apportioned by state population.',
      long: 'The House sets its own floor rules by majority vote, so a determined majority can move quickly. Revenue bills must start here.',
      see: ['senate', 'rollcall']
    },
    senate: {
      term: 'Senate', kind: 'Chamber', cat: 'The two chambers', aka: ['the Senate'],
      short: '100 members — two per state regardless of population — elected to six-year terms, with about a third of the seats up each cycle.',
      long: 'Most Senate legislation needs 60 votes to end debate before it can get a final up-or-down vote, which is why bills with majority support can still stall there.',
      why: 'Senate roll calls are published by senate.gov rather than the Congress.gov API the House uses, so PolitiDex builds the Senate side from official senate.gov roll-call documents. Senate coverage is therefore thinner today than House coverage — that is a data gap, not a statement about any senator.',
      see: ['house', 'cloture', 'norecord']
    },

    /* ── How votes happen ───────────────────────────────────────────────── */
    rollcall: {
      term: 'Roll-call vote', kind: 'Vote type', cat: 'How votes happen',
      aka: ['roll call', 'roll-call', 'recorded vote'],
      short: 'A vote where each member’s individual yes or no is recorded by name and published.',
      long: 'Roll calls are the only votes that create a permanent, per-member public record. Every voting record in PolitiDex is built from them.',
      why: 'This is the whole foundation: if a decision was not a roll call, there is no per-member record to check anyone against, so it cannot appear here at all.',
      see: ['voicevote', 'yea', 'norecord'], src: CONGRESS_GLOSSARY
    },
    voicevote: {
      term: 'Voice vote', kind: 'Vote type', cat: 'How votes happen',
      aka: ['voice votes', 'unanimous consent'],
      short: 'Members call out “aye” or “no” together and the chair announces which side won. No individual names are recorded.',
      long: 'Voice votes and unanimous consent are how most routine business moves. They are legitimate votes with real legal effect — they just leave no per-member record.',
      why: 'A voice vote cannot appear in anyone’s PolitiDex record, because there is nothing to attribute. So a thin record can mean a member’s chamber handled that issue by voice vote — not that they were absent or silent.',
      see: ['rollcall', 'norecord'], src: CONGRESS_GLOSSARY
    },
    yea: {
      term: 'Yea / Nay / Present', kind: 'Vote position', cat: 'How votes happen',
      aka: ['Yea', 'Nay', 'Voted Yea', 'Voted Nay'],
      short: 'Yea is yes, Nay is no. “Present” records attendance without taking a side, and “Did not vote” means no position was cast at all.',
      long: 'What a Yea actually accomplishes depends on the question being asked. On final passage a Yea advances the bill; on a motion to table or recommit, a Yea blocks it.',
      why: 'PolitiDex reads the roll call’s question before deciding what a Yea did, so a Yea that killed a bill is never counted as support for it.',
      see: ['rollcall', 'procedural', 'recommit']
    },

    /* ── Procedure ──────────────────────────────────────────────────────── */
    procedural: {
      term: 'Procedural vote', kind: 'Procedure', cat: 'Procedure — and why it counts less',
      aka: ['Procedural'],
      short: 'A vote about *how* the chamber handles a bill — whether to debate it, amend it, send it back, or move on — rather than a direct vote on the policy itself.',
      long: 'Procedural votes decide real outcomes: a bill blocked on procedure is just as dead as one voted down. But they are also where party leadership applies the most pressure, so they reflect a member’s own policy views less reliably than a vote on final passage.',
      why: 'PolitiDex counts procedural votes at a quarter of the weight of a substantive vote when checking a stated position against a record. They still count — a pattern of them still shows up — but one procedural vote will not outweigh a member’s actual vote on the bill.',
      see: ['recommit', 'previousquestion', 'cloture', 'rollcall'], src: CONGRESS_GLOSSARY
    },
    recommit: {
      term: 'Motion to recommit', kind: 'Procedure', cat: 'Procedure — and why it counts less',
      aka: ['recommit'],
      short: 'A last-minute motion to send a bill back to committee, usually with instructions to change it. It is the minority party’s final shot before final passage.',
      long: 'The direction is inverted compared with an ordinary vote: a Yea here is a vote *against* the bill as written, and a Nay is a vote to let it proceed.',
      why: 'Because of that inversion, PolitiDex flags these roll calls and flips the reading, so a Yea to recommit is never scored as support for the underlying bill. Getting this wrong would produce exactly backwards verdicts.',
      see: ['procedural', 'yea', 'table'], src: CONGRESS_GLOSSARY
    },
    table: {
      term: 'Motion to table', kind: 'Procedure', cat: 'Procedure — and why it counts less',
      aka: ['to table', 'tabled'],
      short: 'A motion to set something aside permanently. It is the fastest way to kill a measure or an amendment without debating it.',
      long: 'Like a motion to recommit, the direction is inverted: a Yea to table is a vote to stop the thing being tabled.',
      why: 'PolitiDex inverts these too, for the same reason — a Yea that killed a measure is not support for it.',
      see: ['recommit', 'procedural'], src: CONGRESS_GLOSSARY
    },
    previousquestion: {
      term: 'Previous question', kind: 'Procedure', cat: 'Procedure — and why it counts less',
      aka: ['ordering the previous question'],
      short: 'A House motion to cut off debate and amendments and go straight to a vote. It is close to a pure party-discipline vote.',
      long: 'Members almost always vote with their party here regardless of how they feel about the bill, because the motion is about controlling the floor rather than about the policy.',
      why: 'Treated as procedural, so it carries a quarter weight. PolitiDex will not read a party-line procedural vote as a personal policy conviction.',
      see: ['procedural', 'resolution'], src: CONGRESS_GLOSSARY
    },
    cloture: {
      term: 'Cloture', kind: 'Procedure', cat: 'Procedure — and why it counts less',
      short: 'The Senate’s only way to end debate — it takes 60 votes on most legislation. Without cloture, a bill can be talked to death.',
      long: 'This is why a Senate bill with 55 supporters can fail: the 60-vote threshold is about ending debate, not about the bill’s merits.',
      why: 'A cloture vote is procedural in form but often the *only* recorded vote a bill ever gets, so it can be the only evidence of where a senator stood. PolitiDex weights it as procedural and always links the official roll call so you can judge it yourself.',
      see: ['procedural', 'senate'], src: CONGRESS_GLOSSARY
    },

    /* ── Multi-issue bills ──────────────────────────────────────────────── */
    omnibus: {
      term: 'Omnibus bill', kind: 'Bill shape', cat: 'Multi-issue bills',
      aka: ['omnibus', 'multi-issue bill'],
      short: 'One very large bill bundling many unrelated policies together, so a member gets a single yes-or-no on all of it at once.',
      long: 'A member who supports four of the six things inside still has to vote once. Their Yea is simultaneously a vote for the parts they wanted and the parts they did not.',
      why: 'PolitiDex scores each bundled issue on its own, so one roll call can keep a promise on taxes and break one on healthcare at the same time. That is not double-counting — it is one vote, judged once per issue it actually touched. Anywhere a verdict rests on a multi-issue bill we label it 🧩 and list the other issues that vote covered.',
      see: ['reconciliation', 'contradiction', 'rollcall']
    },
    reconciliation: {
      term: 'Reconciliation', kind: 'Bill shape', cat: 'Multi-issue bills',
      short: 'A special budget process that lets a bill pass the Senate with a simple majority instead of 60 votes — but only for provisions that affect spending, revenue or the debt limit.',
      long: 'Because it bypasses the 60-vote threshold, reconciliation is where large multi-policy packages tend to end up. That is why reconciliation bills are so often omnibus in shape.',
      see: ['omnibus', 'cloture', 'senate'], src: CONGRESS_GLOSSARY
    },

    /* ── What PolitiDex measures ────────────────────────────────────────── */
    saydo: {
      term: 'Say vs. Do', kind: 'How we score', cat: 'What PolitiDex measures',
      aka: ['say-vs-do', 'Say-vs-Do'],
      short: 'A comparison of what someone has publicly said they stand for against what the record shows they actually did.',
      long: 'It needs both halves. Without a stated position there is nothing to check a vote against; without a record there is nothing to check the statement against.',
      why: 'PolitiDex keeps two separate reads and never blends them into one “honesty” score: the 🏛️ Official Record (votes and formal actions only) and the 🧾 Say-vs-Do picture (statements, interviews, news and controversies only). A tracked promise counts in neither — it has its own tracker, so a pledge is never quietly recycled as a second piece of evidence. Mixing any of these would hide more than it reveals.',
      see: ['contradiction', 'officialrecord', 'norecord']
    },
    contradiction: {
      term: 'Contradiction', kind: 'How we score', cat: 'What PolitiDex measures',
      aka: ['contradicts'],
      short: 'A specific, sourced mismatch between a position someone stated and an action they took — not an opinion about them.',
      long: 'Every contradiction here points at two things you can open yourself: the statement, and the vote or action. If either link is missing, it is not shown as a contradiction.',
      why: 'A contradiction is always scoped to one issue. On a multi-issue bill the same vote can be consistent on one issue and contradicting on another, and both readings are correct at once.',
      see: ['saydo', 'omnibus', 'supportmeaning']
    },
    officialrecord: {
      term: 'Official Record', kind: 'How we score', cat: 'What PolitiDex measures',
      short: 'The share of a member’s roll-call votes and formal actions on an issue that line up with the position they have stated on it.',
      long: 'Built only from votes and formal legislative or legal actions — never from statements, interviews or news coverage.',
      why: 'Kept deliberately separate from the 🧾 Say-vs-Do score, which is built only from public-record evidence and never from votes. Two questions, two numbers, shown side by side — the contrast is the signal.',
      see: ['saydo', 'rollcall', 'norecord']
    },
    supportmeaning: {
      term: 'Does a Yea advance the issue?', kind: 'How we score', cat: 'What PolitiDex measures',
      short: 'For each bill-to-issue link, a curated call on whether passing the bill would advance that issue or cut against it.',
      long: 'It has to be decided per bill, not per issue: a Yea on one healthcare bill expands coverage and a Yea on another restricts it. The direction is recorded once, with the reason and the source.',
      why: 'When the direction is genuinely contestable, or the bill is too broad to pin to one clear effect, PolitiDex leaves it unmapped rather than guessing. An unmapped vote is honest; a wrongly-directed one would manufacture a false verdict.',
      see: ['contradiction', 'yea', 'norecord', 'twoaxis']
    },
    twoaxis: {
      term: 'Election security vs. ballot access', kind: 'How we score', cat: 'What PolitiDex measures',
      aka: ['two axes', 'two-axis', 'both axes'],
      short: 'Elections are measured on two separate axes: 🔐 how ballots and eligibility are safeguarded, and 📩 how easy it is to register and cast a ballot. A member gets a position on each, not one combined score.',
      long: 'The two axes ask different questions. Election security covers verifying eligibility, maintaining voter rolls, chain of custody for ballots, post-election audits and fraud enforcement. Ballot access covers registration, early voting, mail ballots, drop boxes and the deadlines for returning a ballot. One bill routinely moves both at once — adding a document requirement can tighten verification and narrow access in the same clause — so a Yea can advance one axis and cut against the other, and both readings are true.',
      why: 'Collapsing the two into a single “election” score would force a false choice: someone who wants both stricter verification and easier registration would be unscoreable, and a member who tightened one while loosening the other would read as merely inconsistent. Kept apart, that pattern is visible instead of averaged away — and each axis is read in its own direction, so “supports” means pro-safeguard on one and pro-access on the other.',
      see: ['supportmeaning', 'contradiction', 'officialrecord']
    },
    norecord: {
      term: 'No record yet / thin coverage', kind: 'Data honesty', cat: 'What PolitiDex measures',
      aka: ['No record yet', 'not enough record', 'Limited record'],
      short: 'We show “no record yet” or “—” instead of a number when there genuinely is not enough evidence to score something honestly.',
      long: 'Below two directional items, any percentage could only ever read 0% or 100%, which would look like a finding but carry no information. With two or three we show the number and flag it as thin.',
      why: 'It means our coverage is incomplete — not that the person did nothing. Common causes: the issue was handled by voice vote, the member’s chamber has thinner published data, or we have not documented that area yet. A coverage line on each section shows how much of the record we actually have.',
      see: ['rollcall', 'voicevote', 'senate']
    }
  };

  // Stable category order for the glossary sheet.
  var CAT_ORDER = [
    'What the numbers mean',
    'The two chambers',
    'How votes happen',
    'Procedure — and why it counts less',
    'Multi-issue bills',
    'What PolitiDex measures'
  ];

  function get(key) { return GLOSSARY[key] || null; }
  function keys() { return Object.keys(GLOSSARY); }

  /* ═══════════════════════════════════════════════════════════════════════
     PREFS — dismissal state for teaching notes
     Rides PDXStore (so it syncs with the visitor's other prefs when signed in)
     and degrades to an in-memory object when PDXStore has not loaded.
     ═══════════════════════════════════════════════════════════════════════ */
  var PREFS_KEY = 'pdx_learn_prefs';
  var _memPrefs = null;
  function loadPrefs() {
    try {
      if (window.PDXStore && typeof window.PDXStore.read === 'function') {
        var v = window.PDXStore.read(PREFS_KEY, null);
        if (v && typeof v === 'object') return v;
      }
    } catch (e) {}
    return _memPrefs || {};
  }
  function savePrefs(patch) {
    var next = Object.assign({}, loadPrefs(), patch);
    _memPrefs = next;
    try {
      if (window.PDXStore && typeof window.PDXStore.write === 'function') {
        window.PDXStore.write(PREFS_KEY, next);
      }
    } catch (e) {}
  }
  function noteDismissed(id) { return !!loadPrefs()['note_' + id]; }
  function dismissNote(id) { savePrefs(Object.fromEntries([['note_' + id, 1]])); }

  // Has this visitor ever opened a definition? Set the first time a term is read,
  // and used to retire the orientation note: once someone has actually tapped an
  // underlined word, the note telling them underlined words are tappable has done
  // its job and should get out of the way without waiting to be dismissed. Kept
  // as a generic signal rather than special-casing one note id, so any surface can
  // ask "does this visitor still need the affordance explained?"
  var USED_KEY = 'used_terms';
  function hasUsedTerms() { return !!loadPrefs()[USED_KEY]; }
  function markTermUsed() {
    if (hasUsedTerms()) return;            // never rewrite prefs on every open
    savePrefs(Object.fromEntries([[USED_KEY, 1]]));
  }

  function resetNotes() {
    var p = loadPrefs(), next = {};
    Object.keys(p).forEach(function (k) {
      if (k.indexOf('note_') !== 0 && k !== USED_KEY) next[k] = p[k];
    });
    _memPrefs = next;
    try {
      if (window.PDXStore && typeof window.PDXStore.write === 'function') {
        window.PDXStore.write(PREFS_KEY, next);
      }
    } catch (e) {}
  }

  /* ═══════════════════════════════════════════════════════════════════════
     PRIMITIVE 1 — the inline term
     ═══════════════════════════════════════════════════════════════════════ */
  // term('hr', 'H.R. 1') → a button that opens the H.R. definition.
  // opts.mark  → append a small superscript ⓘ (for prefixes that would otherwise
  //              give no visual hint that they are tappable)
  // opts.plain → render text with no affordance at all when the key is unknown
  //              (so a typo degrades to plain text instead of a dead button)
  function term(key, text, opts) {
    opts = opts || {};
    var e = GLOSSARY[key];
    var label = (text == null || text === '') ? (e ? e.term : '') : text;
    if (!e) return esc(label); // unknown key → plain text, never a broken control
    var mark = opts.mark ? '<span class="pdxl-t-mark" aria-hidden="true">ⓘ</span>' : '';
    return '<button type="button" class="pdxl-t" data-pdx-term="' + escAttr(key) + '"' +
      ' aria-expanded="false"' +
      ' aria-label="' + escAttr(label + ' — what does this mean?') + '"' +
      ' title="' + escAttr(e.term + ' — tap for a plain-language definition') + '">' +
      esc(label) + mark + '</button>';
  }

  // Measure numbers are the single highest-value place to teach, because they
  // appear on every card. Wrap only the TYPE PREFIX so the number itself stays
  // ordinary text: "H.R. 4758" → [H.R.](definition) 4758.
  var NUM_PREFIXES = [
    { re: /^(H\.?\s?J\.?\s?Res\.?)(\s*)(.*)$/i, key: 'resolution' },
    { re: /^(S\.?\s?J\.?\s?Res\.?)(\s*)(.*)$/i, key: 'resolution' },
    { re: /^(H\.?\s?Con\.?\s?Res\.?)(\s*)(.*)$/i, key: 'resolution' },
    { re: /^(S\.?\s?Con\.?\s?Res\.?)(\s*)(.*)$/i, key: 'resolution' },
    { re: /^(H\.?\s?Res\.?)(\s*)(.*)$/i, key: 'resolution' },
    { re: /^(S\.?\s?Res\.?)(\s*)(.*)$/i, key: 'resolution' },
    { re: /^(H\.?\s?Amdt\.?)(\s*)(.*)$/i, key: 'amendment' },
    { re: /^(S\.?\s?Amdt\.?)(\s*)(.*)$/i, key: 'amendment' },
    { re: /^(H\.?\s?R\.?)(\s+)(\d.*)$/i, key: 'hr' },
    { re: /^(S\.?)(\s+)(\d.*)$/i, key: 's' }
  ];
  // numberHtml('H.R. 4758') → '<button …>H.R.</button> 4758'
  // Returns escaped plain text for anything it does not recognise, so it is safe
  // to call on every measure number unconditionally.
  function numberHtml(num) {
    var s = String(num == null ? '' : num).trim();
    if (!s) return '';
    for (var i = 0; i < NUM_PREFIXES.length; i++) {
      var m = s.match(NUM_PREFIXES[i].re);
      if (m) return term(NUM_PREFIXES[i].key, m[1]) + esc(m[2] + m[3]);
    }
    return esc(s);
  }

  /* ═══════════════════════════════════════════════════════════════════════
     PRIMITIVE 2 — the "What is this?" expander
     A real <details>: progressive disclosure, and it still opens with JS broken.
     ═══════════════════════════════════════════════════════════════════════ */
  function expander(termKeys, opts) {
    opts = opts || {};
    var list = (termKeys || []).map(function (k) { return GLOSSARY[k] ? k : null; }).filter(Boolean);
    if (!list.length) return '';
    var rows = list.map(function (k) {
      var e = GLOSSARY[k];
      return '<dt>' + esc(e.term) + '</dt><dd>' + esc(e.short) + '</dd>';
    }).join('');
    var more = opts.hideGlossaryLink ? '' :
      '<div class="pdxl-exp-more"><button type="button" class="pdxl-link" data-pdxl-glossary>' +
        'Open the full glossary →</button></div>';
    return '<details class="pdxl-exp"' + (opts.open ? ' open' : '') + '>' +
      '<summary>' + esc(opts.label || 'What is this?') +
        '<span class="pdxl-exp-caret" aria-hidden="true">▾</span></summary>' +
      '<div class="pdxl-exp-body">' +
        (opts.lead ? '<p style="margin:0 0 .45rem;">' + esc(opts.lead) + '</p>' : '') +
        '<dl>' + rows + '</dl>' + more +
      '</div></details>';
  }

  /* ═══════════════════════════════════════════════════════════════════════
     PRIMITIVE 3 — the dismissible teaching note
     Returns '' once dismissed, so a surface can call it unconditionally.
     opts.retireOnTermUse → also return '' once the visitor has opened any
       definition. For notes that teach the *affordance* rather than a fact:
       proof that it landed is better than waiting for a dismiss tap.
     ═══════════════════════════════════════════════════════════════════════ */
  function note(id, opts) {
    opts = opts || {};
    if (!id || noteDismissed(id)) return '';
    if (opts.retireOnTermUse && hasUsedTerms()) return '';
    var body = opts.html || esc(opts.body || '');
    var title = opts.title ? '<b>' + esc(opts.title) + '</b> ' : '';
    return '<div class="pdxl-note" data-pdxl-note="' + escAttr(id) + '">' +
      '<span class="pdxl-note-ico" aria-hidden="true">' + esc(opts.icon || '💡') + '</span>' +
      '<div class="pdxl-note-body">' + title + body + '</div>' +
      '<button type="button" class="pdxl-note-x" data-pdxl-note-x' +
        ' aria-label="Dismiss this note — it won’t come back">×</button>' +
      '</div>';
  }

  /* ═══════════════════════════════════════════════════════════════════════
     PRIMITIVE 4 — "How to read this" sheets
     Per-surface, step-by-step. Each step is one thing on screen, named in the
     same words the surface itself uses.
     ═══════════════════════════════════════════════════════════════════════ */
  var SHEETS = {
    'voting-record': {
      eyebrow: '🏛️ Voting record',
      title: 'How to read a voting-record card',
      lead: 'Every card is one recorded vote or formal action, straight from the official source. Here is what each part is telling you.',
      steps: [
        { b: 'The number and date', t: 'Which measure this was — H.R. for a House bill, S. for a Senate one — and when the vote happened.', keys: ['hr', 's', 'congress'] },
        { b: 'How they voted', t: 'Yea is yes, Nay is no. What that Yea actually accomplished depends on the question being asked, so we read the question first.', keys: ['yea', 'rollcall'] },
        { b: 'The tags', t: 'Chamber, the roll-call question, whether it passed, and whether it was an amendment or a procedural vote.', keys: ['procedural', 'amendment', 'house', 'senate'] },
        { b: 'The verdict badge', t: 'Shown only when the member has also stated a position on the issue — it compares the two. On a multi-issue bill it refers to that bill’s main issue; the split below covers the rest.', keys: ['saydo', 'contradiction'] },
        { b: '🧩 Multi-issue bills', t: 'One vote, several issues, each scored on its own. The same Yea can keep one promise and break another.', keys: ['omnibus', 'reconciliation'] },
        { b: 'The source link', t: 'Every card links to the official roll call or filing. Nothing here asks you to take our word for it.', keys: [] }
      ],
      foot: 'No card is ever inferred. If a vote is not in the official record, it is not here.'
    },
    'say-vs-do': {
      eyebrow: '⚖️ Promise tracker',
      title: 'How to read “Say vs. Do”',
      lead: 'Two separate reads on whether someone’s word holds up. We keep them apart on purpose and never blend them into a single honesty score.',
      steps: [
        { b: 'What they said', t: 'A position stated publicly — on their site, in an interview, in a campaign promise. Without this half there is nothing to check a vote against.', keys: ['saydo'] },
        { b: '🏛️ The Official Record', t: 'The share of their roll-call votes and formal actions on an issue that match that stated position. Votes only — never statements or news.', keys: ['officialrecord', 'rollcall'] },
        { b: '🧾 The Say-vs-Do picture', t: 'The share of checkable public-record items — statements, interviews, news, controversies — that back up what they say. Public evidence only, never votes.', keys: ['saydo'] },
        { b: 'Why two numbers', t: 'They answer different questions. Shown side by side, the contrast between them is the signal.', keys: ['officialrecord'] },
        { b: 'Which way a Yea counts', t: 'For each bill we record, once and with a source, whether passing it would advance that issue or cut against it. When that call is genuinely contestable, we leave the bill unmapped instead of guessing.', keys: ['supportmeaning'] },
        { b: 'When it says “no record yet”', t: 'That is our coverage being incomplete, not a finding about the person. We would rather show a dash than a number we cannot stand behind.', keys: ['norecord', 'voicevote'] }
      ],
      foot: 'No blended score. No vote counted twice. Every item links to its source.'
    },
    omnibus: {
      eyebrow: '🧩 Multi-issue bills',
      title: 'How one vote becomes several verdicts',
      lead: 'The single hardest thing to see in a voting record is that one Yea can support one promise and undermine another. Here is the mechanism.',
      steps: [
        { b: 'Congress bundles', t: 'An omnibus or reconciliation bill packs many unrelated policies into one measure — tax rates, health funding, border money, energy credits.', keys: ['omnibus', 'reconciliation'] },
        { b: 'The member gets one button', t: 'There is no way to vote yes on the parts you want and no on the parts you don’t. It is a single yes-or-no on all of it.', keys: ['yea'] },
        { b: 'We score each issue separately', t: 'For every issue the bill touched, we record whether passing it advanced or cut against that issue, then check it against what the member said about that issue.', keys: ['supportmeaning'] },
        { b: 'So one vote → several verdicts', t: 'Consistent on taxes, contradicting on healthcare — from the same roll call. Both are true at the same time.', keys: ['contradiction'] },
        { b: 'It is not double-counting', t: 'The vote is judged once per issue it actually touched. We label these 🧩 everywhere they appear and list the other issues the vote covered.', keys: ['omnibus'] }
      ],
      foot: 'Same engine everywhere in the product — the H.R.1 showcase just makes it visible.'
    }
  };
  function sheetIds() { return Object.keys(SHEETS); }

  // The quiet trigger pill any surface header can drop in.
  function howto(sheetId, label) {
    if (!SHEETS[sheetId]) return '';
    return '<button type="button" class="pdxl-howto" data-pdxl-sheet="' + escAttr(sheetId) + '">' +
      '<span aria-hidden="true">ⓘ</span> ' + esc(label || 'How to read this') + '</button>';
  }

  /* ═══════════════════════════════════════════════════════════════════════
     RENDERING — one shared popover, one shared sheet
     ═══════════════════════════════════════════════════════════════════════ */
  var _pop = null, _popKey = null, _popTrigger = null, _hoverTimer = null;
  var _sheet = null, _scrim = null, _sheetReturn = null;

  function ensurePop() {
    if (_pop) return _pop;
    _pop = document.createElement('div');
    _pop.className = 'pdxl-pop';
    _pop.id = 'pdxl-pop';
    _pop.setAttribute('role', 'dialog');
    _pop.setAttribute('aria-label', 'Definition');
    _pop.hidden = true;
    document.body.appendChild(_pop);
    return _pop;
  }

  function popHtml(key) {
    var e = GLOSSARY[key];
    if (!e) return '';
    var see = (e.see || []).filter(function (k) { return GLOSSARY[k] && k !== key; });
    var seeHtml = see.length
      ? '<span class="pdxl-pop-see">See also: ' + see.map(function (k) {
          return '<button type="button" class="pdxl-link" data-pdx-term="' + escAttr(k) + '">' +
            esc(GLOSSARY[k].term) + '</button>';
        }).join(', ') + '</span>'
      : '';
    var src = e.src
      ? '<a href="' + escAttr(e.src.url) + '" target="_blank" rel="noopener">' + esc(e.src.label) + ' ↗</a>'
      : '';
    return '<button type="button" class="pdxl-pop-x" data-pdxl-pop-x aria-label="Close definition">×</button>' +
      '<h2 class="pdxl-pop-h">' + esc(e.term) +
        (e.kind ? '<span class="pdxl-pop-kind">' + esc(e.kind) + '</span>' : '') + '</h2>' +
      '<p class="pdxl-pop-short">' + esc(e.short) + '</p>' +
      (e.long ? '<p class="pdxl-pop-long">' + esc(e.long) + '</p>' : '') +
      (e.why ? '<div class="pdxl-pop-why"><b>How PolitiDex uses it.</b> ' + esc(e.why) + '</div>' : '') +
      '<div class="pdxl-pop-foot">' + src + seeHtml +
        '<button type="button" class="pdxl-link" data-pdxl-glossary>Full glossary →</button>' +
      '</div>';
  }

  // Anchor the popover near its trigger on wide screens. Under 560px the
  // stylesheet pins it to the bottom edge, so positioning is skipped entirely.
  function positionPop(trigger) {
    if (!_pop || !trigger || typeof trigger.getBoundingClientRect !== 'function') return;
    var vw = window.innerWidth || 1024, vh = window.innerHeight || 768;
    if (vw <= 560) { _pop.style.left = ''; _pop.style.top = ''; return; }
    var r = trigger.getBoundingClientRect();
    var pw = _pop.offsetWidth || 320, ph = _pop.offsetHeight || 200;
    var left = Math.round(r.left + r.width / 2 - pw / 2);
    left = Math.max(10, Math.min(left, vw - pw - 10));
    // Prefer below; flip above when there isn't room and there is room up top.
    var below = r.bottom + 8, above = r.top - ph - 8;
    var top = (below + ph <= vh - 10 || above < 10) ? below : above;
    top = Math.max(10, Math.min(top, vh - ph - 10));
    _pop.style.left = left + 'px';
    _pop.style.top = top + 'px';
  }

  // focusIn=false for hover-open: showing a definition must never steal focus
  // from what the visitor was doing.
  function openTerm(key, trigger, focusIn) {
    if (!GLOSSARY[key] || !document.body) return;
    markTermUsed(); // the orientation note can stand down — see note(retireOnTermUse)
    var p = ensurePop();
    if (_popTrigger && _popTrigger !== trigger) _popTrigger.setAttribute('aria-expanded', 'false');
    p.innerHTML = popHtml(key);
    p.hidden = false;
    _popKey = key;
    _popTrigger = trigger || null;
    if (trigger) {
      trigger.setAttribute('aria-expanded', 'true');
      trigger.setAttribute('aria-describedby', 'pdxl-pop');
    }
    positionPop(trigger);
    // Next frame, so the opening transition actually runs.
    if (window.requestAnimationFrame) window.requestAnimationFrame(function () { p.classList.add('is-open'); });
    else p.classList.add('is-open');
    if (focusIn) { try { p.setAttribute('tabindex', '-1'); p.focus({ preventScroll: true }); } catch (e) {} }
  }

  function closeTerm(restoreFocus) {
    if (_hoverTimer) { clearTimeout(_hoverTimer); _hoverTimer = null; }
    if (!_pop) return;
    _pop.classList.remove('is-open');
    _pop.hidden = true;
    var t = _popTrigger;
    _popKey = null; _popTrigger = null;
    if (t) {
      t.setAttribute('aria-expanded', 'false');
      t.removeAttribute('aria-describedby');
      if (restoreFocus) { try { t.focus({ preventScroll: true }); } catch (e) {} }
    }
  }

  function ensureSheet() {
    if (_sheet) return _sheet;
    _scrim = document.createElement('div');
    _scrim.className = 'pdxl-scrim';
    _scrim.hidden = true;
    _scrim.setAttribute('data-pdxl-scrim', '1');
    _sheet = document.createElement('div');
    _sheet.className = 'pdxl-sheet';
    _sheet.setAttribute('role', 'dialog');
    _sheet.setAttribute('aria-modal', 'true');
    _sheet.setAttribute('aria-label', 'How to read this');
    _sheet.hidden = true;
    document.body.appendChild(_scrim);
    document.body.appendChild(_sheet);
    return _sheet;
  }

  function sheetHtml(id) {
    var s = SHEETS[id];
    if (!s) return '';
    var steps = (s.steps || []).map(function (st) {
      var terms = (st.keys || []).filter(function (k) { return GLOSSARY[k]; });
      var chips = terms.length
        ? ' <span class="pdxl-step-sub">' + terms.map(function (k) {
            return term(k, GLOSSARY[k].term);
          }).join(' · ') + '</span>'
        : '';
      return '<li class="pdxl-step"><b>' + esc(st.b) + '</b> ' +
        '<span class="pdxl-step-sub">' + esc(st.t) + '</span>' + chips + '</li>';
    }).join('');
    return '<button type="button" class="pdxl-sheet-x" data-pdxl-sheet-x aria-label="Close">×</button>' +
      '<div class="pdxl-sheet-eyebrow">' + esc(s.eyebrow || '') + '</div>' +
      '<h2 class="pdxl-sheet-title">' + esc(s.title) + '</h2>' +
      (s.lead ? '<p class="pdxl-sheet-lead">' + esc(s.lead) + '</p>' : '') +
      '<ol class="pdxl-steps">' + steps + '</ol>' +
      '<div class="pdxl-sheet-foot">' + (s.foot ? esc(s.foot) : '') +
        '<button type="button" class="pdxl-link" data-pdxl-glossary style="color:#7fb4ff;cursor:pointer;">' +
        'Full glossary →</button></div>';
  }

  function glossaryHtml(filter) {
    var q = String(filter || '').trim().toLowerCase();
    var byCat = {};
    keys().forEach(function (k) {
      var e = GLOSSARY[k];
      if (q) {
        var hay = (e.term + ' ' + (e.aka || []).join(' ') + ' ' + e.short + ' ' + (e.long || '')).toLowerCase();
        if (hay.indexOf(q) === -1) return;
      }
      var c = e.cat || 'Other';
      (byCat[c] = byCat[c] || []).push(k);
    });
    var cats = CAT_ORDER.filter(function (c) { return byCat[c]; })
      .concat(Object.keys(byCat).filter(function (c) { return CAT_ORDER.indexOf(c) === -1; }));
    if (!cats.length) {
      return '<div class="pdxl-gl-empty">No terms match “' + esc(filter) + '”.</div>';
    }
    return cats.map(function (c) {
      return '<div class="pdxl-gl-cat">' + esc(c) + '</div>' +
        byCat[c].map(function (k) {
          var e = GLOSSARY[k];
          var aka = (e.aka && e.aka.length)
            ? ' <span class="pdxl-gl-aka">(' + esc(e.aka.slice(0, 3).join(', ')) + ')</span>' : '';
          return '<div class="pdxl-gl-item">' +
            '<div class="pdxl-gl-term">' + term(k, e.term) + aka + '</div>' +
            '<div class="pdxl-gl-def">' + esc(e.short) + '</div></div>';
        }).join('');
    }).join('');
  }

  function openSheet(id) {
    if (!SHEETS[id] || !document.body) return;
    ensureSheet();
    _sheetReturn = document.activeElement;
    closeTerm(false);
    _sheet.innerHTML = sheetHtml(id);
    _sheet.setAttribute('aria-label', SHEETS[id].title);
    _sheet.hidden = false; _scrim.hidden = false;
    _sheet.scrollTop = 0;
    if (window.requestAnimationFrame) {
      window.requestAnimationFrame(function () {
        if (!_sheet) return;
        _sheet.classList.add('is-open'); _scrim.classList.add('is-open');
      });
    } else { _sheet.classList.add('is-open'); _scrim.classList.add('is-open'); }
    try { _sheet.setAttribute('tabindex', '-1'); _sheet.focus({ preventScroll: true }); } catch (e) {}
  }

  function openGlossary(filter) {
    if (!document.body) return;
    ensureSheet();
    if (!_sheet.classList.contains('is-open')) _sheetReturn = document.activeElement;
    closeTerm(false);
    _sheet.setAttribute('aria-label', 'Glossary');
    _sheet.innerHTML =
      '<button type="button" class="pdxl-sheet-x" data-pdxl-sheet-x aria-label="Close">×</button>' +
      '<div class="pdxl-sheet-eyebrow">📖 Plain-language glossary</div>' +
      '<h2 class="pdxl-sheet-title">How Congress words work</h2>' +
      '<p class="pdxl-sheet-lead">Short, factual definitions of the terms this product uses. ' +
        'Where a term changes how we score something, the entry says so.</p>' +
      '<input type="search" class="pdxl-gl-filter" data-pdxl-gl-filter placeholder="Filter terms…" ' +
        'aria-label="Filter glossary terms" value="' + escAttr(filter || '') + '">' +
      '<div data-pdxl-gl-list>' + glossaryHtml(filter) + '</div>' +
      // A dismissed note is remembered for good, which is right — but it left the
      // visitor no way back. Offered here rather than in Settings because this
      // sheet is the one place someone is already looking for help.
      '<div class="pdxl-sheet-foot">Definitions describe the process, never a party or a policy.' +
        '<button type="button" class="pdxl-link" data-pdxl-reset-notes>' +
          'Show the explainer notes again</button></div>';
    _sheet.hidden = false; _scrim.hidden = false;
    _sheet.scrollTop = 0;
    if (window.requestAnimationFrame) {
      window.requestAnimationFrame(function () {
        if (!_sheet) return;
        _sheet.classList.add('is-open'); _scrim.classList.add('is-open');
      });
    } else { _sheet.classList.add('is-open'); _scrim.classList.add('is-open'); }
    try { _sheet.setAttribute('tabindex', '-1'); _sheet.focus({ preventScroll: true }); } catch (e) {}
  }

  function closeSheet() {
    if (!_sheet) return;
    _sheet.classList.remove('is-open');
    _scrim.classList.remove('is-open');
    _sheet.hidden = true; _scrim.hidden = true;
    var back = _sheetReturn; _sheetReturn = null;
    if (back && typeof back.focus === 'function') { try { back.focus({ preventScroll: true }); } catch (e) {} }
  }
  function sheetOpen() { return !!(_sheet && _sheet.classList.contains('is-open')); }

  /* ═══════════════════════════════════════════════════════════════════════
     DELEGATION — bound once on document, so it survives every surface's
     innerHTML rebuild without any surface having to re-bind anything.
     ═══════════════════════════════════════════════════════════════════════ */
  function closest(el, sel) {
    while (el && el.nodeType === 1) {
      if (el.matches ? el.matches(sel) : false) return el;
      el = el.parentNode;
    }
    return null;
  }

  function bind() {
    if (!document || !document.addEventListener || document.__pdxlBound) return;
    document.__pdxlBound = true;

    document.addEventListener('click', function (e) {
      var t = e.target;
      if (!t || t.nodeType !== 1) return;

      var x = closest(t, '[data-pdxl-pop-x]');
      if (x) { e.preventDefault(); e.stopPropagation(); closeTerm(true); return; }

      var sx = closest(t, '[data-pdxl-sheet-x]') || closest(t, '[data-pdxl-scrim]');
      if (sx) { e.preventDefault(); e.stopPropagation(); closeSheet(); return; }

      var gl = closest(t, '[data-pdxl-glossary]');
      if (gl) { e.preventDefault(); e.stopPropagation(); openGlossary(''); return; }

      // Undo every dismissal (including the "has used terms" signal, so the
      // orientation note comes back too). Confirmed by swapping the label rather
      // than by an alert — nothing destructive happens and nothing needs blocking.
      var rn = closest(t, '[data-pdxl-reset-notes]');
      if (rn) {
        e.preventDefault(); e.stopPropagation();
        resetNotes();
        rn.textContent = 'Explainer notes restored ✓';
        rn.disabled = true;
        return;
      }

      var sh = closest(t, '[data-pdxl-sheet]');
      if (sh) { e.preventDefault(); e.stopPropagation(); openSheet(sh.getAttribute('data-pdxl-sheet')); return; }

      var nx = closest(t, '[data-pdxl-note-x]');
      if (nx) {
        e.preventDefault(); e.stopPropagation();
        var wrap = closest(nx, '[data-pdxl-note]');
        if (wrap) {
          dismissNote(wrap.getAttribute('data-pdxl-note'));
          // Remove in place so the surrounding scroll position is preserved.
          if (wrap.parentNode) wrap.parentNode.removeChild(wrap);
        }
        return;
      }

      var tm = closest(t, '[data-pdx-term]');
      if (tm) {
        // stopPropagation matters: terms live inside clickable cards, and tapping
        // a definition must not also open the profile behind it.
        e.preventDefault(); e.stopPropagation();
        var key = tm.getAttribute('data-pdx-term');
        var inPop = !!closest(tm, '.pdxl-pop');
        if (_popKey === key && !inPop) { closeTerm(true); return; }
        openTerm(key, inPop ? _popTrigger : tm, true);
        return;
      }

      // A click anywhere else dismisses an open definition (but not the sheet,
      // which has its own scrim).
      if (_popKey && !closest(t, '.pdxl-pop')) closeTerm(false);
    }, false);

    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape' && e.keyCode !== 27) return;
      if (sheetOpen()) { closeSheet(); return; }
      if (_popKey) closeTerm(true);
    }, false);

    // Hover-open on fine pointers only. Never steals focus, and a short delay
    // stops definitions flickering open while the pointer crosses the text.
    document.addEventListener('pointerover', function (e) {
      if (e.pointerType && e.pointerType !== 'mouse') return;
      var tm = closest(e.target, '[data-pdx-term]');
      if (!tm || closest(e.target, '.pdxl-pop')) return;
      var key = tm.getAttribute('data-pdx-term');
      if (_popKey === key) return;
      if (_hoverTimer) clearTimeout(_hoverTimer);
      _hoverTimer = setTimeout(function () { openTerm(key, tm, false); }, 260);
    }, false);
    document.addEventListener('pointerout', function (e) {
      var tm = closest(e.target, '[data-pdx-term]');
      if (!tm) return;
      if (_hoverTimer) { clearTimeout(_hoverTimer); _hoverTimer = null; }
    }, false);

    // Live filter inside the glossary sheet.
    document.addEventListener('input', function (e) {
      var f = closest(e.target, '[data-pdxl-gl-filter]');
      if (!f || !_sheet) return;
      var list = _sheet.querySelector('[data-pdxl-gl-list]');
      if (list) list.innerHTML = glossaryHtml(f.value);
    }, false);

    // A repositioned or resized viewport must not leave a popover stranded.
    // Guarded: some embedding contexts (tests, sandboxed frames) hand us a window
    // without these, and a missing scroll listener is not worth throwing over.
    if (typeof window.addEventListener === 'function') {
      var reflow = function () { if (_popKey) closeTerm(false); };
      window.addEventListener('resize', reflow, false);
      window.addEventListener('scroll', reflow, true);
    }
  }

  /* ═══════════════════════════════════════════════════════════════════════
     SELF-TEST — pure, no DOM. Called by scripts/test-pdx-learn.mjs.
     Guards the two things that would quietly rot: glossary integrity (dangling
     see-also / sheet keys) and the measure-number parser.
     ═══════════════════════════════════════════════════════════════════════ */
  function selfTest() {
    var failures = [];
    var ok = function (cond, msg) { if (!cond) failures.push(msg); };

    keys().forEach(function (k) {
      var e = GLOSSARY[k];
      ok(!!e.term, k + ': has a term');
      ok(!!e.short, k + ': has a short definition');
      ok(!!e.cat, k + ': has a category');
      ok(!!e.kind, k + ': has a kind chip');
      ok(e.short.length <= 260, k + ': short definition stays short (' + e.short.length + ')');
      ok(CAT_ORDER.indexOf(e.cat) !== -1, k + ': category "' + e.cat + '" is in CAT_ORDER');
      (e.see || []).forEach(function (s) {
        ok(!!GLOSSARY[s], k + ': see-also "' + s + '" exists');
        ok(s !== k, k + ': does not link to itself');
      });
      if (e.src) ok(/^https:\/\//.test(e.src.url), k + ': source URL is https');
    });

    sheetIds().forEach(function (id) {
      var s = SHEETS[id];
      ok(!!s.title, id + ': sheet has a title');
      ok((s.steps || []).length >= 3, id + ': sheet has at least 3 steps');
      (s.steps || []).forEach(function (st, i) {
        ok(!!st.b && !!st.t, id + ' step ' + i + ': has a label and body');
        (st.keys || []).forEach(function (k) {
          ok(!!GLOSSARY[k], id + ' step ' + i + ': term "' + k + '" exists');
        });
      });
    });

    // Every priority concept the product promises to explain must be reachable.
    ['hr', 's', 'resolution', 'amendment', 'house', 'senate', 'rollcall', 'voicevote',
     'omnibus', 'saydo', 'contradiction', 'procedural', 'recommit', 'norecord', 'twoaxis'
    ].forEach(function (k) { ok(!!GLOSSARY[k], 'priority concept "' + k + '" is covered'); });

    // The measure-number parser: prefix linked, number left as plain text.
    [['H.R. 1', 'hr'], ['H.R. 4758', 'hr'], ['HR 22', 'hr'], ['S. 99', 's'],
     ['H.Res. 1075', 'resolution'], ['S.Res. 4', 'resolution'], ['H.J.Res. 2', 'resolution'],
     ['H.Amdt. 12', 'amendment']
    ].forEach(function (pair) {
      var html = numberHtml(pair[0]);
      ok(html.indexOf('data-pdx-term="' + pair[1] + '"') !== -1,
        'numberHtml("' + pair[0] + '") links the ' + pair[1] + ' definition');
    });
    ok(numberHtml('Motion to recommit') === 'Motion to recommit',
      'numberHtml leaves an unrecognised string as plain text');
    ok(numberHtml('') === '', 'numberHtml("") is empty');
    ok(numberHtml(null) === '', 'numberHtml(null) is empty');

    // Escaping: nothing user- or data-supplied reaches innerHTML raw.
    ok(numberHtml('<img src=x>').indexOf('<img') === -1, 'numberHtml escapes markup');
    ok(term('hr', '<script>').indexOf('<script>') === -1, 'term() escapes its label');
    ok(term('nope-not-a-key', 'plain') === 'plain', 'term() with an unknown key degrades to plain text');
    ok(term('nope', '<b>x</b>').indexOf('&lt;b&gt;') === 0, 'term() escapes even when degrading');
    ok(expander(['nope']) === '', 'expander() with no known keys renders nothing');
    ok(expander(['hr']).indexOf('<details') === 0, 'expander() renders a real <details>');
    ok(howto('not-a-sheet') === '', 'howto() with an unknown sheet renders nothing');
    ok(howto('voting-record').indexOf('data-pdxl-sheet="voting-record"') !== -1, 'howto() wires its sheet id');

    return { failed: failures.length, passed: failures.length === 0, failures: failures };
  }

  /* ═══════════════════════════════════════════════════════════════════════
     PUBLIC API
     ═══════════════════════════════════════════════════════════════════════ */
  window.PDXLearn = {
    // content
    GLOSSARY: GLOSSARY, SHEETS: SHEETS, CAT_ORDER: CAT_ORDER,
    get: get, keys: keys, sheetIds: sheetIds,
    // markup primitives (all return safe, escaped HTML strings)
    term: term, numberHtml: numberHtml, expander: expander, note: note, howto: howto,
    // imperative
    openTerm: function (k) { openTerm(k, null, true); }, closeTerm: closeTerm,
    openSheet: openSheet, openGlossary: openGlossary, closeSheet: closeSheet,
    // notes state
    noteDismissed: noteDismissed, dismissNote: dismissNote, resetNotes: resetNotes,
    hasUsedTerms: hasUsedTerms,
    // tests
    selfTest: selfTest
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind);
  else bind();
})();
