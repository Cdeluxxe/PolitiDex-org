/* ═══════════════════════════════════════════════════════════════════════════
   PolitiDex — ✒️ EXECUTIVE ENACTMENT RECORD (Phases 1–2: vocabulary + read path)
   ═══════════════════════════════════════════════════════════════════════════
   The second record lane, for figures who cast no congressional floor votes.
   Presidents and executives are judged on what they actually did with the power
   they have: signed legislation, vetoes, executive orders and formal directives.

   WHY A SEPARATE LANE AND A SEPARATE FILE
   The 🏛️ Official Record answers "when they had to vote, did they stand by what
   they said?" A president never appears in it, and correctly so — the vr_* ingest
   attributes a roll call only through db/vr-member-map.json, which contains no
   executive pid. That absence is a safety mechanism, not an oversight. But it also
   means a sourced, issue-keyed executive record sits in the app unreadable.

   This lane is deliberately its OWN file rather than a scope inside consistency.js.
   Two reasons, both practical:
     1. Nothing here can regress the shipped 🏛️ / 🧾 lanes. This file is purely
        additive and consistency.js is untouched.
     2. The no-vote-language rule is testable by FILE. consistency.js legitimately
        says "Voted Yea" and labels a verdict "Mixed record"; this file must never
        say either. Keeping the vocabularies in separate files lets
        scripts/test-exec-vocab.mjs scope its matcher precisely instead of trying to
        tell one lane's strings from the other's inside a single 2,900-line module.

   THE LOAD-BEARING DECISION: NO SCORE, EVER
   A roll-call percentage is honest because the denominator is externally imposed —
   the votes the floor scheduled. Nobody in this app chose them. A president's set of
   possible orders is unbounded and self-selected, so any EER percentage would divide
   by a number we invented, and would be trivially gameable by whoever curates the
   action list. So this lane reports counts, dates, documents and standing, and never
   a ratio. `score` is returned as a literal null and asserted by test. There is no
   code path that produces a percentage, which is why there is no risk of one leaking.

   TWO AXES, NEVER COLLAPSED
     Axis A  Alignment — stated position vs formal action
     Axis B  Standing  — what happened to the action afterwards
   Axis B has no congressional counterpart and is why this cannot be a re-skin. The
   worked example is already in the app's data: the IEEPA tariff orders were signed,
   and the Supreme Court held they exceeded presidential authority. A single verdict
   word either credits the signer with delivering or accuses them of failing. Both
   are false; only both axes together are true.

   FAIL CLOSED
   Every gate here refuses by default. An unknown pid is not eligible. An action with
   no primary source, or one citing a directory index or a fact sheet, is dropped
   before it can be counted. A summary whose buckets do not add up returns null rather
   than publishing arithmetic that does not hold — a missing summary is a rendering
   gap, a wrong one is a false claim.

   WHERE IT SITS
   This file is the read path and nothing else: it computes counts and returns
   vocabulary, and it touches no DOM, which is what lets its whole suite run in a
   DOM-less sandbox. The markup lives next door in exec-record-ui.js, so "the wrong
   number" and "the wrong sentence" stay separately gated. index.html loads
   exec-action-data.js → this file → exec-record-ui.js, in that order. Every read
   below is still guarded: if the data file is absent (offline, or a page that does
   not ship it) the record comes back honestly empty and the section renders nothing.

   Reads (all optional, all guarded):
     window.EXEC_ACTIONS[pid]   → the seeded formal actions (exec-action-data.js)
     window._polPositionMap(pid, CMP_DATA[pid]) → the ONE shared stance source,
                                  the same feeder consistency.js:154 uses
   Exposes:
     window.PDXExecRecord
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  if (window.PDXExecRecord) return; // idempotent

  // ── Who this lane is for ───────────────────────────────────────────────────
  // Fail closed: an office-based allow-list, not "anyone missing from the member
  // map". Members of Congress also have curated formal actions, and those belong to
  // the 🏛️ lane via vr_positions — gating on absence from the map would sweep them
  // in here and split one person's record across two lanes.
  //
  // INVARIANT (asserted in scripts/test-exec-vocab.mjs against db/vr-member-map.json):
  // no pid in this table may appear in the member map. If one ever did, the vr_*
  // ingest could attribute a roll call to them and manufacture exactly the fake
  // "Voted Yea/Nay" framing this lane exists to prevent.
  var EXEC_PIDS = {
    trump: { office: 'President of the United States', currentTerm: '47', serving: true }
  };

  // ── Serving now, or formerly ───────────────────────────────────────────────
  // `serving` is DECLARED rather than inferred, and it is declared because the
  // integrity read's two-scope model turns on it. The main Word vs Action number is
  // the ALL-TIME formal record; the current-term number is a secondary slice, and a
  // slice is only meaningful for someone still cutting it. For a former officeholder
  // "this term" is not a live scope — it is the last term, which is a fact about
  // history that the all-time read already contains, and printing it beside the main
  // number would present the same record twice under two labels.
  //
  // The alternative was to infer incumbency from the data — "there are actions dated
  // in the current term, so they must be serving." That inference breaks in both
  // directions. A president three days into a term has no actions on file and would
  // read as former; a president who left office last month still has last term's
  // actions and would read as serving until the roster was edited anyway. So the
  // roster carries the fact, and the fact is what the surfaces read.
  //
  // Absent means false: a roster entry that forgets to say it is serving gets the
  // secondary score hidden, which is the fail-closed direction — a missing slice is a
  // smaller claim than a wrong one.
  function serving(pid) {
    var e = EXEC_PIDS[norm(pid)];
    return !!(e && e.serving === true && e.currentTerm);
  }

  // ── Coverage gate ──────────────────────────────────────────────────────────
  // THE PROBLEM THIS SOLVES. The office allow-list above holds one pid, and the
  // seeded action file holds actions for one figure. Rendered without qualification,
  // the lane reads as finished: a reader who sees a rich ✒️ section on one profile
  // and none on the next infers the second figure has taken no formal action, when
  // the truth is that nothing has been recorded for them yet. That inference is the
  // failure — it turns our coverage into a claim about a person.
  //
  // WHY A GATE AND NOT BALANCE. The alternative is to seed the other figures so the
  // lane looks even. That would mean publishing thin, hurried records for figures we
  // have not sourced properly, which trades an honest gap for a dishonest ledger.
  // Withholding the lane entirely is no better: it would bury primary-sourced court
  // rulings that a reader is entitled to see. So the lane ships, and it declares its
  // own coverage in the reader's own terms — a count they can check — rather than
  // implying a completeness it does not have.
  //
  // COMPUTED, NEVER HARD-CODED. Both figures below are derived at read time from the
  // shipped roster and the shipped action file, so the declaration cannot go stale
  // behind the data. Seed a second figure and the numerator moves on its own; add a
  // governor to the roster and the denominator does.
  //
  // The denominator is the app's CHIEF EXECUTIVES — the offices that issue formal
  // executive actions in the first place. Legislators are excluded because they have
  // the 🏛️ lane; deputies (lieutenant governor, vice president) and candidates are
  // excluded because they issue nothing to record.
  var CHIEF_OFFICE = /\b(president|governor|mayor)\b/i;
  var NOT_CHIEF = /\b(candidate|former|lieutenant|vice|deputy|nominee)\b/i;
  // Below this many figures on file the lane is a pilot, not a lane: with one figure
  // there is no field to be in, and with two, every comparison a reader could make is
  // the same single pair. Three is the smallest number at which the section describes
  // a category rather than a subject.
  var COVERAGE_MIN_FIGURES = 3;
  // And even at that count, a section that appears on a small minority of the figures
  // it applies to still reads as a verdict on the ones it skips. Below this share of
  // the tracked chief executives, absence is the norm and must be said out loud.
  var COVERAGE_BROAD_SHARE = 0.5;

  // Every string a coverage surface may render, in one table, so the vocabulary test
  // gates them the way it gates the verdict and standing labels. No percentage and no
  // vote language here either — the gate is subject to the lane's own rules.
  var EXEC_COVERAGE = {
    pilot: {
      key: 'pilot',
      badge: 'Limited coverage',
      label: 'This lane is still being built',
      short: 'A profile with no section here has nothing recorded yet — that is a gap in our file, ' +
        'not a finding that the figure has taken no action.',
      compare: 'Nothing in this lane is comparable between figures while coverage is this uneven.',
      cls: 'exec-cov-pilot'
    },
    broad: {
      key: 'broad',
      badge: 'Coverage',
      label: 'On file for the chief executives this app tracks',
      short: 'A profile with no section here still means nothing has been recorded yet, ' +
        'not that the figure has taken no action.',
      compare: '',
      cls: 'exec-cov-broad'
    },
    none: {
      key: 'none',
      badge: 'Nothing on file',
      label: 'No formal executive actions are recorded yet',
      short: 'No qualifying action is on file for any figure. Nothing is shown rather than a guess.',
      compare: 'Nothing in this lane is comparable between figures.',
      cls: 'exec-cov-none'
    }
  };

  // How many figures in the shipped roster hold an office this lane would cover.
  // Guarded: with no roster loaded the count is 0 and coverage falls back to the
  // figure count alone, which keeps the gate closed rather than opening it.
  function chiefExecutiveCount() {
    var d;
    try { d = window.CMP_DATA; } catch (e) { return 0; }
    if (!d || typeof d !== 'object') return 0;
    var n = 0;
    for (var pid in d) {
      if (!Object.prototype.hasOwnProperty.call(d, pid)) continue;
      var office = String((d[pid] && d[pid].office) || '');
      if (CHIEF_OFFICE.test(office) && !NOT_CHIEF.test(office)) n++;
    }
    return n;
  }

  // How many figures actually have a publishable action on file. Uses the SAME
  // source gate the section itself uses (actionsFor drops an action citing a
  // directory index), so the numerator counts what a reader can actually see —
  // a figure whose every action fails the source rule is not covered.
  function coveredPids() {
    var out = [];
    var data;
    try { data = window.EXEC_ACTIONS || {}; } catch (e) { return out; }
    for (var pid in EXEC_PIDS) {
      if (!Object.prototype.hasOwnProperty.call(EXEC_PIDS, pid)) continue;
      if (!data[pid]) continue;
      if (actionsForMemo(pid, { allTerms: true }).allTime > 0) out.push(pid);
    }
    return out;
  }

  // The one read every coverage surface goes through. `comparable` is the machine
  // form of the rule: while it is false, no surface may rank, compare or aggregate
  // this lane across figures.
  function coverage() {
    var covered = coveredPids();
    var tracked = chiefExecutiveCount();
    var onFile = covered.length;
    var state;
    if (!onFile) state = 'none';
    else if (onFile < COVERAGE_MIN_FIGURES) state = 'pilot';
    else if (tracked > 0 && onFile / tracked < COVERAGE_BROAD_SHARE) state = 'pilot';
    else if (!tracked) state = 'pilot'; // no roster to check against: stay closed
    else state = 'broad';
    var meta = EXEC_COVERAGE[state];
    return {
      state: state,
      onFile: onFile,
      tracked: tracked,
      pids: covered,
      comparable: state === 'broad',
      badge: meta.badge,
      label: meta.label,
      short: meta.short,
      compare: meta.compare,
      cls: meta.cls,
      // The checkable sentence. Built from the two live counts so it can never say
      // something the data does not. Kept free of any word the EER forbids.
      line: tracked
        ? 'Formal actions are on file for ' + onFile + ' of the ' + tracked +
          ' presidents, governors and mayors this app tracks.'
        : 'Formal actions are on file for ' + onFile + ' ' + plural(onFile, 'figure', 'figures') + '.'
    };
  }

  // The machine-enforced non-comparability rule. Any surface that would rank,
  // compare or aggregate the EER across figures must call this first and do nothing
  // when it returns false. It is a function rather than a constant so it re-reads
  // the live data instead of freezing a verdict at load time.
  function comparable() { return coverage().comparable; }

  // ── Axis A · Alignment ─────────────────────────────────────────────────────
  // Its own table. Deliberately shares NO token with consistency.js's VERDICTS,
  // whose 'consistent' / 'contradicts' are what the roll-call scorer emits and whose
  // labels ("Backs it up", "Mixed record") are vote-shaped. Reusing them would make
  // the two lanes indistinguishable in exactly the place they must not be.
  var EXEC_VERDICTS = {
    acted_on_it:      { key: 'acted_on_it',      ico: '✓', label: 'Acted on it',                    short: 'A formal action on file advances the stated position.',              tone: 'good',  cls: 'exec-acted' },
    acted_against:    { key: 'acted_against',    ico: '⚠', label: 'Acted against it',               short: 'A formal action on file cuts against the stated position.',          tone: 'bad',   cls: 'exec-against' },
    acted_both_ways:  { key: 'acted_both_ways',  ico: '◑', label: 'Acted both ways',                short: 'Formal actions on file run in both directions on this issue.',       tone: 'warn',  cls: 'exec-both' },
    // COVERAGE, not a finding. The copy must never read as "they failed to act" —
    // this lane cannot prove a negative over an unbounded action space, and saying
    // so plainly is the difference between a record and an accusation.
    said_not_done:    { key: 'said_not_done',    ico: '—', label: 'Said it — no action found',      short: 'A position is stated; no qualifying formal action is on file yet.',  tone: 'muted', cls: 'exec-none', isCoverage: true },
    acted_no_stance:  { key: 'acted_no_stance',  ico: '—', label: 'Acted — no stated position',     short: 'A formal action is on file with no directional position to check it against.', tone: 'muted', cls: 'exec-none', isCoverage: true },
    no_record:        { key: 'no_record',        ico: '—', label: 'No executive action on record',  short: 'Nothing on file for this issue yet.',                                tone: 'muted', cls: 'exec-none', isCoverage: true }
  };

  // ── Axis B · Standing ──────────────────────────────────────────────────────
  // `contested: true` marks the standings that make the standing clause
  // non-droppable — see STANDING_STICKY below.
  //
  // `challenged_unverified` is the honest name for the gap between "a court stopped
  // this" and "nothing has disturbed this". Without it the only available filing for a
  // live, unresolved challenge is `in_force`, and `in_force` is a positive claim: it
  // says the action stands unimpeded. A court that has not ruled has not established
  // that, so filing it there would state something the sources do not support. It is
  // contested for the same reason — a reader shown only in-force counts is told the
  // record is settled when part of it is still open.
  //
  // `overridden` is the same kind of gap, one branch over. A veto is a blocking action,
  // so the question its standing answers is whether the measure it blocked ever became
  // law — and until this token existed the answer could only be filed as `in_force`,
  // which for a veto means "the veto held". When Congress musters two-thirds in both
  // chambers under Article I, section 7, the veto did NOT hold and the measure became
  // law anyway. None of the other tokens can say that: `blocked` and `struck_down` name
  // a court, `rescinded` names the President reversing himself, and `superseded` is a
  // later presidential action, not a coordinate branch overriding this one. The actor
  // matters as much as the outcome, which is why this is a token and not a note.
  var EXEC_STANDING = {
    in_force:       { key: 'in_force',       ico: '●', label: 'In force',               contested: false, cls: 'exec-inforce' },
    partly_blocked: { key: 'partly_blocked', ico: '◐', label: 'Partly blocked in court', contested: true,  cls: 'exec-partly' },
    blocked:        { key: 'blocked',        ico: '⊘', label: 'Blocked by court order',  contested: true,  cls: 'exec-blocked' },
    struck_down:    { key: 'struck_down',    ico: '✕', label: 'Struck down',             contested: true,  cls: 'exec-struck' },
    overridden:     {
      key: 'overridden', ico: '⇈', label: 'Overridden by Congress',
      contested: true, cls: 'exec-overridden',
      // Read it exactly this narrowly: the veto did not hold, Congress passed the
      // measure over it under Article I, section 7, and the measure became law. It is
      // NOT a court holding the action unlawful and it is NOT a win or a loss on the
      // subject of the measure — it is what happened to this action, by whose hand.
      short: 'The veto did not hold: Congress passed the measure over it and the measure became law. The actor was Congress, not a court.'
    },
    rescinded:      { key: 'rescinded',      ico: '↩', label: 'Rescinded',               contested: true,  cls: 'exec-rescinded' },
    challenged_unverified: {
      key: 'challenged_unverified', ico: '⚖', label: 'Challenged in court — no ruling on file',
      contested: true, cls: 'exec-challenged', isCoverage: true,
      // Coverage, like said_not_done on Axis A: it reports the state of OUR file, not a
      // finding against the action. Use it only where a primary court document shows the
      // challenge is live AND no primary ruling resolving it has been read. It is never a
      // shorthand for "we did not look".
      short: 'A challenge to this action is on file and live; no primary ruling resolving it has been read.'
    },
    superseded:     { key: 'superseded',     ico: '⇢', label: 'Superseded by later action', contested: false, cls: 'exec-superseded' },
    expired:        { key: 'expired',        ico: '⌛', label: 'Lapsed or expired',       contested: false, cls: 'exec-expired' }
  };

  // ── Action classes ─────────────────────────────────────────────────────────
  // Counts are reported PER CLASS and never summed into one headline figure.
  // Signing a bill Congress wrote and issuing an order alone are different claims
  // about power; a combined "6 actions" number flattens shared authorship into sole
  // authorship, and the summary is the likeliest place that flattening would happen.
  var EXEC_CLASSES = {
    signed_law:      { key: 'signed_law',      verb: 'Signed into law',       authorship: 'shared', label: 'signed into law' },
    vetoed_law:      { key: 'vetoed_law',      verb: 'Vetoed',                authorship: 'shared', label: 'vetoed', blocks: true },
    executive_order: { key: 'executive_order', verb: 'Signed Executive Order', authorship: 'sole',  label: 'executive order' },
    directive:       { key: 'directive',       verb: 'Issued a directive',    authorship: 'sole',   label: 'directive' }
  };

  // Countable nouns for the per-class inventory line. CLASSES carry a verb
  // ("Signed into law") for the card and a singular label for prose; a line that
  // prints "8 laws signed · 4 vetoes" needs a noun that works in both numbers, and
  // "2 signed into laws" is not one. It lives here, beside the classes themselves,
  // because two surfaces now print this line — the ledger's scope line and the
  // compact formal summary at the head of an executive profile — and a second copy
  // of the nouns is how the two start naming one file differently.
  var CLASS_NOUN = {
    signed_law:      ['law signed', 'laws signed'],
    vetoed_law:      ['veto', 'vetoes'],
    executive_order: ['executive order', 'executive orders'],
    directive:       ['directive', 'directives']
  };

  // The inventory, as an array of counted phrases in class order. Zero-count classes
  // are omitted — a president with no vetoes has not "0 vetoes", they have a record
  // that this class is not part of — and the phrases are NEVER summed into one
  // figure here, for the reason CLASSES states above: signing a bill Congress wrote
  // and issuing an order alone are different claims about power.
  function execInventory(sum) {
    var out = [];
    if (!sum || !sum.byClass) return out;
    Object.keys(sum.byClass).forEach(function (k) {
      var n = sum.byClass[k];
      if (!n) return;
      var noun = CLASS_NOUN[k] || [k, k];
      out.push(n + ' ' + noun[n === 1 ? 0 : 1]);
    });
    return out;
  }

  // A BLOCKING CLASS INVERTS ITS MAPPING, and this flag is why. An issue mapping
  // states what the DOCUMENT does to the issue, because that is what the column means
  // in the congressional lane it is shared with: vr_measure_issues.support_meaning has
  // always described the measure. For a signature or an order, the document and the
  // act point the same way and the distinction never surfaced. For a veto they point
  // opposite ways — the resolution advances an issue and blocking it does not — so the
  // direction the mapping carries is the resolution's and the direction this lane
  // reports has to be the other one. consistency.js has drawn exactly this distinction
  // since the vocabulary was written (_EXEC_BLOCKS / advanceInverted, applied before
  // stance-helpers reads the item). This function did not, because for six waves no
  // row used a blocking class and the two readings could not disagree. The first three
  // vetoes on file made them disagree: a veto of a resolution terminating a border
  // emergency was being counted as an action AGAINST border security, next to an order
  // building the wall, and the issue read "acted both ways" off two documents pointing
  // the same way. Read the direction through here, not off the mapping.
  function issueDirection(action, mapping) {
    var d = mapping && mapping.direction;
    if (d !== 'advances' && d !== 'opposes') return null;
    var cls = action && EXEC_CLASSES[action.actionClass];
    if (!cls || !cls.blocks) return d;
    return d === 'advances' ? 'opposes' : 'advances';
  }

  var EXEC_SCOPE = {
    key: 'executive', icon: '✒️', label: 'Executive Enactment Record',
    question: 'When they could act alone, what did they actually do?',
    // Note the absence of any comparison to the congressional lane. Explaining this
    // lane by reference to the other one would put vote language on an EER surface,
    // which is the rule; the denominator argument stands on its own without it.
    blurb: 'Signed legislation, vetoes, executive orders and formal directives — checked against what they say they stand for, and against what happened to each action afterwards. No score: the set of orders a president could sign is unbounded and self-chosen, so there is no honest denominator to divide by.',
    empty: {
      no_record: 'No executive action on record yet',
      no_stance: 'No stated position to check',
      said_not_done: 'A position is stated; no qualifying action is on file yet'
    }
  };

  // ── The framing clause ─────────────────────────────────────────────────────
  // Every rendered label begins with this literal, as its FIRST clause, in the same
  // type size as the numbers — not as a disclaimer underneath them. It is what makes
  // the counts true: the denominator is our file, not the figure's complete output.
  // A reader who takes "5" for "everything they did" has been misled by omission
  // even though every individual number is correct.
  var FRAMING = 'Of the formal actions on file';

  // Standings that keep the standing clause in EVERY rendering, however compact. A
  // summary showing only alignment implies the whole record is operative — the exact
  // failure Axis B exists to prevent, reintroduced one level up.
  var STANDING_STICKY = { partly_blocked: 1, blocked: 1, struck_down: 1, overridden: 1,
                          rescinded: 1, challenged_unverified: 1 };

  // One or two actions cannot carry a pattern. Adopted from consistency.js's
  // _orMappedSummaryText, which already appends a thinness caveat at low N so a count
  // does not read as depth it does not have.
  var THIN_MAX = 2;

  // ── Source rule (fail closed) ──────────────────────────────────────────────
  // An action whose primary source cannot be opened and checked is not publishable.
  // These patterns are not hypothetical — every one of them is in the app's live
  // curated data today: the judicial-appointments item cites a bare congress.gov, and
  // cut_spending / tariffs_growth cite the bare presidential-actions index, while
  // healthcare_costs cites a fact sheet rather than the order.
  var REJECT_SRC = [
    /^https?:\/\/[^/]+\/?$/i,                     // bare host — cites nothing
    /^https?:\/\/[^/]+\/presidential-actions\/?$/i, // a directory index, not a document
    /^https?:\/\/[^/]+\/briefing-room\/?$/i,
    /\/fact-sheets?\b/i,                          // the administration describing its own order
    /\/press-releases?\b/i,
    /\/remarks\//i
  ];
  function sourceOk(url) {
    if (!url) return false;
    var u = String(url).trim();
    if (!/^https:\/\//i.test(u)) return false;    // https only, no protocol-relative
    for (var i = 0; i < REJECT_SRC.length; i++) if (REJECT_SRC[i].test(u)) return false;
    return true;
  }

  function norm(s) { return String(s == null ? '' : s).trim().toLowerCase(); }
  function plural(n, one, many) { return n === 1 ? one : many; }

  // ── Eligibility ────────────────────────────────────────────────────────────
  function eligible(pid) { return !!EXEC_PIDS[norm(pid)]; }
  function officeOf(pid) { var e = EXEC_PIDS[norm(pid)]; return e ? e.office : ''; }
  function currentTerm(pid) { var e = EXEC_PIDS[norm(pid)]; return e ? e.currentTerm : ''; }

  // ── The one shared stance source ───────────────────────────────────────────
  // Identical feeder to consistency.js:154, so this lane and the 🏛️ lane can never
  // disagree about what someone said. Values are 'support' | 'oppose' | 'mixed'.
  function positionStance(pid, issueKey) {
    try {
      if (typeof window._polPositionMap !== 'function' || !window.CMP_DATA) return null;
      var pm = window._polPositionMap(pid, window.CMP_DATA[pid]) || {};
      return pm[issueKey] ? pm[issueKey].stance : null;
    } catch (e) { return null; }
  }
  // 'mixed' is NOT directional: it gives an action nothing to be checked against, so
  // it is treated as no directional stance rather than being forced into a direction.
  function directionalStance(st) {
    var s = norm(st);
    return (s === 'support' || s === 'oppose') ? s : null;
  }

  // ── Actions on file ────────────────────────────────────────────────────────
  // Phase 3 populates window.EXEC_ACTIONS. Until then this returns [] and every read
  // below is honestly empty — the lane shows nothing rather than guessing.
  //
  // Each action rejected here is COUNTED, not silently dropped: `dropped` rides along
  // in the summary and surfaces in the tip, because a filter that hides its own
  // exclusions makes a partial record look complete.
  function actionsFor(pid, opts) {
    opts = opts || {};
    var out = { kept: [], dropped: 0, droppedAllTime: 0, allTime: 0 };
    if (!eligible(pid)) return out;
    var raw;
    try { raw = (window.EXEC_ACTIONS || {})[norm(pid)] || []; } catch (e) { return out; }
    if (!raw || !raw.length) return out;
    var term = opts.allTerms ? null : currentTerm(pid);
    for (var i = 0; i < raw.length; i++) {
      var a = raw[i];
      if (!a || !EXEC_CLASSES[a.actionClass]) continue;
      var ok = sourceOk(a.sourceUrl) && !!(a.sourceLabel && String(a.sourceLabel).trim());
      if (ok) out.allTime++; else out.droppedAllTime++;
      // Term scope is applied AFTER the source gate so the tip's all-time figure is a
      // true all-time figure and not "all time within this term".
      if (term && String(a.term || '') !== String(term)) continue;
      if (!ok) { out.dropped++; continue; }
      out.kept.push(a);
    }
    return out;
  }
  // MEMOIZED — see THE DERIVATION EPOCH in stance-helpers.js.
  //
  // The source gate is six regexes per action, and this pool is re-walked for EVERY
  // issue on a profile by both the summary surfaces and consistency.js's per-issue
  // feeder. On a presidential profile that was the single largest block of work in
  // the whole open — the gate and its regexes together outweighed the rendering.
  // The answer is a pure function of the shipped action list and the term scope, so
  // it is computed once per (pid, scope) per epoch.
  //
  // TWO INVALIDATION SIGNALS, because the epoch alone is not enough here. The epoch
  // covers the app's own data boundaries; the seeded action list is also swapped
  // wholesale by callers that load or replace a seed (and by the seed suite, which
  // is the same motion). So the entry also remembers the exact array it was built
  // from and rebuilds when that array is replaced or changes length. Identity is
  // checked FIRST and costs one property read.
  //
  // The cached object is handed back BY REFERENCE and `kept` is a live array. No
  // caller mutates either — they read `.kept`, `.dropped`, `.allTime` — and the
  // shared `kept` array is exactly what makes the repeat reads free.
  var _afCache = {}, _afEpoch = 0;
  function rawActions(pid) {
    try { return (window.EXEC_ACTIONS || {})[norm(pid)] || null; } catch (e) { return null; }
  }
  function actionsForMemo(pid, opts) {
    var ep = (typeof window.PDXDataEpoch === 'function') ? window.PDXDataEpoch() : 0;
    if (_afEpoch !== ep) { _afCache = {}; _afEpoch = ep; }
    var raw = rawActions(pid);
    var k = norm(pid) + '||' + ((opts && opts.allTerms) ? 'all' : 'term');
    var hit = _afCache[k];
    if (hit && hit.raw === raw && hit.len === (raw ? raw.length : -1)) return hit.val;
    var v = actionsFor(pid, opts);
    _afCache[k] = { raw: raw, len: (raw ? raw.length : -1), val: v };
    return v;
  }

  // Current standing of one action: the LATEST status entry by effectiveAt, matching
  // the vr_exec_action_status read exactly. Every entry must carry its own citation —
  // "struck down" without a ruling is as unpublishable as an unsourced signing.
  function standingOf(action) {
    var list = (action && action.status) || [];
    var best = null;
    for (var i = 0; i < list.length; i++) {
      var s = list[i];
      if (!s || !EXEC_STANDING[s.status]) continue;
      if (!sourceOk(s.sourceUrl) || !(s.sourceLabel && String(s.sourceLabel).trim())) continue;
      if (!best) { best = s; continue; }
      var a = Date.parse(s.effectiveAt || '') || 0, b = Date.parse(best.effectiveAt || '') || 0;
      if (a >= b) best = s;
    }
    // Fail closed: an action with no citable status is NOT assumed to be in force.
    return best ? best.status : null;
  }

  // ── Axis A for one issue ───────────────────────────────────────────────────
  // Reads the same supportMeaning logic the congressional lane uses, renamed for this
  // lane's vocabulary: a mapping that 'advances' an issue supports it, one that
  // 'opposes' it cuts against it. An omnibus therefore reports both directions from a
  // single signature, exactly as one vote on H.R. 1 does in the 🏛️ lane. The one
  // departure is a blocking class, where the mapping describes the document and the
  // act runs the other way — issueDirection() above is where that is resolved, and
  // res.actions carries both readings so a caller can show its work.
  function executiveIssue(pid, issueKey, opts) {
    var res = {
      scope: 'executive', issueKey: issueKey,
      token: 'no_record', verdict: EXEC_VERDICTS.no_record,
      standing: null, actions: [], stance: null,
      counts: { signed_law: 0, vetoed_law: 0, executive_order: 0, directive: 0 },
      score: null // structurally null — there is no code path that sets it otherwise
    };
    if (!eligible(pid) || !issueKey) return res;
    var stance = positionStance(pid, issueKey);
    res.stance = stance;
    var dir = directionalStance(stance);

    var pool = actionsForMemo(pid, opts).kept, adv = 0, opp = 0;
    for (var i = 0; i < pool.length; i++) {
      var a = pool[i], maps = a.issues || [];
      for (var j = 0; j < maps.length; j++) {
        var m = maps[j];
        if (!m || m.issueKey !== issueKey) continue;
        // The ACT's direction, which for a blocking class is not the mapping's. See
        // issueDirection() above.
        var eff = issueDirection(a, m);
        if (eff === 'advances') adv++;
        else if (eff === 'opposes') opp++;
        else continue;
        res.actions.push({
          actionClass: a.actionClass, verb: EXEC_CLASSES[a.actionClass].verb,
          documentId: a.documentId || '', title: a.title || '', actedAt: a.actedAt || '',
          term: a.term || '', direction: eff, mappedDirection: m.direction,
          inverted: eff !== m.direction, isPrimary: !!m.isPrimary,
          sourceUrl: a.sourceUrl, sourceLabel: a.sourceLabel,
          standing: standingOf(a)
        });
        res.counts[a.actionClass]++;
        break; // one issue maps once per action
      }
    }

    if (!res.actions.length) {
      res.token = stance ? 'said_not_done' : 'no_record';
    } else if (!dir) {
      // An action is on file but there is no directional position to check it
      // against — including a stated stance of 'mixed', which is not directional.
      res.token = 'acted_no_stance';
    } else {
      var pro = dir === 'support' ? adv : opp;
      var con = dir === 'support' ? opp : adv;
      res.token = (pro && con) ? 'acted_both_ways' : pro ? 'acted_on_it' : con ? 'acted_against' : 'acted_no_stance';
    }
    res.verdict = EXEC_VERDICTS[res.token];

    // Issue-level standing: the most contested standing among this issue's actions,
    // so an issue is never presented as settled while one of its orders is enjoined.
    // challenged_unverified sits below the rulings and above the uncontested standings:
    // it must outrank in_force (an unresolved challenge cannot be summarised away as
    // operative) but must not outrank an actual injunction, because "a court stopped
    // part of this" is the stronger and better-sourced claim of the two.
    // `overridden` sits with the total defeats at the top. Its position relative to
    // struck_down is not a severity ranking — no action can hold both, since one names
    // a court reaching an order and the other names Congress reaching a veto.
    var order = ['struck_down', 'overridden', 'blocked', 'partly_blocked', 'rescinded',
                 'challenged_unverified', 'superseded', 'expired', 'in_force'];
    for (var k = 0; k < order.length && !res.standing; k++) {
      for (var n = 0; n < res.actions.length; n++) {
        if (res.actions[n].standing === order[k]) { res.standing = EXEC_STANDING[order[k]]; break; }
      }
    }
    return res;
  }

  // ── One issue's read, in the compact form a summary carries ────────────────
  // executiveIssue() returns the whole per-issue card: every mapped action with its
  // title, its citation and its standing. A summary that carried all of that would
  // be the ledger again under a different name, so this is the projection a caller
  // needs to NAME an issue and say how much sits behind it — the token and its
  // verdict, how many actions were counted, how they split by direction, and the
  // issue's most contested standing. Nothing here is derived: every field is lifted
  // off the read, so a chip built from a row and a card built from the same issue
  // cannot say different things.
  //
  // `advances` / `opposes` are the ACTS' directions, already inverted for blocking
  // classes by issueDirection(), and they are the acts' own directions rather than
  // agreement with a stated position — a caller that wants "how split is this" wants
  // the smaller of the two, and that is the same number either way round.
  function summaryRow(res, key) {
    var adv = 0, opp = 0, st = 0;
    var stKey = (res.standing && res.standing.key) || '';
    for (var i = 0; i < res.actions.length; i++) {
      if (res.actions[i].direction === 'advances') adv++;
      else if (res.actions[i].direction === 'opposes') opp++;
      if (stKey && res.actions[i].standing === stKey) st++;
    }
    return {
      issueKey: key, token: res.token, verdict: res.verdict,
      // `standing` is the issue's MOST CONTESTED standing, not the standing of
      // everything under it — see executiveIssue(). `standingN` is how many of this
      // issue's actions actually carry it, and a compact rendering needs that number
      // or it will print "Struck down" beside "9 actions on file" and say something
      // about eight documents that is not true of them.
      standing: res.standing, standingN: st, stance: res.stance,
      acts: res.actions.length, advances: adv, opposes: opp,
      counts: res.counts,
      score: null // structurally null here too — a row is not a rating of an issue
    };
  }

  // ── The count summary ──────────────────────────────────────────────────────
  // Two labelled totals that are NEVER added together. Axis A counts issues; Axis B
  // counts documents. One signed law can touch five issues and one issue can have
  // three orders behind it, so a single combined figure would invite the reader to
  // treat two different denominators as parts of one whole.
  //
  // The issue denominator covers every issue the ON-FILE ACTIONS touch, plus every
  // issue with a stated position — not just a curated headline set. If it counted
  // only the headline issues, `against` would read 0 while the app's own data says a
  // signed omnibus cut against one of its mapped issues, and the disclosure shown on
  // the individual card would vanish from the summary above it. A summary that can
  // only ever show alignment is a scoreboard, not a record.
  function execSummary(pid, opts) {
    opts = opts || {};
    if (!eligible(pid)) return null;
    var pool = actionsForMemo(pid, opts);
    if (!pool.kept.length) return null; // nothing on file → the panel's empty state speaks

    // Issue universe: mapped issues from the kept actions ∪ stated positions.
    var set = {}, i, j;
    for (i = 0; i < pool.kept.length; i++) {
      var maps = pool.kept[i].issues || [];
      for (j = 0; j < maps.length; j++) if (maps[j] && maps[j].issueKey) set[maps[j].issueKey] = 1;
    }
    try {
      if (typeof window._polPositionMap === 'function' && window.CMP_DATA) {
        var pm = window._polPositionMap(pid, window.CMP_DATA[pid]) || {};
        Object.keys(pm).forEach(function (k) { set[k] = 1; });
      }
    } catch (e) {}
    var keys = Object.keys(set).sort();

    var issues = { aligned: 0, against: 0, bothWays: 0, noActionFound: 0, noStance: 0, total: 0 };
    var TOKEN_BUCKET = {
      acted_on_it: 'aligned', acted_against: 'against', acted_both_ways: 'bothWays',
      said_not_done: 'noActionFound', acted_no_stance: 'noStance'
    };
    // The per-issue reads this loop already makes, KEPT rather than counted and
    // thrown away. A surface that wants to name a few issues — the compact formal
    // summary at the head of an executive profile does — would otherwise have to
    // rebuild this universe and re-read every issue, and the moment there are two
    // derivations of "which issues does this record touch" they can disagree. Same
    // pass, same feeder, so the counts above and any list built from these rows are
    // the same reading of the same file.
    var rows = [];
    for (i = 0; i < keys.length; i++) {
      // Same feeder as the individual cards — one pass, so the summary and the cards
      // can never disagree about an issue.
      var read = executiveIssue(pid, keys[i], opts);
      var b = TOKEN_BUCKET[read.token];
      if (b) { issues[b]++; issues.total++; }
      rows.push(summaryRow(read, keys[i]));
    }

    var actions = {
      inForce: 0, partlyBlocked: 0, blocked: 0, struckDown: 0, overridden: 0,
      rescinded: 0, challengedUnverified: 0, superseded: 0, expired: 0, total: 0
    };
    var STATUS_BUCKET = {
      in_force: 'inForce', partly_blocked: 'partlyBlocked', blocked: 'blocked',
      struck_down: 'struckDown', overridden: 'overridden', rescinded: 'rescinded',
      challenged_unverified: 'challengedUnverified',
      superseded: 'superseded', expired: 'expired'
    };
    var byClass = { signed_law: 0, vetoed_law: 0, executive_order: 0, directive: 0 };
    var unstated = 0;
    for (i = 0; i < pool.kept.length; i++) {
      byClass[pool.kept[i].actionClass]++;
      var sb = STATUS_BUCKET[standingOf(pool.kept[i])];
      if (sb) { actions[sb]++; actions.total++; } else { unstated++; }
    }

    var sum = {
      scope: 'executive', pid: norm(pid), office: officeOf(pid),
      framing: FRAMING,
      termScope: opts.allTerms ? 'all_time' : 'current_term',
      term: opts.allTerms ? '' : currentTerm(pid),
      issues: issues, actions: actions, byClass: byClass,
      // Every issue in the universe above, in key order, with the read that produced
      // its bucket. Counts and directions only — no score, and no ranking: this is
      // the same row the individual card renders from, not a league table.
      rows: rows,
      // Disclosed, never hidden: actions whose standing has no citation, and actions
      // excluded by the source rule.
      unstatedStanding: unstated,
      dropped: pool.dropped, allTimeTotal: pool.allTime, droppedAllTime: pool.droppedAllTime,
      thin: pool.kept.length <= THIN_MAX,
      contested: !!(actions.partlyBlocked || actions.blocked || actions.struckDown ||
                    actions.overridden || actions.rescinded || actions.challengedUnverified),
      label: '',
      score: null // structurally null — asserted by scripts/test-exec-summary.mjs
    };

    // ── Invariants ───────────────────────────────────────────────────────────
    // 1 and 3 hold by construction (totals are summed from the buckets, never
    // counted independently). 2 is the seam between the append-only status log and
    // the current-standing read, so it is the one that can actually break — and on a
    // mismatch we return null rather than publish arithmetic that does not hold.
    // A missing summary is a rendering gap; a wrong one is a false claim.
    var aSum = issues.aligned + issues.against + issues.bothWays + issues.noActionFound + issues.noStance;
    var bSum = actions.inForce + actions.partlyBlocked + actions.blocked + actions.struckDown +
               actions.overridden + actions.rescinded + actions.challengedUnverified +
               actions.superseded + actions.expired;
    var cSum = byClass.signed_law + byClass.vetoed_law + byClass.executive_order + byClass.directive;
    if (aSum !== issues.total) return null;
    if (bSum !== actions.total) return null;
    if (cSum !== pool.kept.length) return null;
    if (actions.total + unstated !== pool.kept.length) return null;

    sum.label = execSummaryText(sum);
    return sum;
  }

  // ── The volume clause, on its own ──────────────────────────────────────────
  // The label's FIRST clause — the framing plus how much is actually on file —
  // published separately so a surface with room for one line rather than a
  // paragraph prints these words instead of assembling its own sentence from the
  // same counts. The profile letterhead's depth line is that surface: it needs
  // "how much record is this" and nothing else, and a second phrasing of it is a
  // second thing to keep true.
  //
  // It carries the framing and the thinness caveat because those are what make the
  // count honest — a bare "23 across 8 issues" implies our file is their complete
  // output, and two actions read as a pattern unless the line says otherwise. No
  // verdict, no standing, no percentage: this is the denominator sentence.
  function execVolumeText(sum) {
    if (!sum || !sum.actions) return '';
    var docs = sum.actions.total + (sum.unstatedStanding || 0);
    if (!docs) return '';
    var iss = sum.issues.total;
    return FRAMING + ' — ' + docs + ' across ' + iss + ' ' + plural(iss, 'issue', 'issues') +
      (sum.thin ? ', still a thin record' : '');
  }

  // ── The label ──────────────────────────────────────────────────────────────
  // Assembled from the counts, never authored per figure — a pure function of the
  // summary object, no DOM and no window reads, so the language rules can be gated
  // against real generated output rather than against the templates alone.
  //
  // Forbidden here and enforced by scripts/test-exec-vocab.mjs: any '%', bare
  // fractions, vote words, and GRADED ADJECTIVES. That last one is the subtle rule
  // and the reason it needs a test — "mostly acted on it" IS a percentage, a ratio
  // judgment wearing a word. It would reintroduce through the copy the invented
  // denominator the no-score decision removed from the math, and it would pass every
  // numeric check. The label describes composition; it never grades it.
  function execSummaryText(sum) {
    if (!sum || !sum.actions || !sum.actions.total && !sum.unstatedStanding) return '';
    // The opening clause is the shared one — same words the letterhead prints, so
    // the header's depth line and this label cannot come to describe one file two
    // ways.
    var out = execVolumeText(sum);
    if (!out) return '';

    var al = [];
    if (sum.issues.aligned)  al.push('acted on it on ' + sum.issues.aligned);
    if (sum.issues.against)  al.push('acted against it on ' + sum.issues.against);
    if (sum.issues.bothWays) al.push('both ways on ' + sum.issues.bothWays);
    out += al.length ? ': ' + al.join(', ') + '.' : '.';

    // The standing clause is non-droppable whenever anything is contested.
    var st = [];
    if (sum.actions.inForce)       st.push(sum.actions.inForce + ' in force');
    if (sum.actions.partlyBlocked) st.push(sum.actions.partlyBlocked + ' partly blocked in court');
    if (sum.actions.blocked)       st.push(sum.actions.blocked + ' blocked by court order');
    if (sum.actions.struckDown)    st.push(sum.actions.struckDown + ' struck down');
    // Named for the actor, not just the outcome. "1 overridden" alone would leave the
    // reader to guess whether a court or Congress did it, and the whole reason this
    // token exists is that the two are different claims.
    if (sum.actions.overridden)    st.push(sum.actions.overridden + ' overridden by Congress');
    if (sum.actions.rescinded)     st.push(sum.actions.rescinded + ' rescinded');
    if (sum.actions.challengedUnverified) {
      st.push(sum.actions.challengedUnverified + ' challenged in court — no ruling on file');
    }
    if (sum.actions.superseded)    st.push(sum.actions.superseded + ' superseded by later action');
    if (sum.actions.expired)       st.push(sum.actions.expired + ' lapsed or expired');
    if (st.length) out += ' Standing: ' + st.join(', ') + '.';
    if (sum.unstatedStanding) {
      out += ' ' + sum.unstatedStanding + ' with no confirmed standing on file.';
    }

    if (sum.issues.noActionFound) {
      out += ' ' + sum.issues.noActionFound + ' ' + plural(sum.issues.noActionFound, 'issue', 'issues') +
             ' with a stated position and no action found.';
    }
    return out;
  }

  // The tip carries what the one-line label cannot: the selection rule, the other
  // term scope, and what was EXCLUDED. Mirrors consistency.js:1905's
  // _orMappedSummaryTip, which already names the records it did not count — a filter
  // that hides its own exclusions makes a partial record look complete.
  function execSummaryTip(sum) {
    if (!sum) return '';
    var t = 'Counted from the formal actions on file for this figure: signed legislation, ' +
      'vetoes, executive orders and formal directives, each carrying a primary source ' +
      '(congress.gov for legislation, the Federal Register for orders). Selection follows ' +
      'a published rule — every qualifying action touching a covered issue, in date order.';
    if (sum.termScope === 'current_term' && sum.term) {
      t += ' Showing the current term (' + sum.term + ')';
      if (sum.allTimeTotal > sum.actions.total + (sum.unstatedStanding || 0)) {
        t += '; ' + sum.allTimeTotal + ' on file across all terms';
      }
      t += '.';
    } else {
      t += ' Showing all terms on file.';
    }
    t += ' Issue counts and action counts are different units and are never added together: ' +
      'one action can touch several issues, and one issue can have several actions behind it.';
    if (sum.issues.noActionFound) {
      t += ' "No action found" is coverage, not a finding — it means nothing qualifying is ' +
        'on file yet, not that the figure declined to act.';
    }
    if (sum.dropped) {
      t += ' ' + sum.dropped + ' curated ' + plural(sum.dropped, 'item is', 'items are') +
        ' held back for citing a directory index or a summary page rather than the document itself.';
    }
    if (sum.unstatedStanding) {
      t += ' ' + sum.unstatedStanding + ' ' + plural(sum.unstatedStanding, 'action has', 'actions have') +
        ' no citable standing on file and are not assumed to be in force.';
    }
    // There is no percentage to explain, and saying so is part of the method. Stated
    // without reference to the congressional lane: explaining this lane by comparison
    // to that one would put vote language on an EER surface, and the denominator
    // argument stands perfectly well on its own.
    t += ' No percentage is shown: the set of actions a president could have taken is ' +
      'unbounded and self-chosen, so there is no honest denominator to divide by.';
    return t;
  }

  window.PDXExecRecord = {
    SCOPE: EXEC_SCOPE,
    VERDICTS: EXEC_VERDICTS,
    STANDING: EXEC_STANDING,
    CLASSES: EXEC_CLASSES,
    FRAMING: FRAMING,
    STANDING_STICKY: STANDING_STICKY,
    THIN_MAX: THIN_MAX,
    COVERAGE: EXEC_COVERAGE,
    // How much of this lane actually exists, computed from the shipped roster and
    // the shipped action file. Every coverage surface reads this; nothing hard-codes
    // a figure. `comparable()` is the gate a ranking or aggregating surface must
    // pass before it may treat two figures' EERs as commensurable.
    coverage: coverage,
    comparable: comparable,
    // Read-only view of the office gate, so the test can cross-check it against
    // db/vr-member-map.json without reaching into the closure.
    pids: function () { return Object.keys(EXEC_PIDS); },
    eligible: eligible,
    office: officeOf,
    currentTerm: currentTerm,
    // Whether this figure is serving NOW. Read by the integrity surfaces to decide
    // whether a current-term slice is a live scope or last term wearing a live label.
    serving: serving,
    // Per-issue read (Axis A + Axis B). score is always null.
    issue: executiveIssue,
    // Exposed so the inversion a blocking class applies is testable on its own rather
    // than only through the token it produces three layers up.
    issueDirection: issueDirection,
    // Politician-level count summary, or null when nothing is on file / an invariant
    // fails. Never a percentage. `.rows` carries the per-issue reads the counts were
    // made from, so a surface that names a few issues reads the same pass the totals
    // came from instead of rebuilding the universe.
    summary: execSummary,
    // Pure, DOM-free, directly unit-testable.
    summaryText: execSummaryText,
    // The label's volume clause alone — for surfaces with one line to spend. Same
    // builder the label uses, so the two can never name one file differently.
    volumeText: execVolumeText,
    // The per-class counts as counted phrases, in class order, zero classes omitted.
    // The one place those nouns live; see CLASS_NOUN.
    inventory: execInventory,
    summaryTip: execSummaryTip,
    // Exposed so the tests gate the SHIPPED source rule rather than a copy of it.
    sourceOk: sourceOk,
    standingOf: standingOf,
    actionsFor: actionsForMemo
  };
})();
