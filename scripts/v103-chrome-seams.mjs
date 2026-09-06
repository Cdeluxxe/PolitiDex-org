/**
 * scripts/v103-chrome-seams.mjs
 *
 * ONE SPELLING OF THE CHROME-PASS SEAMS — v103 (person-file chrome) and v104
 * (the formal brief's slice line). The filename kept its original version
 * because seven suites import it by name and a rename is a diff in all of them
 * for no reader's benefit; what the module actually holds is every span a
 * copy-only pass has cut into a byte-pinned file, and it says so here.
 *
 * Several suites in this repo pin a booted file BYTE FOR BYTE against HEAD —
 * the federal ingest waves (F5…F9, R1, R2) do it to prove a data wave never
 * reached the engine, and scripts/test-person-crawl-block.mjs does it to prove
 * the crawl-block pass never reached the arithmetic. That discipline is the
 * reason those files can be trusted, and it is also the reason a later pass
 * that legitimately edits one of them has to come here first: a blanket hash
 * forbids the passes it is supposed to survive.
 *
 * The person-file chrome pass (CACHE_VERSION v103) edited exactly three spans
 * across two of those pinned files:
 *
 *   consistency.js, seam A — SCOPES.official.empty
 *     The official scope's `no_stance` copy said "No stated stance to check".
 *     On this scope the token means "nothing was paired", and on /p/aaron_bean
 *     the unpaired half is the WORD, not the record: the letterhead above it
 *     counted 23 mapped acts. Renamed to "No stated position to test".
 *
 *   consistency.js, seam B — scopedOverall's token ladder
 *     The ladder could only reach `no_record` — spelled "No qualifying votes on
 *     record yet" in the official scope — with an EMPTY key list, which is not
 *     an empty voting record. An empty key list means the roll-call lane has
 *     not answered yet (→ 'pending', and ask for the read) or it answered and
 *     there is no stated position to test (→ 'no_stance').
 *
 *   stance-helpers.js, one seam — _pdxStanceRecordStats
 *     It counted formal ISSUE ROWS out of an index that is empty until the
 *     roll-call cache warms, so the mid-page card called the record "still
 *     being built" while the letterhead above it counted acts. It now also
 *     reports formalActs (the acts themselves) and formalRead (whether the
 *     lane has answered at all).
 *
 * The brief slice-line pass (CACHE_VERSION v104) edited three more, all in
 * word-action.js and all of them copy:
 *
 *   word-action.js, seam A — the slice gate
 *     A new block between shapeRowsHtml() and shapeHeroHtml(): one locked
 *     sentence in two forms, and the four-leg gate that decides whether a file
 *     has earned it. Every figure it reads is already published for that person
 *     (the inventory's formal.acts, the record lane's own distinct-instrument
 *     count, and the chamber / roll / congress fields on the warm records). It
 *     computes nothing.
 *
 *   word-action.js, seams B and C — the two mounts
 *     One call each, in the letterhead and in the brief, directly after the
 *     pattern list and directly before the route out. Nothing else in either
 *     return changed, which is what the twin boot in each suite then proves at
 *     the rendered-HTML level.
 *
 * The issue-ledger pass (CACHE_VERSION v108) edited five more, all in
 * consistency.js, and all of them one change: the issue desk now prints one
 * issue's PEOPLE in the bands the person file prints one person's ISSUES in, and
 * it reads the formal-pattern index's own row to do it rather than
 * characterising the same record a second time on a second surface.
 *
 *   consistency.js, seam C — the ledger's band table
 *     _FPI_LEDGER_BANDS and _fpiLedgerBand: five ids in a fixed clearest-first
 *     order, and a function whose only two inputs are the `tier` and `tone` of a
 *     row this file already built. It is a partition, not a ranking; nothing in
 *     it sorts by party, by stated position or by any number.
 *
 *   consistency.js, seam D — the extracted single-row builder
 *     _fpiRowFor(r), lifted whole out of the _fpiRows loop. The three-rung
 *     ladder, both refusals and the fail-closed gate are byte-for-byte what they
 *     were inside the loop; only the shape of the exit moved.
 *
 *   consistency.js, seam E — the loop that now calls it
 *     Two lines where the body used to be. The sort below it is outside the seam
 *     and therefore still pinned.
 *
 *   consistency.js, seams F and G — four export names
 *     rowFor / band / LEDGER_BANDS on the index, and TAIL_MIN beside the caps it
 *     belongs with, so a second surface folds its tail at the same length
 *     instead of picking its own number. References, not logic.
 *
 * The issue-family pass (CACHE_VERSION v109) is the first entry here that is not
 * a span in a booted engine file, and it is declared on the same terms. It had to
 * move alignment-tool.js, which F5, F6, F7 and test-person-crawl-block.mjs all pin
 * byte for byte. The reason is structural: CORE_NATIONAL_ISSUES — the site's ONLY
 * issue taxonomy, declared directly below ISSUE_MAP — named a parent for 97 of the
 * 121 published keys and left 24 with none, so `lands_preserve` had a label, a chip
 * and four mapped measures, and a ledger you could reach only by typing its name.
 * Finishing that table was the fix. Building the missing half anywhere else would
 * have been a second taxonomy, which is the one move that pass was forbidden.
 *
 * So the equality becomes the substantive thing it stood in for, written once here
 * instead of waived in four files. What those suites are protecting is a PUBLISHED
 * BOUNDARY: no key added, no key renamed, no scope note widened to admit a row the
 * wave's own rules refused. assertParentTableIsTheOnlyMove() checks exactly that,
 * in five statements:
 *
 *   · alignment-tool.js is byte-identical to HEAD everywhere OUTSIDE the CORE
 *     NATIONAL ISSUES block — which pins ISSUE_MAP itself, every key, label, chip,
 *     cat, lean and keyword list in it, every scope note, the alignment engine, the
 *     evidence helpers and the team-alignment renderer.
 *   · Inside the block: the same thirteen core ids, in the same declared order. No
 *     fourteenth core, none dropped, none re-keyed.
 *   · No core lost a key or reordered the keys it already had — HEAD's key list for
 *     each core is a SUBSEQUENCE of the working tree's. Additions only, because a
 *     key leaving a core takes a chip and a crumb with it.
 *   · Every key the table names is a key ISSUE_MAP already publishes. The pass
 *     added parents, not vocabulary.
 *   · A core's label may differ from HEAD ONLY if that core gained keys — the
 *     honesty rule that pass worked under, that a core which parents land has to
 *     say land. A label that moves on its own is a rename, and a rename is refused.
 *
 * No assertion was removed in any of the four suites. A wave that touches
 * alignment-tool.js and cannot satisfy those five still fails, and now it fails
 * with the reason instead of with a hash.
 *
 * The record-first card pass (CACHE_VERSION v111) edited seven more — five in
 * consistency.js and two in issue-colors.js — and every one of them is a NAME put
 * on something one of those files already had. The homepage carousel card was the
 * last surface still painting the old card language: three untyped issue rows and a
 * loud Word-vs-Action percent, on a site whose person file had moved to coloured
 * issue rows, 🏛 RECORD badges and split counts. The card had to wear that face,
 * and it had to wear THE SAME ONE — a third card language was the one thing the
 * pass was forbidden. Every span below exists because the alternative was a copy:
 *
 *   consistency.js, seam H1 — _ST_PAT_LANE and _stPatPaint
 *     The badge's two words and its fill rule, lifted whole out of _stPatternHtml
 *     so a surface that cannot mount that chip's markup still prints that chip's
 *     paint. The rule is byte-for-byte the ladder that was inline (only `full` and
 *     `strong` take their tone's fill), which the seam checks by reconstruction.
 *
 *   consistency.js, seam H2 — the chip reading it back
 *     Two lines where the table lookup and the ladder were. The chip's markup, its
 *     lane literal, its label and its tally are untouched and still pinned.
 *
 *   consistency.js, seam H3 — recordStandout's row
 *     Two fields: the tier's `weight` (the only input the fill rule takes) and its
 *     `sideCounts`. The second is there because a Split row whose publication
 *     decision withheld its margin printed the bare word "Split" onto a card with
 *     both numbers sitting one field away. `counts` is untouched.
 *
 *   consistency.js, seam H4 — execRecordSummary's row
 *     Six fields carrying that row's DISPLAY tier beside the verdict word the strip
 *     always printed. It is the same _stDisplayTier read _xsShape() makes, on the
 *     same spine row in the same all-terms scope — not a lookup into _xsShape()'s
 *     published buckets, which are capped and separately sorted, so a picked row can
 *     legally be absent from them and its badge would have vanished silently.
 *
 *   consistency.js, seam H5 — two export names
 *     LANE and paint, beside the tier read they belong with. References.
 *
 *   issue-colors.js, seams I1 and I2 — the shared chip skin, and its export
 *     `skin(key)` is styleFor() + isCore() in the shape a renderer wants. Three
 *     surfaces had already written that composition privately; the card needed the
 *     SAME token the person file prints for the same key, byte for byte, and four
 *     private copies cannot promise that. It decides no colour: every hex still
 *     comes from CORE_ISSUE_COLORS through getIssueColor().
 *
 * Nothing in that pass moved a tier, a floor, a weight, a side word or the
 * Word-vs-Action arithmetic — the display-only wall it worked under. What moved on
 * the card is CSS and markup, in files nothing here pins.
 *
 * The bill-door pass (CACHE_VERSION v138) edited fourteen more spans in
 * consistency.js — seven above the mechanism literal and seven below it — and
 * every one of them exists because four surfaces printed a measure identity as
 * TEXT. The dossier's Official Record card, the "which measures this came from"
 * roll-up, the formal proof line and the issue desk's ledger all named H.B. 400
 * or H.R. 6644 in a place a reader could see it and not open it: the instrument
 * itself — all of its members, all of its mappings, its vehicle and its
 * stowaways, its roll calls — had no door anywhere on the person file. The
 * education path stopped at the person-issue pair.
 *
 *   consistency.js, seams K1-K3 — three spans of paint
 *     The proof line's number marked as its own door (dotted underline, and only
 *     where the door attribute is actually on it), the door's own reset, and the
 *     focus ring moved off the roll-up ROW and onto the two controls that can
 *     actually take focus. The reset is declared one class deep, above the slots
 *     it lands in, precisely so the slot rules keep owning the weight, size and
 *     colour of their own text: a number that changed colour on becoming a door
 *     would be a restyle wearing a feature's clothes.
 *
 *   consistency.js, seams K4-K6 — precedence in the two delegated listeners
 *     Every measure identity is printed INSIDE something that is already a door,
 *     and closest() walks outward — so the branch tested first wins the tap. The
 *     bill branch is now tested first in the click gateway (K4), the branch that
 *     used to be tested last is gone from that spot (K5), and the keydown
 *     listener repeats the same precedence with the one guard that keeps a real
 *     <button> from opening the panel twice (K6).
 *
 *   consistency.js, seam K7 — the proof line's number
 *     Pointer only, and that is the line's own existing rule rather than a new
 *     exception: the proof line lives inside a <summary> that deliberately takes
 *     no focus. Suppressed on a stated position, which is not cast on an
 *     instrument.
 *
 *   consistency.js, seam L1 — one owner of "which sitting is this number in"
 *     window.pdxBillSit, published because the issue desk prints the same numbers
 *     as doors onto the same panel. A number without its sitting is not an
 *     address, and a second copy of that precedence is a second chance for two
 *     surfaces to address different sessions from the same printed number.
 *
 *   consistency.js, seams L2-L4 — the door itself, emitted in one place
 *     The card's number and its title become real <button>s onto the bill file
 *     (legal there: it is a <summary> whose other control has been a button since
 *     it shipped), and both go through ONE emitter — which also owns the honest
 *     refusal. No number, no door; no bill page on file, and the control says so
 *     on itself, once, instead of eating the tap or dumping an index.
 *
 *   consistency.js, seams L5-L7 — the roll-up row, which cannot hold a button
 *     A <button> inside the row's door would make the parser close the row early
 *     and drop every span after it. So the row keeps its door attribute and stays
 *     a POINTER target, and role, tabindex and the accessible name move onto the
 *     two spans that are the real controls: the identity (the bill file) and the
 *     arrow (the explainer, exactly as before). The group carries the measure's
 *     own address off the same item its explainer opens.
 *
 * None of the fourteen is arithmetic either, and none of them is a destination
 * this file invents: every door hands a number and a sitting to bill-detail.js,
 * which owns the one bill panel, and no span below spells an address shape of its
 * own.
 *
 * None of the eighteen is arithmetic. No floor, band, weight, mapping, score or
 * party read or written inside any of them — which is what the assert helpers
 * below check, span by span, rather than excusing the diff.
 *
 * The anchors are unique in BOTH the HEAD and the working copy of their file.
 * If one stops being unique, widen it here — do not loosen the check.
 */

// ── consistency.js: the spans ABOVE the _DOS_MECH literal, in FILE order ─────
// File order, not pass order: carveSeams() walks this list forward and searches
// each anchor from where the previous seam ended, so a span listed out of turn
// would not be found. Every entry names itself in its third slot and the
// arguments further down look themselves up BY THAT NAME — see byWhy(). Position
// is not identity in this list: a later pass inserting a span in the middle of it
// must not silently renumber an earlier pass's argument, which is exactly what
// happened when the record-badge pass (v111) landed two spans above the ledger's.
export const CJ_SEAMS = [
  ["      blurb: 'The hard, institutional score — their votes and formal legislative actions checked against what they say they stand for.',\n",
   "\n      // The ✒️ lane's wording for the same card.",
   "the official scope's empty wording"],
  ["    else if (counts.limited > 0) token = 'limited';\n",
   "\n    // Phase 7: Say-vs-Do carries its OWN pooled public-record integrity %",
   "the roll-up's empty-key token"],
  // ── and seven for the bill door (v138): first, three of paint ─────────────
  // K1. The proof line's number, marked as a door only where it IS one: the
  // unconditional rule keeps the weight and colour it always had, and the dotted
  // underline is attached to the door attribute. A line whose measure has no
  // number is not dressed as a control.
  ["      '.pdxor-proof-bill{color:#e8eefc;font-weight:700;letter-spacing:0.01em;}' +\n",
   "      '.pdxor-proof-txt b{color:#e8eefc;font-weight:700;}' +\n",
   "the proof line's number, marked as its own door"],
  // ── and three for the issue file's doors on the dossier (v133) ─────────────
  // The person×issue dossier named an issue and taught neither the key nor the
  // measure: the title was an inert <div>, there was no ⓘ, and the bill line was
  // the number and nothing else. All three spans below are that sheet's own header
  // and its own paint. Nothing in them reads a roll, a floor, a mapping, a weight
  // or a member; the address is asked of pdx-issue-family.js and the scope prose is
  // asked of issue-scope.js, so neither string is written here.
  ["      '.pdxgap-title.pdxc-ic{border-left:4px solid var(--pdx-ic);padding-left:0.5rem;' +\n" +
   "        'background:linear-gradient(90deg,var(--pdx-ic-wash,transparent),transparent 58%);}' +\n",
   "      '@media (max-width:380px){.pdxgap-title{font-size:1.3rem;}",
   "the title row's paint, and the link's"],
  // K2. The door's own reset, and the refusal note. Declared one class deep and
  // ABOVE the slots it lands in so .pdxdos-rec-id and .pdxdos-rec-ttl keep
  // ownership of their own type: this span undoes button chrome and nothing else.
  ["      '.pdxgap-drv-l{list-style:none;margin:0.35rem 0 0;padding:0;display:grid;gap:0.3rem;}' +\n",
   "      '.pdxgap-drv-r{display:flex;flex-wrap:wrap;align-items:baseline;gap:0.2rem 0.4rem;' +\n",
   "the measure door's paint, and the refusal note's"],
  // K3. The focus ring, moved off the row and onto the two controls. The row is a
  // pointer target that never takes focus, so a ring drawn on it could not be
  // reached by the keyboard it was drawn for.
  ["      '.pdxgap-drv-r.is-door:hover{border-color:rgba(127,180,255,0.5);background:rgba(127,180,255,0.08);}' +\n",
   "      '.pdxgap-drv-r.is-door:hover .pdxgap-drv-go{opacity:1;}' +\n",
   "the focus ring, moved onto the two controls"],
  ["      '.pdxgap-drv-t{flex:1 0 100%;font-size:0.63rem;color:#93a6c4;line-height:1.35;}' +\n",
   "      '.pdxgap-drv-p{flex:1 0 100%;",
   "the one-measure summary line's paint"],
  // ── and three more for the bill door (v138): who wins the tap ─────────────
  // K4/K5. THE SAME BRANCH, MOVED TO THE FRONT. Every bill number is printed
  // inside a door already — a card face, a roll-up row, a proof line — and
  // closest() walks outward, so the branch tested first is the one that answers.
  // K4 is the branch in its new place, ahead of the L3 mount as well (a reader
  // asking for the bill file is not asking for a card body); K5 is the spot it
  // used to sit in, kept as a seam so its absence is checkable rather than
  // implied. Everything between the two — the L3 mount, the insight door, the
  // roll-up's own door — is outside both spans and still pinned.
  ["      _stBackSweep();\n",
   "      // ── L3, mounted on demand ─────────────────────────────────────────────\n",
   "the bill branch, first in the click gateway"],
  ["      var drv = e.target.closest && e.target.closest('[data-pdxdrv-open]');\n      if (drv) {\n        e.preventDefault();\n        _drvOpen(drv);\n        return;\n      }\n",
   "      // The stance row's primary tap: the issue name opens that issue's dossier and\n",
   "where that branch used to sit, last"],
  // K6. The same precedence on the keyboard, with the one guard that matters: a
  // real <button> already receives Enter and Space from the browser AS a click,
  // so handling them here too would open the same panel twice.
  ["      if (e.key !== 'Enter' && e.key !== ' ' && e.key !== 'Spacebar' && e.keyCode !== 13 && e.keyCode !== 32) return;\n",
   "      var drv = e.target && e.target.closest && e.target.closest('[data-pdxdrv-open]');\n",
   "the same precedence on the keyboard"],
  ["    return { style: IC.styleFor(key), cls: on ? ' pdxc-ic' : '', on: on };\n  }\n",
   "  // The dot repeats the row's colour next to the issue name, where the eye",
   "the title door and the ⓘ beside it"],
  // K7. The proof line's number, as the door. Pointer only — the line sits in a
  // <summary> that takes no focus on purpose, because a second tab stop per row
  // would compete with the row's own expand control — and suppressed on a stated
  // position, which is not cast on an instrument anything could open.
  ["      var multi = _orRowMultiNote(p.item, issueKey);\n      var b = _orProofBits(p.item);\n",
   "      var restBits = [];\n",
   "the proof line's number, as the door"],
  // ── and two for the record badge the homepage card now wears (v111) ───────
  // The homepage card lane had to print the SAME 🏛 RECORD badge the person file
  // prints, and it could do that in exactly one of three ways: mount this file's
  // chip markup (it cannot — the card is a different card, with a different row),
  // retype the badge's two words and its fill rule at the card (which is the
  // second badge language that pass was forbidden), or read the tokens the chip
  // already uses. These two spans are the third. Nothing about WHICH tier a row
  // gets moved; both spans are the badge's paint.
  ["  var _ST_PAT_QUIET = 'rgba(10,15,30,0.32)';\n",
   "  function _stPatternTier(r) {\n",
   "the badge's lane word and its fill rule, named"],
  ["        return why ? _fpiUnreadHtml({ why: why }) : '';\n      }\n    }\n    if (!t) return '';\n",
   "\n    // The lane marker is not decoration either:",
   "the chip reading that fill instead of spelling it"],
  // ── and three for the issue desk's record ledger (v108) ────────────────────
  // The other two spans of that pass are its export lines, which sit BELOW the
  // _DOS_MECH literal — see CJ_SEAMS_BELOW.
  ["  var _FPI_TAIL_MIN = 4;\n",
   "\n  // The one sentence that keeps this list out of the score,",
   "the ledger's band table"],
  ["  function _fpiPublishedRead(r) {\n    if (!r || r.lane === 'exec') return null;\n" +
   "    var d = null;\n    try { d = _stDisplayTier(r); } catch (e) { d = null; }\n" +
   "    return (d && d.tier && d.tier !== 'none') ? d : null;\n  }\n",
   "\n  // \u2500\u2500 THE ROWS \u2500\u2500",
   "the extracted single-row builder"],
  ["    (issueRows(pid) || []).forEach(function (r) {\n",
   "\n    // STRONGEST FIRST, THINNEST LAST",
   "the loop that now calls it"],
  // ── and two more for the record badge (v111): the rows that carry it ───────
  // A card row cannot render a badge the row it was built from does not publish.
  // Both spans add FIELDS to a row this file already picked, off a read this file
  // already made, and neither picks, sorts, caps or counts anything on them.
  ["      patLabel: x.patLabel, counts: x.counts, judged: x.judged, held: x.held,\n",
   "  function recordStandout(pid) {\n",
   "the standout row's weight and two-sided phrase"],
  ["  function execRecordSummary(pid) {\n    var p = _xsPick(pid);\n",
   "    return { on: p.on, pid: p.pid, acts: p.acts, issues: p.issues, readable: p.readable,\n",
   "the exec row's display tier, beside its verdict word"],
];

// ── consistency.js: the spans BELOW the _DOS_MECH literal, in FILE order ─────
// The v108 export lines, and the v111 badge tokens beside them. Several suites cut
// this file at the literal and compare the halves separately, so that a wave's
// mechanism-prose waiver provably does not reach the renderer below it; those
// suites carve this list out of the lower half and byte-compare what is left.
// Suites that carve the file whole use CJ_SEAMS_ALL.
export const CJ_SEAMS_BELOW = [
  // ── the bill door's lower half (v138): one owner, one emitter, one refusal ─
  // L1. WHICH SITTING A NUMBER IS IN, published under one name. "H.R. 22" names
  // one bill in the 119th and a different one in every other congress, and
  // "H.B. 208" names a different bill in every Utah general session, so a number
  // alone is not an address. The issue desk prints the same numbers as doors onto
  // the same panel and asks this rather than keeping a second copy of the
  // precedence — which is the only thing that stops two surfaces from addressing
  // different sessions from the same printed number.
  ["    return (typeof c === 'number' && isFinite(c) && c > 0) ? String(c) : '';\n  }\n",
   "  function _dosCongressLabel(n) {\n",
   "one owner of which sitting a number is in"],
  // L2/L3. THE CARD'S NUMBER AND ITS TITLE, as real <button>s. Legal here where
  // it is not legal in the roll-up row: this is a <summary>, whose other control
  // — "See all N readings" — has been a real button since it shipped. Both slots
  // call the one emitter, and both keep the class the layout already styles, so a
  // <span> becoming a <button> changes what the element DOES and nothing about
  // where it sits.
  ["      (nos ? '<span class=\"pdxdos-rec-nosl\">' + esc(nos) + '</span>' : '') +\n",
   "      // The sitting sits with the number because it is part of the number's meaning:\n",
   "the card's number, as the door"],
  ["      // bill number the ident falls back to the title.\n",
   "      (d.question ? '<span class=\"pdxdos-rec-act\">' + esc(d.question) + '</span>' : '') +\n",
   "the card's title, as the same door"],
  // ── the one-measure roll-up, and the sentence splitter under it (v133) ─────
  // The dossier's "Which measures this came from" roll-up bailed below two items,
  // so the thinnest possible record — one vote on one bill, which is most of a
  // first-term file — was the one depth where the measure explainer's door did not
  // exist at all. It renders at one now: singular heading, the member's side in
  // the same four words the tallies use instead of "1 advanced", and one clipped
  // sentence of the curator's own mapping rationale. The clip needed a sentence
  // boundary that survives H.R., H.Amdt. and Pub. L. — the old split returned the
  // string "R." out of "H.R. 8800" — so the splitter is rewritten here too and its
  // pieces still concatenate back to the input byte for byte, which is what lets
  // the card promise the words are the curator's own.
  //   No wave has a stake in any of it: nothing below reads a roll, a floor, a
  // mapping, a weight, a party or a member, and nothing generates prose. Every
  // sentence printed is a prefix of a string already on the mapping row, and the
  // multi-measure roll-up every earlier wave was written against renders the same
  // bytes it always did.
  ["  // fold at the bottom, which still holds the paragraph in full.\n",
   "  // Slot 2's read: WHOSE sentence is about to be printed",
   "the bill-aware sentence boundary"],
  // L4. THE EMITTER, AND THE HONEST REFUSAL. Four surfaces print an identity and
  // all four open the same panel, so the attributes the delegated gateway reads
  // are written once here instead of four times. NO NUMBER, NO DOOR: a record row
  // filed without a bill number has no measure to open and its identity IS its
  // headline. And when there is no bill file behind a number the control says so,
  // on itself, once — it does not eat the tap in silence, and it does not hand
  // back an index or a homepage the reader did not ask for.
  ["      var num = el && el.getAttribute ? (el.getAttribute('data-pdxbill-num') || '') : '';\n      if (!num) return;\n",
   "  function _drvOpen(el) {\n",
   "the door emitter, and the honest refusal"],
  ["  var _DOS_DRV_H = 'Which measures this came from';\n",
   "  function _dosDrivers(pid, issueKey, ov) {\n",
   "the singular heading, as a constant"],
  ["          n: 0, adv: 0, opp: 0, held: 0, pkg: !!pkg[k], cls: '',\n",
   "          // WHERE THIS MEASURE'S OWN SCREEN IS.",
   "the group's rationale field"],
  // L5. THE GROUP'S OWN ADDRESS, off the same first item its explainer opens. A
  // group is one instrument seen from one to six roll calls, so the number is the
  // same on every member of it — and reading the sitting off the item the door
  // already opens is what stops the row from linking to a different session than
  // the explainer it is anchored to.
  ["          // lose the correspondence entirely.\n",
   "        };\n        order.push(k);\n",
   "the group's own address"],
  ["  function _dosDriversHtml(pid, issueKey, ov) {\n    var d = _dosDrivers(pid, issueKey, ov);\n",
   "    var rows = d.rows.map(function (g) {\n",
   "the one-measure gate"],
  // The gate's closing line rides along at the head of this anchor because
  // "      var bits = [];" alone is NOT unique in consistency.js: the record
  // proof-line builder opens with the same statement two indents deeper, and a
  // six-space needle matches inside its eight-space line. Widened, not loosened.
  ["    var rows = d.rows.map(function (g) {\n      var bits = [];\n",
   "      if (g.adv) bits.push(g.adv + ' advanced');\n",
   "the side said in words, not counted"],
  ["      if (g.held) bits.push(g.held + ' not scorable');\n",
   "      var ttl = g.title && g.title.toLowerCase() !== g.ident.toLowerCase() ? g.title : '';\n",
   "the clipped rationale, and its budget"],
  // L6. THE ROLL-UP IDENTITY, AND WHERE THE ROW'S NAME WENT. This line now
  // carries two destinations — the bill file on the identity, this issue's
  // explainer on everything else — and a row that announces itself as one control
  // cannot hold the other. A <button> is impossible here (the parser would close
  // the row early and drop every span after it), so the <li> keeps its door
  // attribute and stays a POINTER target while role, tabindex and the accessible
  // name move onto the two spans that are the actual controls. Where the group
  // carries no number the identity stays the plain text it has always been.
  ["      if (ttl.length > 78) ttl = ttl.slice(0, 78).replace(/\\s+\\S*$/, '') + '…';\n",
   "        '<span class=\"pdxgap-drv-n\">' + esc(g.n + ' ' + (g.n === 1 ? 'item' : 'items')) + '</span>' +\n",
   "the roll-up identity, and where the row's name went"],
  ["        (ttl ? '<span class=\"pdxgap-drv-t\">' + esc(ttl) + '</span>' : '') +\n",
   "        (g.pkg ? '<span class=\"pdxgap-drv-p\">",
   "the rationale's own span on the row"],
  // L7. THE EXPLAINER'S OWN FOCUS STOP, and the reason the row no longer needs
  // one. The arrow was an affordance and nothing else; it is now the keyboard twin
  // of the pointer tap the whole row still answers.
  ["          '</span>' : '') +\n",
   "      '</li>';\n",
   "the explainer's own focus stop"],
  ["    return '<div class=\"pdxgap-drv\" data-pdxgap-drv=\"' + escAttr(String(d.docs)) + '\">' +\n",
   "        // BOTH NUMBERS, BECAUSE THEY ARE DIFFERENT NUMBERS.",
   "the heading chosen by the count"],
  ["      '<div class=\"pdxgap-h\">' +\n",
   "        _dosBucketHtml(_dosRow) +\n",
   "the dossier title's mount"],
  ["      TONE: _ST_PAT_TONE,\n",
   "      display: _stRecordDisplay,\n",
   "the badge's two exported tokens"],
  ["    formalPatternIndex: {\n      rows: _fpiRows,\n",
   "\n      html: formalPatternIndexHtml,",
   "the single-row and band exports"],
  ["      shape: _fpiShape,\n      TOPS_CAP: _FPI_TOPS_CAP,\n      SPLITS_CAP: _FPI_SPLITS_CAP,\n",
   "\n      VIEWS: _FPI_VIEW_ORDER,",
   "the exported fold length"],
];

/** Both halves, in file order, for a suite that carves consistency.js whole. */
export const CJ_SEAMS_ALL = CJ_SEAMS.concat(CJ_SEAMS_BELOW);

// ── stance-helpers.js: two spans — the record-CTA stats, and the topic chip ──
// The second span is the v121 issue-door pass. The topic chip on a stance read the
// key's CORE, printed the FAMILY's label — "Where all stand: Climate, Energy &
// Land" — and then handed the ranked consistency overlay the LEAF key: a family
// named, a league table of people opened, one key ranked, three different things
// in one control. A chip on a PERSON that opens a characterisation of every other
// person is the finding that already moved bill-detail.js's and profile-spine.js's
// topic chips off that overlay. It prints the key's own label now and opens that
// key's record on the desk's one issue door.
//
// A wave has no stake in the span: no floor, no mapping, no weight, no score and
// no admission is read or written inside it — it is a label and a destination —
// and every stake in the rest of the file, which is compared byte for byte.
export const SH_SEAMS = [
  ["    var formal = 0;\n",
   "\n  window._pdxStanceRecordStats = _pdxStanceRecordStats;",
   "the record-CTA stats"],
  ["      var chips = [];\n",
   "      var sp = _pdxSpotlightForStance(id, key);",
   "the topic chip: its label and where it goes"],
];

// ── issue-colors.js: two spans — the shared chip helper, and its export ──────
// This file is the site's ONLY issue-colour table and it is byte-pinned by
// test-person-crawl-block.mjs for that reason. The record-card pass (v111) had to
// colour a card row with the same token the topic tree uses for that key, and the
// brief did that by hand-assembling `isCore() ? styleFor() : ''` at its own mount.
// A second surface copying those three lines is how two surfaces end up disagreeing
// about which keys are coloured at all, so the composition became a named helper
// here — where the table is. It reads the two functions already exported beside it
// and it holds no colour of its own.
export const IC_SEAMS = [
  ["  function isCore(coreOrIssueKey, coreLookup) {\n    return !!getIssueColor(coreOrIssueKey, coreLookup).mapped;\n  }\n",
   "  // :root properties for the static case",
   "the shared chip helper"],
  ["    styleFor: styleFor,\n",
   "    cssText: cssText,\n",
   "the chip helper's export line"],
];

// ── word-action.js: the shared figure, the chip, the section, the gate, the mounts ────
export const WA_SEAMS = [
  // ── the shared figure and the shared repaint (v140) ────────────────
  // The letterhead chip and the ⚖️ section print one finding about one person, a
  // screen apart, and they were printing two SIZES of it: "84% · 5 of 14 tested"
  // beside the name on /p/lee while the section below read 72% over 15 of 26.
  // Neither figure was invented — each was a faithful print of a read taken at a
  // different tick, and this ledger grows as the roll-call record and the lazy
  // data bundles land. That is what made the pair a lie: a reader cannot see
  // which tick a number came from, and two "tested" counts on one page is a worse
  // defect than the missing denominator the chip was given one for.
  //
  // This span is the OWNER. figure(pid, p) answers, for one pid, the percentage,
  // the tested count, the eligible count, the outcome token and the one fraction
  // sentence those two integers make; the surfaces below print that object. The
  // arithmetic is NOT in here — scopedRead, read, Direction Match, the tier
  // weights and both floors are outside the seam and compared on this file's
  // usual terms. What the span does is stop the chip asking read() a different
  // question than the section asks, and refuse to publish a percentage with no
  // set to size it.
  //
  // It also holds the one repaint contract: bindHero's — every event in
  // HERO_REPAINT, the alias-tolerant matcher, the seen guard, one reconciling
  // paint — reused BY REFERENCE by the chip and the section, because two surfaces
  // printing one object still drift if they hear about the arrival at different
  // times.
  ["    if (typeof a === 'number' && typeof b === 'number') out.delta = b - a;\n    return out;\n  }\n",
   "  // ── CONNECTING THE DOTS",
   "the shared figure and the shared repaint"],
  // ── the apparatus lid's label (v141) ──────────────────────────────
  // The lid label is the third face of one figure and it built the pair by hand:
  // r.coverage.tested + ' of ' + r.coverage.scorable + ' tested', a screen below
  // the number block it is sizing and inside the very section it opens onto. Two
  // spellings of one number agree only until somebody edits one of them, and this
  // one is on a control a reader has to TAP — a label that promises a set and then
  // shows a different one spends the tap and breaks the promise.
  //
  // The span prints figureOf(pid, r)'s fraction and nothing else, off the read
  // this builder is already holding, so no second scoring pass is bought for a
  // string the section already has. Where the set cannot be said the CLAUSE goes
  // and the label keeps its subject: the label may never become a bare "See
  // more", and it may never read "0 of 0 tested".
  //
  // The span opens on the line that assembles `inner` so the note arguing the
  // change sits inside the seam with it; `inner` itself, the sentinel markup and
  // the lid's <div> are outside and still pinned.
  ["                  feedsHtml(pid, p, r) + methodHtml(r, pid);\n      if (!inner) return '';\n",
   "      return '<div class=\"pdxwa-how\">' +",
   "the apparatus lid's label"],
  // ── the Official Record feed row (v141) ───────────────────────────
  // The row that NAMES THE TEST, disagreeing with the figure it is the test for.
  // The feeds panel prints one row per input with a count on the right, and this
  // row's count was the fourth hand-built copy of the same two integers. It sizes
  // the same span the number block above it and the lid below it size — all three
  // inside one section — so this row is where a drift would be least visible and
  // most damning. It reads the owner off the read the panel already has. Every
  // OTHER row in the panel is outside this seam: those counts size their own
  // tiers, not the tested set, and none of them moved.
  ["      rows.push({ ico: '🏛️', name: 'Official Record', target: 'pdxsec-official-record', counted: true,\n",
   "      // THE \"🧾 SAY-VS-DO RECEIPTS → #pdxsec-saydo\" ROW IS GONE.",
   "the Official Record feed row"],
  // ── the identity chip's denominator (v136, v140) ───────────────────
  // A wave has no stake in this span and every stake in the file around it, so it
  // is carved out by name rather than the file being waived whole. The span is the
  // markup of ONE control: the compact Word vs Action chip that sits in the
  // identity block, high on a person file, and jumps to the ⚖ section a screen
  // below. It printed the figure and the verdict word and nothing else —
  //
  //     100% · Backs it up
  //
  // — beside the person's name, on a page that also carries a hundred formal
  // acts. 102 of the 187 chips this corpus paints stand on exactly
  // MIN_TESTED_ITEMS tested items, which is the publication floor and not one item
  // more; a percentage with nothing to size it, in that position, is read as a
  // grade. The span now prints the denominator the ⚖ section already prints, in
  // the section's own words, in the visible text and in the accessible name.
  //
  // The arithmetic is NOT in here. Both integers are read()'s own coverage block,
  // and read() — with Direction Match, the tier weights and every floor — is
  // outside the seam and compared byte for byte, on this file's usual terms. What
  // the span may not do is argued below: no count of its own, no threshold of its
  // own, no second control, no rank.
  //
  // The span opens on the note above the function, not on the function, because the
  // argument for a change of this kind belongs beside the change — and because a
  // seam whose body is markup only would leave that note pinned to HEAD, where it
  // could not be written at all.
  ["  // person's name is worse than no chip at all — so nothing renders.\n",
   "    } catch (e) { return ''; }\n  }\n\n  // Same host discipline as the two strips above",
   "the identity chip's denominator"],
  // ── the letterhead chip's repaint (v140) ──────────────────────────────────
  // The chip listened for one event, tested `detail.pid` strictly, and dropped
  // its subscription the first time its host was not in the document — so it
  // could hold its first-paint read for the life of the page while the section
  // beside it showed a later one. That is the same drift from the other end. The
  // span is the binder only: it delegates to the contract carved above, and the
  // mount beside it is outside the seam and unchanged.
  ["  // so a cold letterhead carries no stray gap between its badges.\n",
   "  function compactBadgeMount(pid, p) {\n",
   "the letterhead chip's repaint"],
  // ── the ⚖️ section prints the same object (v140) ───────────────────────────
  // Four narrow spans rather than one wide one, so the section's own body — the
  // no-word stub, the verdict line, the tally, the buckets, the restore order —
  // stays pinned between them. First: the read acquisition, where the section
  // takes the owner's object off the scopedRead it is already holding rather than
  // scoring a second time.
  ["      // slice would not mean anything for.\n",
   "      // Nothing said and nothing tracked.",
   "the section reads the shared figure"],
  // Second: the number block stamps the tuple as data, so "the chip's N of M
  // equals the section's" is a claim a harness can CHECK rather than trust. The
  // visible caption is unchanged and the tag is still gated on `hasPct` alone.
  ["      var depthTag = hasPct\n",
   "      var body = '' +\n",
   "the section stamps the shared figure"],
  // Third and fourth: the head and the tail of the section's repaint. The body
  // between them — the open lids, the picked bucket, flat mode, the order they are
  // restored in — is outside the seam and byte-identical.
  ["      if (SP && typeof SP.applyLids === 'function') return SP.applyLids(html, true);\n    } catch (e) {}\n    return html;\n  }\n",
   "      try {\n        var fresh = headlineHtml(pid, p);\n",
   "the section's repaint"],
  ["        }, 0);\n      } catch (e) {}\n",
   "  // Mountable wrapper: emit the section AND arm its refresh.",
   "the section's repaint, closed"],
  // ── the hero ring's sub-line (v141) ───────────────────────────────────────
  // The profile's LOUDEST figure, and the last face still sizing itself by hand.
  // The ring is the first number a reader meets and its sub-line spelled the
  // section's fraction a fourth time out of its own coverage block, above the fold
  // and a full section away from the figure it has to agree with. It prints
  // figure()'s object now, taken off the scopedRead this read already holds.
  //
  // And the gate becomes the owner's `shows`, which is the chip's rule applied to
  // the ring: no percentage without the set that sizes it. On every read this
  // engine can take those are the same question — the publication floor needs
  // three tested items before pct is a number at all — so this changes no output;
  // asking the object means the ring FAILS CLOSED to its own waiting mark if that
  // ever stops being true, instead of publishing the biggest number on the page
  // over nothing.
  //
  // The span ends before the waiting ladder, which is outside it and pinned: the
  // below-floor sentence names the FLOOR ("2 of 3 tested needed"), not the tested
  // set, and folding that into the fraction would be a floor change wearing a
  // copy pass's clothes.
  ["      var c = r.coverage, v = r.verdict;\n",
   "      // One phrase for this wait, shared with the Voting Record Highlights",
   "the hero ring's sub-line"],
  // ── the issue file beside the pattern row (v133) ───────────────────────────
  // The brief's pattern rows are the third surface a reader meets an issue name
  // on, and the name was the one part of the row that led nowhere. The label
  // itself may not become the link here — on this row the label IS the dossier
  // button, and an <a> inside a <button> makes the parser close the button early
  // and drop the tally span, which is the defect scripts/test-row-tap-dossier.mjs
  // exists to catch — so the file is a small named sibling after the door, which
  // is the shape stance-tree.js already ships on its leaves. The address is asked
  // of pdx-issue-family.js; no path is spelled in this file, and without that
  // module the row renders no control rather than a link to a guess.
  ["      // The key, last and outside the door — see the wall above.\n      (door ? scopeControlHtml(key) : '') +\n",
   "  // THE KEY GLOSSARY IS A GUEST, NOT A DEPENDENCY.",
   "the issue file beside the pattern row"],
  ["  function shapeRowsHtml(rows, pid, mount) {\n    return (rows || []).map(function (x) { return shapeRowHtml(x, pid, mount); }).join('');\n  }\n",
   "  function shapeHeroHtml(pid, p) {\n",
   "the slice gate and its locked copy"],
  ["          '<p class=\"pdxwa-shape-depth\">' + depth + '</p>' +\n",
   "          '<button type=\"button\" class=\"pdxwa-shape-all\"'",
   "the letterhead's mount"],
  ["    var total = opts.total || sh.issues;\n",
   "        exploreAllHtml(total) +",
   "the brief's mount"],
  // ── the owner, published (v140) ───────────────────────────────────────────
  // Two lines on the public surface, so a harness can hold the object the chip
  // and the section print rather than infer it from two rendered strings that
  // happen to agree. It publishes no new arithmetic: figure() hands on read()'s
  // percentage and two of read()'s integers, and fractionOf() joins two integers
  // into one sentence.
  ["    DEPTH_NOTE: DEPTH_NOTE,\n",
   "    dots: dots,\n",
   "the owner, published"],
];

/**
 * Cut every seam out of `src`, in order.
 *
 * Returns { pinned, bodies } — `pinned` is everything OUTSIDE the seams (which
 * the caller hashes or compares), `bodies` are the spans themselves, in seam
 * order, for the caller to argue about.
 *
 * `must` is the caller's own fail-hard assertion, so a moved anchor stops the
 * suite where it stands instead of silently comparing the wrong bytes.
 */
export function carveSeams(src, seams, side, file, must) {
  let pinned = "", pos = 0;
  const bodies = [];
  for (const [a, b, why] of seams) {
    const i = src.indexOf(a, pos), j = src.indexOf(b, i < 0 ? 0 : i);
    must(i >= 0 && j > i, `${side}: the seam for ${why} no longer reads as written in ${file}`);
    must(src.split(a).length === 2 && src.split(b).length === 2,
      `${side}: a seam anchor for ${why} is no longer unique in ${file} — widen it, do not loosen it`);
    pinned += src.slice(pos, i + a.length);
    bodies.push(src.slice(i, j));
    pos = j;
  }
  return { pinned: pinned + src.slice(pos), bodies };
}

/**
 * INDEX A CARVED SET OF BODIES BY THE NAME ITS SEAM DECLARES, not by position.
 *
 * The seam lists are in file order, so a pass that legitimately lands a span in
 * the middle of one renumbers every span after it. The arguments below used to
 * read `bodies[2]` for the ledger's band table; the record-badge pass put two
 * spans above it, and position-indexed arguments would then have been silently
 * arguing about the wrong bytes — which is worse than a failure, because it
 * passes. Names do not move, so the arguments name them.
 *
 * WHICH LIST A BODY ARRAY CAME FROM IS NOW PASSED, NOT GUESSED. It used to be
 * inferred from the array's LENGTH, on the grounds that the three lists were
 * distinct lengths — and the previous note here said, in as many words, that a
 * pass which broke that should hand the list over rather than loosen the lookup.
 * The issue-file doors pass (v133) broke it: three new spans above the _DOS_MECH
 * literal and nine below left both halves the same length. So the caller says
 * which list it carved with, and a mismatched length is a failure instead of a
 * silent re-index. Only two callers exist and both already know the answer:
 * assertConsistencySeams was handed the upper half whenever it was also handed a
 * lower half, and the whole file otherwise.
 */
function byWhy(bodies, api, list) {
  const n = (bodies || []).length;
  api.ok(!!list && n === list.length,
    `consistency.js was carved into ${n} spans and argued against a list of ` +
    `${(list || []).length} — a seam was added to scripts/v103-chrome-seams.mjs and not to the caller`);
  const m = new Map();
  (bodies || []).forEach((b, k) => { if (list && list[k]) m.set(list[k][2], b); });
  return (why) => {
    api.ok(m.has(why), `the seam named "${why}" is not among the spans this suite carved out of consistency.js`);
    return m.get(why) || "";
  };
}

/**
 * Argue what is inside consistency.js's spans. `api` supplies the caller's own
 * has/ok assertions so the failures read in the caller's voice.
 */
export function assertConsistencySeams(bodies, api, below) {
  const { has, ok } = api;
  // A caller that hands over a lower half carved this file in two at the literal,
  // so what it has here is the upper list; a caller that does not carved it whole.
  const cut = byWhy(bodies, api, below ? CJ_SEAMS : CJ_SEAMS_ALL);
  const strip = (t) => t.replace(/^\s*\/\/.*$/gm, "").replace(/'[^']*'/g, "''");
  const flat = (t) => strip(t).split("\n").map((l) => l.trim()).filter(Boolean).join(" ");

  // ── the official-record empty copy (v103) ──────────────────────────────────
  // seam A: the copy table names the missing WORD, not missing votes.
  const scopes = cut("the official scope's empty wording");
  has(scopes, "no_stance: 'No stated position to test'",
    "the official scope's no_stance copy no longer names the missing stated position");
  has(scopes, "no_record: 'No qualifying votes on record yet'",
    "the issue-level no_record wording moved — a stated position with no vote mapped to it IS a missing vote");
  ok(!/\d\s*%/.test(scopes), "a percentage appeared in the scope copy table");
  // seam B: an empty key list is not an empty voting record.
  const rollup = cut("the roll-up's empty-key token").replace(/^\s*\/\/.*$/gm, "");
  has(rollup, "!keys.length", "the roll-up no longer distinguishes an empty key list from an empty record");
  has(rollup, "recordsWarm(pid)",
    "…and it decides that on something other than whether the record lane has answered");
  has(rollup, "token = 'no_stance'", "…so the empty roll-up still borrows the wording of missing votes");
  has(rollup, "token = 'pending'; queueWarm(pid)",
    "…and an unread lane no longer says it is loading, or no longer asks for the read");
  ok(!/MIN_|FLOOR|floor|publishable|score|Math\.round/.test(rollup),
    "the empty-roll-up seam reads a floor, a score or a weight — it chooses one word for one empty case");

  // ── seams C-G: the ledger reads the index; it does not read the record ──────
  // Everything below is decidable from the WORKING COPY alone, which is all a
  // wave suite hands over. The stronger check on seam D — that the extracted
  // builder is HEAD's loop body reconstructed line for line, not a
  // characterisation quietly rewritten while being moved — needs both sides, so
  // it lives in scripts/test-person-crawl-block.mjs, which owns the "the engines
  // did not move" doctrine and already holds both.
  const bands = cut("the ledger's band table"), loop = cut("the loop that now calls it");
  const rowFn = cut("the extracted single-row builder");
  // The band table is a table: five names, fixed order, and the folded tail is
  // exactly the two the reader is owed separately.
  ok([...bands.matchAll(/^\s*\{ id: '([a-z]+)'/gm)].map((m) => m[1]).join(",") === "advanced,against,both,thin,none",
    "the ledger's bands are not the five names the formal brief already uses, in clearest-first order");
  ok([...bands.matchAll(/tail: (true|false)/g)].map((m) => m[1]).join(",") === "false,false,false,true,true",
    "the folded tail is no longer exactly the thin and no-side bands");
  // …and the decision over it reads two fields of a row this file already built.
  const fnBand = strip(bands.slice(bands.indexOf("function _fpiLedgerBand")));
  ok([...new Set([...fnBand.matchAll(/\bx\.([A-Za-z]+)/g)].map((m) => m[1]))].sort().join(",") === "tier,tone",
    "the band decision reads a field of the row other than tier and tone — that is a second characterisation");
  ok(!/MIN_|FLOOR|floor|publishable|score|weight|Math\.|party|stance/.test(fnBand),
    "the band decision reads a floor, a weight, a score, a party or a stated position");
  // The loop is now a call, and nothing else.
  ok(strip(loop).split("\n").map((l) => l.trim()).filter(Boolean).join(" ") ===
    "(issueRows(pid) || []).forEach(function (r) { var x = _fpiRowFor(r); if (x) out.push(x); });",
    "the rows loop does something other than call the extracted builder and keep what it returns");
  // The extracted builder still fails closed on a row with nothing formal on file.
  has(rowFn, "if (!t && !refused && held <= 0) return null;",
    "the extracted single-row builder no longer fails closed on a row with no formal signal");
  has(rowFn, "function _fpiRowFor(r) {",
    "the extracted single-row builder is not where the seam says it is");

  // ── seams H1-H4: the record badge, on a card that is not this file's ───────
  // H1. THE TWO TOKENS, NAMED. The lane word is two words and the fill rule is
  // the one documented over _ST_PAT_QUIET: only the two strong weights take their
  // tone's fill. Both are lifted out of _stPatternHtml unchanged, which the chip's
  // own seam then proves by reading them back.
  const paint = cut("the badge's lane word and its fill rule, named");
  has(paint, "var _ST_PAT_LANE = '🏛 Record';", "the badge's lane word is not the two words the chip prints");
  has(paint, "function _stPatPaint(t) {", "the badge's fill rule is not where the seam says it is");
  ok(flat(paint.slice(paint.indexOf("function _stPatPaint"))) ===
    "function _stPatPaint(t) { var tone = _ST_PAT_TONE[(t && t.tone) || ''] || _ST_PAT_TONE.muted; " +
    "var bg = (t && t.weight === '') ? tone.full : (t && t.weight === '') ? tone.strong : _ST_PAT_QUIET; " +
    "return { c: tone.c, bg: bg, lane: _ST_PAT_LANE }; }",
    "the extracted fill rule is not the three lines the chip used to spell inline — the rule about which " +
    "tiers get a fill was rewritten on the way out");
  ok([...new Set([...paint.matchAll(/\bt\.([A-Za-z]+)/g)].map((m) => m[1]))].sort().join(",") === "tone,weight",
    "the fill rule reads a field of the tier other than its tone and its weight — that is a second characterisation");
  ok(!/MIN_|FLOOR|floor|publishable|score|Math\.|party|\d\s*%/.test(strip(paint)),
    "the badge's paint reads a floor, a weight rule of its own, a score, a party or a percentage");
  // H2. AND THE CHIP READS THEM. Two lines where the table lookup and the fill
  // ladder were, and no colour spelled at the mount.
  const chip = cut("the chip reading that fill instead of spelling it");
  ok(flat(chip.slice(chip.indexOf("if (!t) return"))) === "if (!t) return ''; var tone = _stPatPaint(t); var bg = tone.bg;",
    "the badge chip does something other than read its paint from the one named rule");
  ok(!/#[0-9a-fA-F]{3}|rgba?\(/.test(chip), "the badge chip spells a colour at its mount — the table is one table");
  // H3. THE STANDOUT ROW carries the tier's weight and its two-sided phrase, so a
  // caller rendering the badge itself paints it the same way and a Split row that
  // withheld its margin still prints the counts sitting one field away. `counts`
  // itself is not touched, and nothing selects on either field.
  const so = cut("the standout row's weight and two-sided phrase");
  has(so, "patLabel: x.patLabel, counts: x.counts,",
    "the standout row stopped publishing the label and the counts it always published");
  has(so, "weight: (x.pat && x.pat.weight)", "the standout row does not carry the tier's own weight");
  has(so, "sideCounts:", "…or the two-sided phrase, so a Split row prints the bare word with the numbers one field away");
  has(so, "window._recordSidePhrase", "…and the phrase is composed at the row rather than read off the engine");
  ok(!/MIN_|FLOOR|floor|publishable|score|Math\.|party|\.sort\(|\.filter\(/.test(strip(so)),
    "the standout row's added fields read a floor or a score, or something now sorts and filters on them");
  // H4. THE EXEC ROW carries its DISPLAY tier beside the verdict word it always
  // printed. The verdict fields are unchanged and in the same order; six fields
  // were appended after them and nothing else moved.
  const xs = cut("the exec row's display tier, beside its verdict word");
  ok([...strip(xs).matchAll(/\b([a-z][A-Za-z]*): /g)].map((m) => m[1]).join(",") ===
    "pid,key,label,token,word,acts,advances,opposes,minority,standing,contested,tier,weight,tone,patLabel,counts,sideCounts",
    "the exec row's fields are not the eleven it always published followed by the six the badge needs — " +
    "something in the verdict half moved, or a field was added that is not the display read");
  has(xs, "_stDisplayTier(_xsSpineRow(p.pid, r).row, _XS_SCOPE)",
    "the exec row's tier is not the same read _xsShape() makes on the same spine row in the same scope — " +
    "two reads of one record on one page is the second characterisation this pass was forbidden");
  has(xs, "if (t && t.tier === 'none') t = null;",
    "a display tier that declines no longer declines — the card would print a badge for a row with no side read");
  has(xs, "var p = _xsPick(pid);", "the exec pick moved — the badge is added beside the pick, not instead of it");
  ok(!/MIN_|FLOOR|publishable|score|Math\.|party|\/\s*100|\*\s*100|\d\s*%/.test(strip(xs)),
    "the exec row's added fields read a floor, a score, a party or arithmetic of their own");
  ok(!/\.sort\(|\.filter\(|\.slice\(0,/.test(strip(xs).slice(strip(xs).indexOf("tier:"))),
    "the exec pick now sorts, filters or caps on the display tier — the pick above it is unchanged");

  // ── seams I1-I3: the dossier's title is a door, and the ⓘ is the other ────
  // I1/I2 are paint. What the paint may not do is invent a state: the link wears
  // the colour and the face the inert title already had, and the summary line is
  // recessed a step below it rather than given a second title's weight.
  const titlePaint = cut("the title row's paint, and the link's");
  has(titlePaint, ".pdxgap-titlerow{display:flex", "the title and its ⓘ no longer share one line");
  has(titlePaint, "a.pdxgap-title{text-decoration:none", "the title link is painted as something other than the title it replaced");
  const whyPaint = cut("the one-measure summary line's paint");
  has(whyPaint, ".pdxgap-drv-w{flex:1 0 100%", "the one-measure summary line has no paint of its own");
  for (const t of [titlePaint, whyPaint])
    ok(!/\d\s*%|toFixed|Math\.|party/i.test(strip(t)), "a paint span carries a figure, arithmetic or a party term");
  // I3. THE TWO DOORS. Both destinations are ASKED FOR rather than spelled: the
  // address comes from pdx-issue-family.js, which owns it, and the scope prose from
  // issue-scope.js, which refuses to invent a boundary that is not on file. Both
  // fail closed — a document served without either module keeps the inert <div>
  // this sheet has always had, which is why neither is a dependency.
  const doors = cut("the title door and the ⓘ beside it");
  has(doors, "function _issueTitleHtml(key, lbl, attr) {", "the title door is not where the seam says it is");
  has(doors, "F.profileUrl(key)", "the dossier composes the issue address instead of asking the module that owns it");
  has(doors, "S.controlHtml(key)", "the ⓘ is not issue-scope.js's own control");
  has(doors, "'<div' + attr + '>' + esc(lbl) + '</div>'",
    "the title no longer falls back to the inert heading when the family module is absent");
  ok(!/'\/i\//.test(strip(doors)), "the dossier spells the issue-file prefix inline");
  ok(!/MIN_|FLOOR|floor|publishable|score|weight|Math\.|party|\d\s*%/.test(strip(doors)),
    "the title door reads a floor, a weight, a score, a party or a percentage");
  ok(doors.split("'<a ").length === 2 && doors.indexOf("<button") < 0,
    "the title door emits more than one anchor, or a button inside it — the ⓘ is issue-scope.js's " +
    "own sibling control and this span may not grow a second interactive element of its own");

  // ── seams K1-K7: the measure identity is a door onto the bill file (v138) ──
  // Three spans of paint and four of precedence. What none of them may do is
  // decide anything: the destination is a number and a sitting handed to
  // bill-detail.js, which owns the one bill panel, so no span here spells an
  // address, reads a roll, a mapping, a floor, a weight, a party or a member.
  const proofPaint = cut("the proof line's number, marked as its own door");
  has(proofPaint, ".pdxor-proof-bill[data-pdxbill-open]{cursor:pointer",
    "the proof line's number is not marked as a door where it is one");
  ok(!/\.pdxor-proof-bill\{[^}]*cursor:pointer/.test(proofPaint),
    "the unconditional rule dressed every proof-line number as a control — a line whose measure has no " +
    "number would then look like a door onto nothing");
  const doorPaint = cut("the measure door's paint, and the refusal note's");
  has(doorPaint, ".pdxbill-door{background:none;border:0;padding:0;margin:0;font:inherit;color:inherit;",
    "the door's reset no longer inherits the type of the slot it lands in");
  ok(!/\.pdxbill-door\{[^}]*font-(size|weight):/.test(doorPaint),
    "the door's reset spells a size or a weight of its own — the slot rules own the type of their own text, " +
    "and a number that changed face on becoming a door is a restyle wearing a feature's clothes");
  has(doorPaint, ".pdxbill-door:focus-visible{outline:2px solid #7fb4ff",
    "the door has no focus ring, so the keyboard cannot see where it is");
  has(doorPaint, ".pdxbill-nofile{display:inline-block",
    "the honest refusal has no paint, so it would print unstyled beside the number it explains");
  const ring = cut("the focus ring, moved onto the two controls");
  has(ring, ".pdxgap-drv-id:focus-visible,.pdxgap-drv-go:focus-visible{outline:2px solid #7fb4ff",
    "the roll-up's two controls have no focus ring between them");
  ok(!/\.pdxgap-drv-r\.is-door:focus-visible/.test(ring),
    "the ring is drawn on the row again — the row is a pointer target that never takes focus, so a ring " +
    "there is a ring the keyboard cannot reach");
  // K4/K5. THE INNERMOST DOOR IS TESTED FIRST, which is the whole mechanism: a
  // delegated closest() walks OUTWARD, so the branch tested first is the one that
  // answers a tap on the number inside a row that is itself a door.
  const first = cut("the bill branch, first in the click gateway");
  has(first, "var bopen = e.target.closest && e.target.closest('[data-pdxbill-open]');",
    "the click gateway no longer looks for a bill door first");
  has(first, "_billOpen(bopen);", "…or no longer opens the bill when it finds one");
  has(first, "e.preventDefault();", "…or lets the document's own default run underneath the panel it just opened");
  ok(!/data-pdxdos-i|data-pdxdrv-open/.test(first),
    "the bill branch absorbed the card mount or the row's own door — those branches are outside this span " +
    "and still pinned");
  const wasLast = cut("where that branch used to sit, last");
  ok(!/data-pdxbill-open/.test(wasLast),
    "the bill door is still tested after the roll-up row's door as well — a door tested outward-last never " +
    "wins the tap, which is the bug this pass exists to fix");
  const kb = cut("the same precedence on the keyboard");
  has(kb, "e.target.closest('[data-pdxbill-open]')", "Enter and Space no longer reach the bill door at all");
  has(kb, "if (kbt !== 'button' && kbt !== 'a') { e.preventDefault(); _billOpen(kb); }",
    "the keyboard branch lost the guard that keeps a real <button> from opening the same panel twice — the " +
    "browser already delivers Enter and Space to a button AS a click");
  const proofDoor = cut("the proof line's number, as the door");
  has(proofDoor, "_billDoorAttrs(b.bill, _dosSittingKey(p.item), b.bill)",
    "the proof line assembles a bill address by hand instead of asking the one emitter for it");
  has(proofDoor, "b.isPosition ? ''",
    "a stated position now offers a bill door — a position is not cast on an instrument this door could open");
  ok(!/role=|tabindex/.test(proofDoor),
    "the proof line's number took a focus stop, which competes with the expand control of the <summary> it " +
    "sits inside — the dossier card's real buttons are how the keyboard reaches the same file");
  ok(!/<a\b|<button\b/.test(proofDoor), "the proof line grew an interactive element inside a <summary>");
  for (const t of [proofPaint, doorPaint, ring, first, wasLast, kb, proofDoor])
    ok(!/MIN_|FLOOR|floor|publishable|score|weight:|Math\.|party|\d\s*%/.test(strip(t)),
      "a bill-door span reads a floor, a weight, a score, a party or a percentage");

  // And the export spans, wherever the caller cut them from.
  ok(!below || below.length === CJ_SEAMS_BELOW.length,
    `the lower half of consistency.js was carved into ${(below || []).length} spans, which is not ` +
    "CJ_SEAMS_BELOW — a seam was added to the module and not to the caller");
  assertConsistencyExportSeams(below || CJ_SEAMS_BELOW.map(([, , why]) => cut(why)), api);
}

/**
 * Argue what is inside consistency.js's export spans. Separate because they sit
 * below the _DOS_MECH literal, and the suites that cut this file in half at that
 * literal hand over the two halves' bodies as two arrays.
 */
export function assertConsistencyExportSeams(bodies, api) {
  const { ok } = api;
  const has = api.has || ((x, n, m) => ok(String(x).includes(n), `${m} — missing ${JSON.stringify(n)}`));
  const strip = (t) => t.replace(/^\s*\/\/.*$/gm, "").replace(/'[^']*'/g, "''");
  const cut = byWhy(bodies, api, CJ_SEAMS_BELOW);
  const badge = cut("the badge's two exported tokens");
  const expA = cut("the single-row and band exports"), expB = cut("the exported fold length");
  // The badge's tokens, beside the tier read they belong with. Two names.
  ok([...badge.matchAll(/^\s*([A-Za-z_]+):/gm)].map((m) => m[1]).join(",") === "TONE,LANE,paint",
    "the record-pattern export gained a name other than the badge's lane word and its paint");
  ok([...expA.matchAll(/^\s*([A-Za-z_]+):/gm)].map((m) => m[1]).join(",") ===
    "formalPatternIndex,rows,rowFor,band,LEDGER_BANDS",
    "the formal-pattern index gained an export other than the single row and its band");
  ok([...expB.matchAll(/^\s*([A-Za-z_]+):/gm)].map((m) => m[1]).join(",") === "shape,TOPS_CAP,SPLITS_CAP,TAIL_MIN",
    "the second export span moved something other than the fold length");
  for (const t of [badge, expA, expB])
    ok(!/function|=>|Math\.|MIN_|FLOOR/.test(strip(t)),
      "an export line carries logic — these are references to what the file already holds");

  // ── the one-measure roll-up (v133), nine spans in the same lower half ──────
  // J1. THE BOUNDARY. Boundaries only: no token is rewritten anywhere in the span,
  // which is checkable — nothing in it calls .replace() — and that is exactly what
  // lets the card print a clip and still promise the words are the curator's.
  const bound = cut("the bill-aware sentence boundary");
  has(bound, "var _DOS_ABBR = {", "the abbreviation list the splitter turns on is gone");
  has(bound, "function _dosSentences(text) {", "the sentence boundary is not where the seam says it is");
  has(bound, "!_dosIsAbbr(t.slice(start, i))", "a full stop closes a sentence again without asking what it ended");
  has(bound, "return m.slice(0, n).join('').trim();", "the clip stopped rebuilding the curator's own bytes");
  ok(!/\.replace\(/.test(strip(bound)), "the splitter rewrites a token — it decides boundaries and nothing else");
  ok(!/MIN_|FLOOR|score|weight|party/.test(strip(bound)), "the splitter reads a floor, a score, a weight or a party");
  // J2/J3. The singular heading, and the field the sentence is read from — which is
  // the mapping's own `rationale`, carried and never rewritten.
  has(cut("the singular heading, as a constant"), "var _DOS_DRV_H1 = 'Which measure this came from';",
    "the singular heading is not the plural one with the 's' taken off");
  const field = cut("the group's rationale field");
  has(field, "why: String((dItem && dItem.rationale) || '').trim(),",
    "the roll-up group reads its sentence from something other than the mapping's rationale");
  // carveSeams hands the body back WITH its opening anchor, which is the line the
  // group's counters are declared on — hence "n" ahead of the one added field.
  ok([...strip(field).matchAll(/^\s*([a-z][A-Za-z]*):/gm)].map((m) => m[1]).join(",") === "n,why",
    "the roll-up group gained a field other than the curator's sentence");
  // J4. THE GATE. One row is enough now; nothing else about which rows exist moved.
  const gate = cut("the one-measure gate");
  has(gate, "if (!d || !d.rows.length) return '';", "the roll-up no longer renders for a record with exactly one measure");
  has(gate, "var solo = d.items === 1 && d.docs === 1;", "the one-measure case is decided on something other than the two counts");
  ok(!/MIN_|FLOOR|floor|publishable|score|weight|Math\.|party|\.sort\(/.test(strip(gate)),
    "the gate reads a floor, a score, a weight, a party, or reorders the rows");
  // J5. THE SIDE, IN WORDS. The same four states the tallies below spell, and no
  // fifth — a word here is the tally's word with the leading "1 " taken off.
  const side = cut("the side said in words, not counted");
  const sideCode = side.replace(/^\s*\/\/.*$/gm, "");
  ok([...sideCode.matchAll(/'([^']+)'/g)].map((m) => m[1]).join("|") === "not scorable|advanced|against|took no side",
    "the one-measure row states a side outside the four words the tallies already use");
  ok(!/\d/.test(strip(side)), "the side is stated as a number again");
  // J6/J7. THE SENTENCE. One sentence, clipped on a word boundary at a fixed
  // budget, printed in its own span. Nothing composes prose: what reaches the card
  // is always a prefix of the string on the mapping row, and the ellipsis says so.
  const clip = cut("the clipped rationale, and its budget");
  has(clip, "_dosClipSentences(g.why, 1)", "the summary line is no longer one clipped sentence of the curator's own");
  has(clip, "why.slice(0, 220).replace(/\\s+\\S*$/, '') + '…'", "the length budget or its word boundary moved");
  ok(!/toFixed|Math\.|MIN_|FLOOR|score|party/.test(strip(clip)), "the clip grew arithmetic, a floor, a score or a party");
  const span = cut("the rationale's own span on the row");
  has(span, 'class="pdxgap-drv-w"', "the clipped sentence has no span of its own on the row");
  ok(!/<a\b|<button\b/.test(span), "the roll-up row nested an anchor or a button inside its door");
  // J8/J9. The heading picked by the count, and the title mounted once.
  has(cut("the heading chosen by the count"), "esc(d.docs === 1 ? _DOS_DRV_H1 : _DOS_DRV_H)",
    "the roll-up picks its heading on something other than how many measures it holds");
  const mount = cut("the dossier title's mount");
  has(mount, "_issueTitleHtml(issueKey, lbl, _titleAttr)", "the dossier header mounts something other than the title door");
  ok(mount.split("_issueTitleHtml").length === 2, "the dossier header mounts the title door more than once");

  // ── seams L1-L7: the lower half of the bill door (v138) ───────────────────
  // L1. ONE OWNER OF THE SITTING. Published, not copied: the issue desk asks this
  // rather than keeping its own precedence, which is the only thing that stops one
  // printed number from opening two different sessions on two surfaces.
  const sit = cut("one owner of which sitting a number is in");
  has(sit, "window.pdxBillSit = function (item) {", "the sitting reader is not published under the one name");
  has(sit, "return _dosSittingKey(item);",
    "the published reader re-implements the precedence instead of delegating to the function that owns it");
  ok(!/utahSession|externalIds/.test(sit),
    "the record's sitting reader reaches for the bills-index spelling of the field — two shapes, two owners, " +
    "and this one owns the record's");
  // L2/L3. THE CARD'S TWO SLOTS. Both call the one emitter, both keep their class,
  // and the title keeps the condition that suppressed it when it only repeated the
  // identity — the door did not become a reason to print a title twice.
  const cardNum = cut("the card's number, as the door");
  has(cardNum, "_billDoor('pdxdos-rec-id', d.billNum, d.billSit, d.ident, esc(d.ident))",
    "the card's number is not the one emitter's door, or it no longer carries the pair the panel needs");
  ok(!/'<span class="pdxdos-rec-id">'/.test(cardNum), "the card's number is an inert span again");
  const cardTtl = cut("the card's title, as the same door");
  has(cardTtl, "_billDoor('pdxdos-rec-ttl', d.billNum, d.billSit, d.ident, esc(_faceTtl))",
    "the card's title is not the same door as its number");
  has(cardTtl, "(_faceTtl ?",
    "the title lost the condition that skips it when it would only repeat the identity");
  // L4. THE EMITTER, AND THE REFUSAL. One place writes the attributes; no number
  // means no door; and a number with no bill page behind it is said on the control
  // itself rather than answered with an index, a homepage or silence.
  const emit = cut("the door emitter, and the honest refusal");
  const emitCode = emit.replace(/^\s*\/\/.*$/gm, "");
  has(emit, "function _billDoor(cls, num, sit, ident, inner) {", "the door emitter is not where the seam says it is");
  has(emit, "function _billDoorAttrs(num, sit, ident) {", "…or the attributes are not written in one place");
  has(emit, "if (!n) return '';",
    "a measure with no number is dressed as a door — its identity IS its headline, and there is no file to promise");
  has(emit, "var _BILL_NOFILE = 'No bill page on file';", "the refusal has no words of its own");
  has(emit, "el.setAttribute('aria-disabled', 'true');", "the refused control does not say it is refused");
  has(emit, "if (el.querySelector && el.querySelector('.pdxbill-nofile')) return;",
    "the refusal is appended again on every tap — one control, one note");
  has(emit, "B.open(num, sit) !== false",
    "the emitter decides for itself whether a bill file exists instead of letting the panel that owns bills answer");
  ok(!/location\.|\.href|window\.open|pdxOpenBills/.test(emitCode),
    "a bill door navigates or dumps an index — a missing bill page is said on the control, not answered with " +
    "a different screen");
  ok(!/'#bill\/|'\/b\//.test(emitCode),
    "the emitter spells an address shape of its own — share-links.js owns the hash and the shareable path, " +
    "and a second spelling is a second address for one bill");
  // L5. THE GROUP'S ADDRESS, off the item its own explainer opens. Two fields, and
  // nothing selects, sorts or counts on either.
  const groupAddr = cut("the group's own address");
  has(groupAddr, "num: String((dItem && dItem.billNum) || '').trim(),",
    "the roll-up group carries no measure number, so its identity could not be a door");
  has(groupAddr, "sit: String((dItem && dItem.billSit) || '').trim()",
    "…or carries a number with no sitting, which is not an address");
  ok([...strip(groupAddr).matchAll(/^\s*([a-z][A-Za-z]*):/gm)].map((m) => m[1]).join(",") === "idx,num,sit",
    "the roll-up group gained a field other than the measure's own address");
  // L6/L7. THE ROW THAT CANNOT HOLD A BUTTON. The identity and the arrow are the
  // two controls; the row keeps its door attribute and gives up its own role, and
  // no <a> or <button> appears anywhere in the line.
  const rollId = cut("the roll-up identity, and where the row's name went");
  has(rollId, "var idAt = _billDoorAttrs(g.num, g.sit, g.ident);",
    "the roll-up identity does not ask the one emitter for its door");
  has(rollId, 'class="pdxgap-drv-id pdxbill-door" role="button" tabindex="0"',
    "the roll-up identity is not reachable as a control of its own");
  has(rollId, ': \'<span class="pdxgap-drv-id">\' + esc(g.ident) + \'</span>\')',
    "a group with no number no longer falls back to plain text — it would promise a file nobody claimed");
  // Comment-stripped, because the span's own note SAYS "no <a> and no <button>"
  // — the doctrine is written next to the markup it constrains, and a sweep that
  // read the note would fail on the sentence explaining why it cannot fail.
  const rollIdCode = rollId.replace(/^\s*\/\/.*$/gm, "");
  ok(!/<a\b|<button\b/.test(rollIdCode),
    "the roll-up row nested an anchor or a button inside its door — the parser closes the outer element on " +
    "the inner start tag and drops every span after it out of the row");
  const doorAttr = rollIdCode.slice(rollIdCode.indexOf("var door ="), rollIdCode.indexOf("var idAt"));
  ok(!/role=|tabindex/.test(doorAttr),
    "the row announces itself as a control again while holding two destinations — one of the two would be " +
    "the lie a screen reader repeats");
  const goStop = cut("the explainer's own focus stop");
  has(goStop, '\'<span class="pdxgap-drv-go" role="button" tabindex="0"\'',
    "the explainer has no focus stop of its own, so the keyboard could reach the bill file and not the reading");
  has(goStop, '\'<span aria-hidden="true">→</span></span>\'',
    "the arrow is announced as text beside the name it duplicates");
  ok(!/<a\b|<button\b/.test(goStop), "the row's second control is an anchor or a button, nested in the row's door");
  for (const t of [sit, cardNum, cardTtl, emit, groupAddr, rollId, goStop])
    ok(!/MIN_|FLOOR|floor|publishable|score|Math\.|party|\d\s*%/.test(strip(t)),
      "a bill-door span in the lower half reads a floor, a score, a party or a percentage");
}

/**
 * Argue what is inside issue-colors.js's two spans (v111).
 *
 * The helper composes; it does not decide. `isCore()` still says which keys are
 * coloured and `styleFor()` still says with what, both unchanged and both still
 * exported on their own — so a surface that was reading them by hand reads the
 * same two answers through one name, and the table stays the only table.
 */
export function assertIssueColorsSeams(bodies, api) {
  const { has, ok } = api;
  const body = (bodies && bodies[0]) || "", exp = (bodies && bodies[1]) || "";
  has(body, "function skin(coreOrIssueKey, coreLookup) {", "the shared chip helper is not where the seam says it is");
  has(body, "isCore(coreOrIssueKey, coreLookup)", "the helper decides whether a key is coloured on something other than isCore()");
  has(body, "styleFor(coreOrIssueKey, coreLookup)", "…or reads its custom properties from something other than styleFor()");
  has(body, "return { on: false, style: '', attr: '' };",
    "the helper no longer fails closed on a key the table does not map — an unmapped key would be painted");
  has(body, "data-ic=", "the helper stopped emitting the attribute the card's CSS hooks on");
  // No colour, no keyword, no taxonomy of its own: the composition is three lines.
  // Comments come out first — the prose over it NAMES the table it does not touch,
  // which is the half a reader needs and the half a regex would trip on.
  const code = body.replace(/^\s*\/\/.*$/gm, "");
  ok(!/#[0-9a-fA-F]{3}|rgba?\(|hsl\(/.test(code),
    "the shared chip helper spells a colour — this file has exactly one colour table and this is not it");
  ok(!/ISSUE_|CORE_|_MAP\b|keywords|\bparty\b|score|Math\./.test(code),
    "the shared chip helper reaches into a table or a taxonomy instead of composing the two published reads");
  // And the export is a name beside the two it is composed from.
  ok([...exp.matchAll(/^\s*([A-Za-z_]+):/gm)].map((m) => m[1]).join(",") === "styleFor,skin",
    "the export span moved something other than the chip helper's own name");
  ok(!/function|=>/.test(exp), "the export line carries logic");
}

/** Argue what is inside stance-helpers.js's one span. */
export function assertStanceHelpersSeam(bodies, api) {
  const { has, ok } = api;
  const body = bodies[0];
  // Seam 2 · the topic chip names the key it holds and opens that key's record.
  // Comments come out first, as everywhere else in this file: the prose over the
  // chip NAMES what it stopped doing — the ranked overlay, the family label it
  // used to print — and that is the half a reader needs and the half a regex
  // would trip on. What is argued below is the code.
  const chip = bodies[1] === undefined ? undefined : bodies[1].replace(/^\s*\/\/.*$/gm, "");
  if (chip !== undefined) {
    has(chip, "window.pdxDoor1Issue('", "the topic chip no longer opens its key on the desk's one issue door");
    has(chip, "window.location.href='/i/", "…and has no address to fall back on when the desk has not booted");
    ok(chip.indexOf("PDXIssueView") === -1,
      "the topic chip reaches the ranked consistency overlay again — a chip on a person must not open a " +
      "league table of persons");
    has(chip, "IM[key].label",
      "the chip prints something other than the key's own label — a parent's name standing in for a child's " +
      "is the substitution that named a family and opened a ranking");
    ok(chip.indexOf("Where all stand") === -1, "the chip promises where everyone stands again");
    ok(!/%|\b(Republican|Democrat|GOP)\b/i.test(chip),
      "the topic-chip seam gained a percentage or a party — it carries a label and a destination");
  }
  has(body, "formalActs:", "the record-CTA stats no longer report the act count");
  has(body, "formalRead:", "…or whether the record lane has answered at all");
  has(body, "FPI2.shape(id)", "…and no longer read the act count out of the index's own shape");
  has(body, "PF.crawlRecord(id)", "…nor fall back to the rows the edge already printed on the page");
  has(body, "VR.memberRecords(id)", "…nor ask the record lane whether it has answered");
  ok(!/MIN_CITED|publishable|PublicationFloor/.test(body),
    "the record-CTA stats reach for the publication floor — the floor is not what a mid-page label reads");
  ok(!/%|\b(Republican|Democrat|GOP|party)\b/i.test(body),
    "the record-CTA stats gained a percentage or a party — they count rows and answer yes/no");
}

/** Argue what is inside word-action.js's declared spans. */
export function assertWordActionSeams(bodies, api) {
  const { has, eq, ok } = api;
  // BY NAME, FOR THE REASON CONSISTENCY.JS'S SPANS ARE. This read bodies[0..2]
  // until the issue-file doors pass (v133) landed a fourth span ABOVE all three of
  // them — the seam lists are in file order, so positional arguments would have
  // silently begun arguing about the wrong bytes, which passes instead of failing.
  const byName = new Map();
  bodies.forEach((b, k) => { if (WA_SEAMS[k]) byName.set(WA_SEAMS[k][2], b); });
  ok(bodies.length === WA_SEAMS.length,
    `word-action.js was carved into ${bodies.length} spans and argued against ${WA_SEAMS.length} — ` +
    "a seam was added to scripts/v103-chrome-seams.mjs and not to the caller");
  const wa = (why) => {
    ok(byName.has(why), `the seam named "${why}" is not among the spans this suite carved out of word-action.js`);
    return byName.get(why) || "";
  };

  // ── the shared figure and the shared repaint (v140) ────────────────
  // ONE OWNER for { pct, tested, eligible, token }, and one repaint contract, so
  // the two surfaces can be neither different arithmetic nor different ages.
  const own = wa("the shared figure and the shared repaint");
  has(own, "function figure(pid, p, pre) {",
    "the owner of the tested set is gone from word-action.js, so each surface sizes its own figure again");
  has(own, "var sr = pre || scopedRead(pid, p);",
    "the owner takes a read other than the one the section and the ring take — a bare read() at " +
    "whatever term scope the engine was left in is how one page comes to hold two numbers with " +
    "nothing on screen saying which is which");
  has(own, "function fractionOf(tested, eligible) {",
    "the one fraction sentence has no single builder, so every surface spells it again");
  has(own, "return (t && m) ? (t + ' of ' + m + ' tested') : '';",
    "the fraction is not the ⚖ section's own wording, character for character, or it prints " +
    "\"0 of 0 tested\" — a fraction that sizes nothing is worse than no fraction at all");
  has(own, "shows: pct !== null && !!fraction,",
    "the object no longer says when BOTH halves can be said. A percentage with no set to size it is " +
    "the grade the denominator was added to stop printing, and a surface that falls back to it is " +
    "publishing a smaller, secret set with a figure still sitting on top of it");
  has(own, "stamp: [(pct === null ? '' : pct), tested, eligible, ((r && r.token) || '')].join('|')",
    "the tuple is no longer stampable, so a surface can only be TRUSTED to print the object rather " +
    "than asserted to");
  has(own, "return (typeof HERO_REPAINT !== 'undefined' && HERO_REPAINT && HERO_REPAINT.length)",
    "the shared repaint spells its own event list instead of reading HERO_REPAINT — a second list is " +
    "a list that drifts, and the surface left on the older one goes quietly deaf");
  has(own, "if (!evForPid(ev, pid)) return;",
    "the shared repaint matches the pid strictly again, which drops the repaint on exactly the " +
    "members whose record was hardest to find");
  has(own, "if (seen) evs.forEach(function (n) { window.removeEventListener(n, handler); });",
    "the shared repaint unbinds before its host has ever been seen — permanent deafness on a mount " +
    "armed beside a template string the caller is still assembling");
  has(own, "setTimeout(function () { handler(null); }, 0);",
    "the shared repaint has no reconciling paint, so a record already in memory repaints nobody");
  const ownCode = own.replace(/^\s*\/\/.*$/gm, "").replace(/'[^']*'/g, "''");
  ok(!/toFixed|\/\s*100|\*\s*100|reduce\(|Math\.(max|min)/.test(ownCode),
    "the owner grew arithmetic of its own — it hands on read()'s percentage and two of read()'s " +
    "integers and computes no figure");
  ok(!/MIN_|FLOOR|publishable|PublicationFloor|SHAPE_MIN/.test(ownCode),
    "the owner tests a floor. The publication floor is read()'s, it is outside this seam, and a " +
    "second one here would hide a thin figure instead of labelling it");
  ok(!/\.sort\(|localeCompare|\brank\b|Object\.keys/.test(ownCode),
    "the owner sorts, ranks or sweeps — the tested set is an annotation until something reads it back");
  ok(!/\.party\b|Republican|Democrat|GOP/i.test(ownCode), "the owner reads a party");
  ok(!/incomplete|limited record|too early|unproven/i.test(own),
    "the owner composes a verdict of its own alongside read()'s label");

  // ── the apparatus lid's label (v141) ──────────────────────────────
  // A lid label has to name what opening it shows, WITH a count, and that count
  // has to be the one the section around it prints. It may not build the pair, it
  // may not take a read of its own, and it may not print a fraction that sizes
  // nothing onto a control a reader is being asked to tap.
  const lid = wa("the apparatus lid's label");
  has(lid, "var lidFig = figureOf(pid, r);",
    "the apparatus lid sizes its own figure again instead of printing the owner's — the label sits " +
    "INSIDE the ⚖ section, a screen under the number block it is sizing, so a second spelling here " +
    "disagrees with the very thing tapping it opens");
  has(lid, "(lidFig.fraction ? ' · ' + lidFig.fraction : '')",
    "the lid prints the fraction ungated, so a set that cannot be said becomes \"0 of 0 tested\" on " +
    "a control a reader has to spend a tap on");
  has(lid, "'How this score is built · basis, method and sources'",
    "the lid label stopped naming its payload — a label a reader has to tap may not be a bare " +
    "\"See more\"");
  // Two readings of the span: `lidBare` keeps the string literals, because the
  // hand-built pair this pass removed IS a string literal, and `lidCode` drops
  // them, because the label's own copy legitimately contains a word like "sources".
  const lidBare = lid.replace(/^\s*\/\/.*$/gm, "");
  const lidCode = lidBare.replace(/'[^']*'/g, "''");
  ok(!/coverage\.tested \+ ' of '|coverage\.tested \+ ' \/ '/.test(lidBare),
    "the lid assembles N of M by hand beside the owner's copy of it");
  ok(!/coverage\.tested|coverage\.scorable/.test(lidCode),
    "the lid reaches into the coverage block rather than asking the owner");
  ok(!/toFixed|\/\s*100|\*\s*100|Math\.|reduce\(/.test(lidCode),
    "the lid grew arithmetic of its own — the count on it is a re-print of read()'s");
  ok(!/MIN_|FLOOR|publishable|>=|<=/.test(lidCode),
    "the lid tests a threshold of its own, which would hide a thin figure on the one control that " +
    "explains how the figure was built");
  ok(!/\bread\(pid, p\)|scopedRead\(/.test(lidCode),
    "the lid reads the engine directly rather than the read it was handed");
  ok(!/\.party\b|Republican|Democrat|GOP/i.test(lidCode), "the lid reads a party");

  // ── the Official Record feed row (v141) ───────────────────────────
  // The row that names the test prints the test's own size, from the owner, off
  // the read the panel already holds. Its role sentence and its target are the
  // row's, unchanged; what is argued here is that the count is not built twice.
  const frow = wa("the Official Record feed row");
  has(frow, "n: figureOf(pid, r).fraction });",
    "the Official Record row sizes the tested set in its own hand again — the row that NAMES the " +
    "test, disagreeing with the figure it is the test for, inside the same section");
  has(frow, "target: 'pdxsec-official-record'", "the row stopped pointing at the record it names");
  has(frow, "isExecLane(pid)",
    "the row's role sentence stopped answering which lane this member's record is in");
  const frowCode = frow.replace(/^\s*\/\/.*$/gm, "").replace(/'[^']*'/g, "''");
  ok(!/coverage\.tested|coverage\.scorable/.test(frowCode),
    "the feed row reaches into the coverage block to spell the pair a second time");
  ok(!/toFixed|Math\.|\/\s*100|\*\s*100|\+\+|reduce\(/.test(frowCode),
    "the feed row grew arithmetic of its own");
  ok(!/MIN_|FLOOR|publishable|>=|<=/.test(frowCode),
    "the feed row tests a threshold of its own");
  ok(!/\bread\(pid, p\)|scopedRead\(/.test(frowCode),
    "the feed row takes a read of its own instead of the one the panel is holding");
  ok(frow.split("figureOf").length === 2, "the feed row asks the owner more than once for one string");

  // ── the identity chip's denominator (v136, v140) ───────────────────
  // One control, one door, one fraction, and every figure on it read out of the
  // object above. The chip is allowed to ANNOTATE the figure it prints; it is not
  // allowed to compute one, to gate one, to take a read of its own, or to become
  // a second surface anything can rank people by.
  const chip = wa("the identity chip's denominator");
  has(chip, "var f = figure(pid, p);",
    "the chip sizes its own figure again instead of printing the owner's object — which is how " +
    "\"84% · 5 of 14 tested\" came to sit a screen above a section reading 72% over 15 of 26");
  has(chip, "if (!f.shows) return '';",
    "the chip publishes a percentage without the set that sizes it. Where both cannot be said the " +
    "chip is ABSENT — never a smaller secret set with a figure still on it");
  has(chip, "var den = f.fraction;",
    "the chip's denominator is not the owner's fraction, character for character — a door that " +
    "paraphrases what is behind it is a second finding");
  has(chip, "esc(f.pct + '% ' + FRAME.metric + ', ' + den + ' — ' +",
    "the accessible name is not the same N of M as the visible chip: a screen reader hearing " +
    "\"90 per cent, Backs it up\" has been handed the exact impression the visible chip was fixed " +
    "to stop giving");
  has(chip, "'<span class=\"pdxwa-cbadge-den\">' + esc(den) + '</span>' +",
    "the visible chip dropped the fraction");
  has(chip, "' data-pdxwa-fig=\"' + esc(f.stamp) + '\"' +",
    "the chip no longer stamps the tuple it printed, so the section below it can only be trusted " +
    "to agree");
  has(chip, "jumpAttr('pdxsec-wordaction')",
    "the chip no longer jumps to the section it is a door to");
  eq([...chip.matchAll(/<button/g)].length, 1, "the chip is more than one control");
  // What it may not do. Strings and comments come out first: the comment in the
  // span names MIN_TESTED_ITEMS in order to explain why the empty case is
  // unreachable, and the markup itself contains a literal per-cent sign.
  const chipCode = chip.replace(/^\s*\/\/.*$/gm, "").replace(/'[^']*'/g, "''");
  ok(!/toFixed|Math\.(round|max|min)|\/\s*100|\*\s*100|\+\+|reduce\(/.test(chipCode),
    "the chip grew arithmetic of its own — every figure on it is a re-print of read()'s");
  ok(!/MIN_|FLOOR|publishable|PublicationFloor|SHAPE_MIN|>=|<=/.test(chipCode),
    "the chip tests a threshold of its own. Below the publication floor read() returns no percentage " +
    "and the chip already renders nothing; a second, higher floor here would hide a thin figure " +
    "instead of labelling it, and leave a reader no way to know why one profile has a chip and the " +
    "next does not");
  ok(!/\.sort\(|localeCompare|rank|\.filter\(|Object\.keys/.test(chipCode),
    "the chip sorts, ranks or sweeps — two integers on a chip are an annotation until something " +
    "reads them back");
  ok(!/\.party\b|Republican|Democrat|GOP/i.test(chipCode), "the chip reads a party");
  ok(!/incomplete|limited record|too early|unproven/i.test(chip),
    "the chip composes a verdict of its own alongside read()'s label");
  ok(!/\bread\(pid, p\)|scopedRead\(/.test(chipCode),
    "the chip reads the engine directly again. One surface, one object: it prints figure()'s, and " +
    "figure() is the one place the question \"at which scope, as of when\" is answered");

  // ── the letterhead chip's repaint (v140) ──────────────────────────────────
  const cbind = wa("the letterhead chip's repaint");
  has(cbind, "armFigureRepaint(function () {",
    "the chip has a repaint contract of its own again — one event, a strict pid and an unbind on a " +
    "host that has not landed yet are three ways to go deaf, and the ring stopped having all three");
  has(cbind, "host.innerHTML = compactBadgeHtml(pid, p);",
    "the chip's repaint paints something other than the chip");
  const cbindCode = cbind.replace(/^\s*\/\/.*$/gm, "").replace(/'[^']*'/g, "''");
  ok(!/addEventListener|removeEventListener|pdx-consistency-warm|pdx-voting-warm/.test(cbindCode),
    "the chip subscribes to events itself rather than through the shared contract, which is where " +
    "the event list, the alias hop, the seen guard and the reconciling paint are argued");
  ok(!/detail\.pid/.test(cbindCode),
    "the chip matches the event's pid itself again — evForPid does that, on both ids, with one " +
    "alias hop on each side");

  // ── the ⚖️ section prints the same object (v140) ───────────────────────────
  const secRead = wa("the section reads the shared figure");
  has(secRead, "var fig = figure(pid, p, sr);",
    "the ⚖ section no longer takes the owner's object, so the chip above it is printing a figure " +
    "the section cannot be checked against");
  has(secRead, "var sr = scopedRead(pid, p);",
    "the section's own read moved out from under the figure it hands to the owner");
  ok(!/scopedRead\(pid, p\)[\s\S]*scopedRead\(pid, p\)/.test(secRead),
    "the section scores twice to print one figure");
  const stamp = wa("the section stamps the shared figure");
  has(stamp, "var depthTag = hasPct",
    "the depth tag is gated on something other than there being a percentage to size");
  has(stamp, "' data-pdxwa-set=\"' + esc(fig.fraction) + '\"' +",
    "the number block no longer carries the owner's fraction, so \"the chip's N of M equals the " +
    "section's\" stops being a claim anything can check");
  has(stamp, "' data-pdxwa-fig=\"' + esc(fig.stamp) + '\">' +",
    "the number block no longer stamps the same tuple the chip stamps");
  has(stamp, "esc(depthCaption(testedOf(r))) + '</div>'",
    "the visible depth caption moved — this pass added data beside it and changed no copy");
  const stampCode = stamp.replace(/^\s*\/\/.*$/gm, "").replace(/'[^']*'/g, "''");
  ok(!/MIN_|FLOOR|isThin|>=|<=/.test(stampCode),
    "the depth tag grew a threshold of its own, which would drop the set exactly where the size of " +
    "it matters most");
  const sbind = wa("the section's repaint");
  has(sbind, "armFigureRepaint(function () {",
    "the ⚖ section has a repaint contract of its own again — a section that stops listening while " +
    "the chip above it keeps listening is the same drift, from the other end");
  has(sbind, "return document.querySelector('[data-pdxwa=\"' + uid + '\"]');",
    "the section's repaint no longer finds the panel it owns by that panel's instance id");
  ok(!/addEventListener|pdx-consistency-warm|detail\.pid/.test(
       sbind.replace(/^\s*\/\/.*$/gm, "").replace(/'[^']*'/g, "''")),
    "the section subscribes and matches on its own again instead of through the shared contract");
  has(wa("the section's repaint, closed"), "});",
    "the section's repaint is no longer closed as a call into the shared contract");

  // ── the hero ring's sub-line (v141) ───────────────────────────────────────
  // One object, one gate. The ring prints the owner's fraction and gates the
  // percentage on the owner's `shows`, so the loudest number on the profile is
  // held to the rule the smallest chip on it is held to. The waiting ladder below
  // the seam is the FLOOR's sentence and is outside it.
  const hero = wa("the hero ring's sub-line");
  has(hero, "var fig = figure(pid, p, sr);",
    "the hero sizes its own figure again — the first number on the profile, spelling the section's " +
    "fraction a fourth time out of its own coverage block");
  has(hero, "var hasPct = fig.shows;",
    "the ring gates its percentage on something other than the owner's both-halves rule — the ring " +
    "is where publishing a percentage with no set to size it costs the most, because it is the " +
    "first thing read and the only figure above the fold");
  has(hero, "if (hasPct) sub = fig.fraction;",
    "the ring's sub-line is not the owner's fraction, character for character");
  const heroBare = hero.replace(/^\s*\/\/.*$/gm, "");
  const heroCode = heroBare.replace(/'[^']*'/g, "''");
  ok(!/c\.tested \+ ' of ' \+ c\.scorable/.test(heroBare),
    "the ring assembles N of M by hand again beside the owner's copy of it");
  ok(!/c\.scorable|coverage\.scorable/.test(heroCode),
    "the ring sizes itself out of the coverage block rather than off the owner's object");
  ok(!/toFixed|Math\.|\/\s*100|\*\s*100|reduce\(/.test(heroCode),
    "the ring grew arithmetic of its own — its percentage is read()'s and its fraction is the " +
    "owner's");
  ok(!/MIN_|FLOOR|floors\.|publishable|>=|<=/.test(heroCode),
    "the ring tests a floor inside this span. The publication floor is read()'s, and the ring's " +
    "below-floor sentence — which names the floor, not the tested set — is deliberately OUTSIDE " +
    "this seam and still pinned");
  ok(!/scopedRead\(pid, p\)/.test(heroCode),
    "the hero's own read moved inside the span that prints the figure taken off it");
  ok(!/\.party\b|Republican|Democrat|GOP/i.test(heroCode), "the ring reads a party");
  ok(!/incomplete|limited record|too early|unproven/i.test(hero),
    "the ring composes a verdict of its own alongside read()'s label");

  // ── the issue file beside the pattern row (v133) ───────────────────────────
  // A sibling anchor after the door, not a link wrapped around the label: the
  // label IS the dossier button on this row, and nesting one interactive element
  // in another drops every span after it out of the row. The address is asked for,
  // not spelled, and the row keeps its primary tap on the person's own record.
  const file = wa("the issue file beside the pattern row");
  has(file, "F.profileUrl(key)", "the brief composes the issue address instead of asking the module that owns it");
  has(file, "if (!href) return '';", "the row no longer renders nothing when the family module is absent");
  has(file, "(door ? issueFileHtml(key, x.label) : '') +", "the issue file is mounted somewhere other than after the row's door");
  ok(!/'\/i\//.test(file.replace(/^\s*\/\/.*$/gm, "")), "the brief spells the issue-file prefix inline");
  ok(file.indexOf("scopeControlHtml(key) : '') +\n      // And the issue file") > 0 ||
    file.indexOf("(door ? scopeControlHtml(key) : '') +") === 0 ||
    /scopeControlHtml\(key\)[\s\S]*issueFileHtml\(key/.test(file),
    "the ⓘ and the issue file are no longer both outside the door, in that order");
  ok(!/pct|percent|\bscore\b|\bweight\b|MIN_|FLOOR|party|Republican|Democrat/i.test(file.replace(/^\s*\/\/.*$/gm, "")),
    "the issue-file control reads a score, a weight, a floor or a party");
  // ── seam A: the gate ──────────────────────────────────────────────────────
  // The copy is locked, in two forms and no third, and it carries no party, no
  // rate and no verdict about the person.
  const gate = wa("the slice gate and its locked copy");
  has(gate, "'Pattern from the House rolls on file — not a career score.'",
    "the slice sentence's no-number form is not the locked copy");
  has(gate, "'Pattern from ' + n + ' House rolls on file — not a career score.'",
    "the slice sentence's numbered form is not the locked copy");
  eq([...gate.matchAll(/Pattern from [^']*/g)].length, 2,
    "the slice gate spells more or fewer than the two locked forms of the sentence");
  // The four legs, each named. A missing leg is the sentence describing a file
  // it is not true of.
  has(gate, "var SLICE_CUTOFF = 32;", "the slice gate's documented instrument cutoff moved");
  has(gate, "it.chamber !== 'house'", "the gate no longer requires the whole readable lane to be U.S. House rolls");
  has(gate, "it.kind === 'position'", "…nor that every judged act on it is a ballot");
  has(gate, "it.congress !== cong", "…nor that the file sits inside one Congress");
  has(gate, "formal.acts", "the gate no longer reads the inventory's published act count");
  has(gate, "_pdxRecordMappedCounts", "…nor cross-checks it against the record lane's distinct-instrument count");
  has(gate, "(c.acts === c.rolls) ? sliceLineN(c.acts) : SLICE_LINE",
    "the number is printed without the two published counts having to agree first");
  // What it may not do. Strings come out first — the sentence itself contains
  // the word "score", which is the half that does the work.
  const code = gate.replace(/^\s*\/\/.*$/gm, "").replace(/'[^']*'/g, "''");
  ok(!/toFixed|Math\.round|Math\.max|Math\.min|\/\s*100|\*\s*100/.test(code),
    "the slice gate grew arithmetic of its own — every figure in it is a re-print");
  ok(!/\bpct\b|percent|\bscore\b|\bweight\b|MIN_|FLOOR|publishable|PublicationFloor/.test(code),
    "the slice gate reads a score, a weight or the publication floor");
  ok(!/\.party\b|Republican|Democrat|GOP/i.test(code), "the slice gate reads a party");
  // The two locked forms are matched exactly above, so a verdict word smuggled
  // into the copy is already caught; this checks the CODE, where a second
  // sentence would have to be composed to carry one.
  ok(!/incomplete|limited record|early in term/i.test(code),
    "the slice gate composes a verdict about the person alongside its sentence about the file");
  // ── seams B and C: the mounts ─────────────────────────────────────────────
  // Under the pattern list in both, through the one function, so the letterhead
  // and the brief cannot drift into two wordings.
  has(wa("the letterhead's mount"), "tops + splits + thin + sliceNoteHtml(pid, sh) +",
    "the letterhead mounts the slice note somewhere other than under its pattern list");
  has(wa("the brief's mount"), "tops + splits + none + thin + sliceNoteHtml(pid, sh) +",
    "the brief mounts the slice note somewhere other than under its pattern list");
  for (const why of ["the letterhead's mount", "the brief's mount"]) {
    const m = wa(why);
    ok(!/\d\s*%|toFixed/.test(m), "a mount grew a figure of its own");
    ok(m.split("sliceNoteHtml").length === 2, "a mount calls the slice note more than once");
  }
  // ── the owner, published (v140) ───────────────────────────────────────────
  const pub = wa("the owner, published");
  has(pub, "figure: figure,",
    "the shared figure is no longer published, so \"the chip and the section print one object\" can " +
    "only be inferred from two rendered strings that happen to agree");
  has(pub, "fractionOf: fractionOf,", "the one fraction builder is no longer published");
  const pubCode = pub.replace(/^\s*\/\/.*$/gm, "").replace(/'[^']*'/g, "''");
  ok(!/[(){}]/.test(pubCode),
    "the export seam grew something other than name-to-name export lines");
  ok(!/MIN_|FLOOR|publishable|pct|percent|party/i.test(pubCode),
    "the export seam publishes a floor, a percentage or a party alongside the two names it added");
}

// ─────────────────────────────────────────────────────────────────────────────
// alignment-tool.js: ONE REGION, the parent table (v109)
// ─────────────────────────────────────────────────────────────────────────────
// Not a copy seam, so it is not in a SEAMS list and carveSeams() does not cut it.
// It is a whole declared data region, and what is argued about it is its SHAPE
// against HEAD's — see the v109 paragraph in the header for why that is the
// stronger statement here than a hash.

/** The banner that opens the block, unchanged since the table was declared. */
export const PARENT_TABLE_MARK = "    // CORE NATIONAL ISSUES — the priority framework (2026)\n";
const PARENT_TABLE_END = "\n    ];\n";

/**
 * Cut alignment-tool.js into { before, seam, after }, or null if the banner has
 * moved. `before` and `after` are the byte-pinned halves; `seam` is the table.
 */
export function carveParentTable(src) {
  const s = String(src);
  const i = s.indexOf(PARENT_TABLE_MARK);
  if (i < 0) return null;
  const j = s.indexOf(PARENT_TABLE_END, i);
  if (j < 0) return null;
  return {
    before: s.slice(0, i),
    seam: s.slice(i, j + PARENT_TABLE_END.length),
    after: s.slice(j + PARENT_TABLE_END.length),
  };
}

/**
 * The declared cores, read out of the block's own SOURCE. Parsed rather than
 * evaluated on purpose: a check that boots the file to learn what the file says
 * can be talked into anything by the file.
 */
export function parseParentTable(seam) {
  const out = [];
  const re = /\{\s*key:\s*'([^']+)',\s*label:\s*'((?:[^'\\]|\\.)*)',[\s\S]*?keys:\s*\[([^\]]*)\]\s*\}/g;
  let m;
  while ((m = re.exec(String(seam)))) {
    out.push({
      key: m[1],
      label: m[2],
      keys: m[3].split(",").map((x) => x.trim().replace(/^'|'$/g, "")).filter(Boolean),
    });
  }
  return out;
}

/**
 * Every key ISSUE_MAP publishes, read out of the region carveParentTable proves
 * unchanged — so "no key was invented" is decided by bytes this helper has
 * already pinned, not by the same edit under review.
 */
export function publishedIssueKeys(src) {
  const c = carveParentTable(src);
  const region = c ? c.before : String(src);
  const i = region.indexOf("var ISSUE_MAP = {");
  if (i < 0) return [];
  return [...new Set([...region.slice(i).matchAll(/^\s{6}([a-z0-9_]+):\s*\{\s*label:/gm)].map((m) => m[1]))];
}

const isSubsequence = (small, big) => {
  let i = 0;
  for (const x of big) if (x === small[i]) i++;
  return i === small.length;
};

/**
 * The five statements, asserted with the CALLER's own ok/eq so a failure reads in
 * the voice of the suite that found it. `wave` names that suite in the messages.
 *
 * A tree that has not moved the file at all takes the short path and says so, so
 * this stays a byte equality for every wave that adds no parent — which is all of
 * them but one.
 */
export function assertParentTableIsTheOnlyMove(api, headSrc, treeSrc, wave) {
  const { ok, eq } = api;
  const tag = wave ? `${wave}: ` : "";
  const A = carveParentTable(headSrc), B = carveParentTable(treeSrc);
  if (!ok(!!A && !!B, `${tag}alignment-tool.js no longer carries the CORE NATIONAL ISSUES banner this region is cut at — widen the anchor here, do not loosen the check`)) return null;

  // 1 · everything outside the table, byte for byte. ISSUE_MAP is in here, and so
  //     is every scope note a wave could have widened to admit a refused row.
  //
  //     WITH ONE EXCEPTION, AND IT IS NOT A WAVE'S: a WRITTEN scope note may be
  //     ADDED. The scope notes live above the table as line comments over the key
  //     they bound, and writing one is how a key stops being a label with no
  //     boundary — the state two waves have already refused to map an instrument on
  //     ("rural_ag has no argued-out scope note either", F9 on H.Amdt. 202). Under a
  //     flat byte equality the only way to answer that refusal is to edit this file,
  //     which no pass may do; the boundary would have to be written somewhere else,
  //     and a boundary kept away from the keyword list it bounds is how the two
  //     disagree. So an addition of whole-line comments is allowed and everything
  //     else is not: every line HEAD has must still be here, in HEAD's order, with
  //     HEAD's bytes, and every inserted line must be a comment. That leaves a
  //     wave's actual stake exactly where it was — no key, no keyword, no lean, no
  //     category and no line of the alignment engine can move through this door,
  //     because a line comment is inert and nothing existing may change.
  if (B.before !== A.before) {
    const hl = A.before.split("\n"), nl = B.before.split("\n");
    const kept = isSubsequence(hl, nl);
    const added = [];
    { // which lines are the insertions: walk both, in order.
      let i = 0;
      for (const l of nl) { if (i < hl.length && l === hl[i]) { i++; continue; } added.push(l); }
    }
    const notComment = added.filter((l) => l.trim() && !/^\s*\/\//.test(l));
    ok(kept,
      `${tag}alignment-tool.js changed ABOVE the parent table — ISSUE_MAP itself, the alignment ` +
      `engine and every scope note live there, and a line of them was edited or removed, not added to`);
    eq(notComment.slice(0, 3).join(" | "), "",
      `${tag}${notComment.length} line(s) added above the parent table are not comments — this region ` +
      `admits a written scope note and nothing else`);
  } else {
    ok(true, `${tag}alignment-tool.js is byte-identical above the parent table`);
  }
  eq(B.after, A.after,
    `${tag}alignment-tool.js changed BELOW the parent table — the reverse lookup, the evidence ` +
    `helpers and the team-alignment renderer live there`);
  if (B.before === A.before && B.after === A.after && B.seam === A.seam) {
    ok(true, `${tag}alignment-tool.js is byte-identical to HEAD`);
    return { renamed: [], grew: [], identical: true };
  }

  const a = parseParentTable(A.seam), b = parseParentTable(B.seam);
  ok(a.length > 0 && b.length > 0,
    `${tag}the parent table could not be read out of the block (${a.length} cores at HEAD, ${b.length} in the tree)`);
  // 2 · the same cores, in the same declared order.
  eq(b.map((c) => c.key).join(","), a.map((c) => c.key).join(","),
    `${tag}the set or the order of the core national issues changed — this region admits parents, ` +
    `not a fourteenth core and not a re-keyed one`);
  const atHead = {};
  a.forEach((c) => { atHead[c.key] = c; });
  // 4 · no key invented, judged against the pinned half of the file.
  const known = new Set(publishedIssueKeys(treeSrc));
  ok(known.size > 50, `${tag}the published ISSUE_MAP key set could not be read (${known.size} keys)`);
  const lost = [], ghost = [];
  for (const c of b) {
    const was = atHead[c.key];
    if (!was) continue;
    // 3 · additions only, in place: nothing removed, nothing reordered.
    if (!isSubsequence(was.keys, c.keys)) lost.push(c.key);
    for (const k of c.keys) if (!known.has(k)) ghost.push(`${c.key}/${k}`);
  }
  eq(lost.join(", "), "",
    `${tag}${lost.length} core(s) dropped or reordered a key they already had — this region is ` +
    `additive, and a key leaving a core takes a chip and a crumb with it`);
  eq(ghost.join(", "), "",
    `${tag}${ghost.length} core entr(ies) name a key ISSUE_MAP does not publish — the pass added ` +
    `parents, not vocabulary`);
  // 5 · a label may only widen where the child set widened.
  const renamed = b.filter((c) => atHead[c.key] && atHead[c.key].label !== c.label);
  const grew = new Set(b.filter((c) => atHead[c.key] && c.keys.length > atHead[c.key].keys.length).map((c) => c.key));
  const bare = renamed.filter((c) => !grew.has(c.key)).map((c) => c.key);
  eq(bare.join(", "), "",
    `${tag}${bare.length} core label(s) changed without the core gaining a key — that is a rename, ` +
    `and a rename is refused; a label may only widen to name what has been filed under it`);
  return { renamed: renamed.map((c) => c.key), grew: [...grew], identical: false };
}
