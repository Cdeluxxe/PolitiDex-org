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
  // ── and one for the state-executive act types (v165) ─────────────────────
  // The lane router's own doctrine note, which is where the next reader asks why
  // the federal enactment types are absent from the stance-helpers act table.
  // Wave E1 answered a second question in the same place — a UTAH GOVERNOR does
  // have two act types there, `gov_signed` and `gov_vetoed`, and the reason they
  // are not the federal names is that reusing them would have flipped every
  // presidential measure carrying one out of the ✒️ lane AND relabeled it. That
  // belongs beside the paragraph it qualifies. The span is PROSE ONLY: not one
  // statement of _anyWeighedAct or of the router above it is inside it, and the
  // argument below says so in as many words.
  ["  // exec-record.js, which counts them per class for exactly that reason).\n",
   "  function _anyWeighedAct(items) {\n",
   "the lane router's doctrine note on the exec act types"],
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
// The first three spans are the state-executive act types (wave E1, v165), and
// they are FIRST because they are first in the file: the act table sits at the top
// of the module, so a pass landing there renumbers every span below it. That is
// exactly the failure byWhy() was written for, and assertStanceHelpersSeam() now
// looks its spans up by name rather than by position for that reason.
//
// A governor casts no floor vote, sits on no committee and sponsors nothing, so the
// formal lane for that office was empty by construction and the profile said "No
// formal pattern on file yet" over 140 recorded acts. The two new classes are the
// acts the office actually performs. They are STATE-executive types of their own,
// deliberately not the presidential `signed` / `vetoed` / `issued`, which stay out
// of this table so a president still routes to the ✒️ lane with its own verbs.
//
// A wave has no stake in these three spans either: no floor moved (the roll-call
// class is still 1.00 and is pinned inside the span it opens), no mapping, no
// score and no admission is read or written in them, and nothing in them is
// offered to Direction Match. What they add is depth in the record lane, which is
// the same wall a committee vote and a sponsorship already stand behind.
export const SH_SEAMS = [
  ["    // ships (\"Party to the case\"), which does not claim sole authorship.\n",
   "    var _ACT_CLASSES = {\n",
   "why the state-executive act types are not the federal names"],
  ["      floor:          { key: 'floor',          w: 1.00, floor: true,\n" +
   "                        label: '',                    one: 'floor vote',      many: 'floor votes' },\n",
   "      committee_vote: { key: 'committee_vote', w: 0.60, floor: false,\n",
   "the two state-executive act classes"],
  ["    // and 3 co-sponsorships\" never comes out backwards.\n",
   "\n    // ONE ITEM → ONE ACT CLASS, or null for \"not admitted to the pattern\".",
   "the order the act mix is spoken in"],
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

// ── alignment-tool.js: one span — the re-projection after a Signature pull ──
// This file is byte-pinned BELOW the CORE NATIONAL ISSUES parent table by nine
// suites, and for the right reason: the reverse lookup, the evidence helpers, the
// two scoring lanes and the team renderer all live down there, and no wave, no
// roster and no crawl pass has any business in them.
//
// Your file (CACHE_VERSION v161, your-file.js) needed the reader's own answers on
// eight issues to reach the match. It did NOT take them into the scoring lanes to
// do it: both lanes still read `_alignMigrateLevel(_alignIntensity[key] ||
// ALIGN_DEFAULT_LEVEL)` over the picked set, byte for byte as HEAD wrote them, and
// the file reaches them by pushing each sided answer through this tool's own
// public entry points — alignSetIntensity and alignToggleIssue. The engine that
// scores the eight is the engine that was already there, and there is no second
// resolver for a surface to drift away from.
//
// ONE THING COULD NOT BE DONE FROM OUTSIDE, AND IT IS THE SPAN. A Signature
// pulled from Firestore is a full REPLACEMENT of the picked set: _alignApplySaved
// overwrites the selection, so a Signature saved on another device before this
// feature existed arrives holding none of the eight and silently drops answers
// the reader is looking at. The fix has to run immediately after that apply and
// before the repaint, and this file dispatches no event a module could listen for
// (verified: no dispatchEvent, no CustomEvent anywhere in it), so there is no
// outside seat to take. The span asks window.PDXYourFile to re-project, inside a
// try, only when something actually changed — and the file's own module compares
// before it writes, so on the device that authored the answers it is a no-op.
//
// WHAT THE SPAN CANNOT REACH, which is why the waiver is narrow rather than a
// pass on the file: it holds no key, no keyword, no lean, no category, no weight,
// no floor, no band, no percentage and no side of the politician's half of the
// comparison. It reads nothing out of the record and it writes nothing into the
// Signature — the module it calls does that, through the doors already exported.
// Everything else in this file, above and below the parent table, is compared
// byte for byte on the usual terms.
export const AT_SEAMS = [
  ["          var c2 = _alignApplyIntensity(savedInt);\n",
   "          if (c1 || c2) _alignRefreshAll();\n",
   "the re-projection after a Signature pull"],
];

// ── word-action.js: the shared figure, the chip, the section, the gate, the mounts ────
export const WA_SEAMS = [
  // ── the empty formal lane's veto (v163) ───────────────────────────────────
  // TWO SPANS IN THE ENGINE ITSELF, which nothing in this list had needed before,
  // and they are here because /p/cox published "56% Word vs Action · 9 of 25
  // tested" and a MIXED RECORD chip over a formal brief that read "No formal
  // pattern on file yet" three inches below it. A governor casts no roll calls and
  // Utah's signed/vetoed ingest has not landed, so the ACTION half of that
  // comparison was empty and the 56% was the pledge ledger scoring itself: nine
  // resolved pledges at weight 3 clear the three-item floor and the four-weight
  // floor on their own, and 5 of 9 is 56%.
  //
  // The fix is ONE VETO AT THE ONE OWNER, so every face goes quiet through the
  // gate it already reads. A WAVE'S STAKE IN THESE TWO SPANS IS THE FLOORS, and
  // the floors are argued below character for character: `!laneEmpty &&` is a
  // conjunction in front of both comparisons, and a conjunction can only ever
  // take a percentage away. Nothing is loosened, nothing is inferred, no roll call
  // is invented for an office that casts none, and no stance is mapped into a
  // formal act — the readers only ASK four indexes whether a formal row exists for
  // this pid, and any one of them saying yes, or any one of them being
  // unreachable, passes the read straight through unchanged.
  //
  // First: the readers and the office scope. formalLaneReadable() and the four
  // indexes it asks, plus castsNoFloorVotes(), which is the reason this cannot
  // fire on a legislator — an empty pattern index is a standing fact for a
  // governor and a fetch still in flight for a member of Congress, and the same
  // silence would be a false sentence on the second one.
  ["    return { state: 'untested', reason: 'no_action_yet', token: 'no_record' };\n  }\n",
   "  // \u2500\u2500 THE READ \u2500\u2500",
   "the empty formal lane's readers"],
  // Second: the veto, and both floors underneath it. The pct expression, the
  // fallback ladder and the token it produces are inside the span too, and all
  // three are argued as unmoved — the ladder especially, because `no_record` is
  // the more exact word for this state than `limited` and relabelling it would
  // have moved the verdict word on hundreds of profiles that were never wrong.
  ["    else outcomeToken = 'no_stance';\n",
   "    var cs = C();\n    var verdict = (cs && cs.VERDICTS && cs.VERDICTS[token]) || null;\n",
   "the empty lane's veto, and both floors under it"],
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
  // ── the thin copy's empty-lane sentence (v163) ────────────────────────────
  // One branch in thinCopy(), placed AFTER the warming branch and never before it:
  // a lane still being fetched is not an empty one. The sentence a reader is shown
  // in place of the number says which gap this is — the OFFICE has no formal acts
  // on file, not the person a thin record — because those are different gaps with
  // different fixes, and "not enough record yet" would promise a number that is
  // not coming. The span states no position, maps no measure and moves no floor;
  // the signature gained the pid and the profile because the office question
  // cannot be answered out of a read alone.
  ["  function thinCopy(r, name",
   "      return 'All ' + c.word + ' position'",
   "the thin copy's empty-lane sentence"],
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
  // ── the letterhead's thin-copy call (v163) ────────────────────────────────
  // The call site, and only the call site: thinCopy() needs the pid and the
  // profile to answer the office question, so the letterhead hands over the two it
  // is already holding. The clause around it — ONE sentence under the big number,
  // gated on `hasPct` alone — is unchanged, and the verdict branch beside it is
  // untouched.
  ["              // as a paragraph instead of a verdict.\n",
   "        // THE SHAPE, BESIDE THE NUMBER.",
   "the letterhead's thin-copy call"],
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
  // ── the hero ring's empty-lane sub-line (v163) ────────────────────────────
  // One rung on the waiting ladder the span above deliberately stops before, and
  // it is added ABOVE the floor phrasings because those phrasings are false here:
  // the pledge ledger carries nine tested items past a three-item floor on its
  // own, so the ring under the suppressed number on /p/cox read "9 of 3 tested
  // needed". This is not a floor change wearing a copy pass's clothes — the floor
  // rungs are inside this span and argued unmoved below, and the new rung is
  // reached only where there is no formal record to test against at all.
  ["      else if (!c.word) sub = '';\n",
   "      else if (!c.scorable) sub = 'Nothing said independently on file';\n",
   "the hero ring's empty-lane sub-line"],
  // ── one row's sentence, with one author (v147) ────────────────────────────
  // The row's spoken form — "Health care — formal record: every vote one way (12
  // of 12)" — was built inline in the row's aria-label, which was fine while the
  // row was the only surface that said it out loud. The record-first pass put the
  // same sentence on a Relevant-to-Me list card, and a card phrased one way over a
  // profile row phrased another is two vocabularies for one row. So the phrase is
  // a named function above the row that reads it, and the card reads the same one.
  // The span holds the phrase and the row's use of it, nothing else: the tier
  // label, the counts and the leftover are all still the engine's, and no verb,
  // direction or figure is composed in here.
  ["    return '<span class=\"pdxwa-shape-n pdxwa-shape-n-off\">· no count on file yet</span>' + none;\n  }\n",
   "    var name = '<span class=\"pdxwa-shape-iss\">' + esc(x.label) + '</span>';\n",
   "one row's sentence, with one author"],
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
  // ── the brief's finding, on one line (v147) ───────────────────────────────
  // A Relevant-to-Me card used to lead with a reading of the record — a ⚖️ rail —
  // while the person's own file led with the record. recordLine() is the card's
  // half of closing that: the SAME two lanes in the SAME precedence briefHeroHtml
  // resolves below it (execRecordSummary.pick(pid).on, then the roll-call lane's
  // formalPatternIndex.shape), reduced to one sentence and three kinds.
  //   It is pinned here because the thing that would make it a lie is a second
  // precedence. It composes no percentage, no grade and no verdict; on a pattern
  // it prints the row's own sentence rather than a paraphrase; and it never prints
  // the empty-file claim, which has a wall of its own in briefAbsenceCopy and is
  // not a list card's to make. Where the shape is missing or still arriving the
  // line says what the brief says.
  //   THE SEAM ENDS AT recordLine'S OWN CLOSING BRACE, not at the next function.
  // It used to run all the way to briefHeroHtml, which meant anything landing in
  // the gap between the two was excused by a waiver written about a list card's
  // sentence. The word-first letterhead landed exactly there, so the gap is now
  // its own span with its own argument below, and this one holds what it always
  // said it held.
  ["        shapeMatchHtml(pid, p, { deep: false, recordAbove: true }) +\n        '</div>';\n    } catch (e) { return ''; }\n  }\n",
   "      return out;\n    } catch (e) { return out; }\n  }\n",
   "the brief's finding, on one line"],
  // ── the word-first letterhead (v168) ─────────────────────────────
  // /p/lyman opened like a sitting member with an empty file: a kicker saying the
  // record was still being built, a formal brief of nought acts, and a Word vs
  // Action block saying there was not enough on file to test. Three absences, in
  // answer to "who is this person", over seven sourced positions filed below
  // them. This span is the block that leads with those positions instead, on the
  // one condition that there is nothing else to lead with.
  //
  // A WAVE'S STAKE HERE IS THE MEASUREMENT, AND THIS SPAN TAKES NONE. It prints
  // no percentage and calls no part of the figure — not figure(), not
  // shapeMatchHtml(), not a ring — which is argued character for character below,
  // because a Direction Match over an empty action lane is the exact defect the
  // v163 veto in this same file exists to refuse. It maps no measure, moves no
  // floor and reads no roll call. Every side word it prints is the one the stance
  // card already states, resolved through PDXConsistency.issueRows, so nothing is
  // inferred from a party letter or an office; and no row it renders is labelled
  // RECORD or PATTERN, because a documented position is not a voting pattern and
  // the block says so in as many words.
  ["      return out;\n    } catch (e) { return out; }\n  }\n",
   "  function briefHeroHtml(pid, p) {\n",
   "the word-first letterhead"],
  // ── the word-first letterhead's mount (v168) ──────────────────────
  // Two lines, asked once, above the record branches and below the exec lane's
  // own claim on the slot. The mount is a QUESTION AND AN EARLY RETURN and
  // nothing else: where the gate says no — and it says no for every file with a
  // record arriving, arrived, shipped in the formal index, or still unasked — the
  // function falls through to the briefs that were here before, byte for byte.
  // No wave's row, floor or mapping can reach it, because it neither reads nor
  // writes one.
  ["      var sh = FPI.shape(pid);\n      if (!sh) return '';\n",
   "      // ── empty ──",
   "the word-first letterhead's mount"],
  // ── the empty-lane predicate, published (v163) ────────────────────────────
  // Four exports beside heroRead, so a surface that needs the answer without
  // paying for a scoring pass — the card score slot every browse and compare
  // surface routes through — asks the same function read() vetoed on rather than
  // re-deriving it from the indexes. Reads only: nothing exported here writes,
  // scores or renders, and the copy a reader is shown in place of the number is a
  // constant rather than a sentence each caller spells.
  ["    heroRead: heroRead,\n",
   "    // \ud83c\udfdb The depth gate, published so tests and callers read the same two numbers\n",
   "the empty-lane predicate, published"],
  // ── the one-line finding, published (v147) ────────────────────────────────
  // Two exports beside briefHtml, so the card and the profile are demonstrably
  // one reader rather than two that happen to agree: recordLine is the finding at
  // card length, shapeRowSay is the row sentence both of them print.
  // ── the word-first lane, published (v168) ────────────────────────
  // Six names beside briefHtml: the two sentences the block prints, the cap on
  // how many rows it will show, the row set, the predicate and the block itself.
  // They are published for the reason the rest of this file's copy constants are
  // — the two-jobs explainer has to agree with the letterhead about which of its
  // two jobs is the main view, and a surface that re-derives that answer is a
  // second answer waiting to disagree. Reads only: nothing here scores, writes or
  // maps, and the two sentences are constants rather than strings each caller
  // spells for itself.
  //
  // This span exists because the seam below it used to open at briefHtml and
  // therefore covered these lines silently, arguing "two exports beside
  // briefHtml" while holding eight.
  ["    briefHtml: briefHeroHtml,\n    heroNamesPatterns: heroNamesPatterns,\n",
   "    // 🏛 And the one-line form of the same finding, for a list card.",
   "the word-first lane, published"],
  ["    // 🏛 And the one-line form of the same finding, for a list card.",
   "    // 📏 THE DENOMINATOR, IN ONE VOCABULARY.",
   "the one-line finding, published"],
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
function byWhy(bodies, api, list, file) {
  const f = file || "consistency.js";
  const n = (bodies || []).length;
  api.ok(!!list && n === list.length,
    `${f} was carved into ${n} spans and argued against a list of ` +
    `${(list || []).length} — a seam was added to scripts/v103-chrome-seams.mjs and not to the caller`);
  const m = new Map();
  (bodies || []).forEach((b, k) => { if (list && list[k]) m.set(list[k][2], b); });
  return (why) => {
    api.ok(m.has(why), `the seam named "${why}" is not among the spans this suite carved out of ${f}`);
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

  // ── the state-executive act types, explained where they are relevant (v165) ─
  // PROSE ONLY, and the assertion is written to fail if that ever stops being
  // true: strip the comment lines and the span must hold no statement at all. It
  // must also still say the thing it was added to say — that the federal three
  // are absent from the act table on purpose, and that the state two are named
  // apart rather than reusing them.
  const execNote = cut("the lane router's doctrine note on the exec act types");
  ok(execNote.replace(/^\s*\/\/.*$/gm, "").trim() === "",
    "the exec-act-types seam gained a statement — it is a doctrine note, and the router it " +
    "explains is pinned byte for byte outside it");
  has(execNote, "gov_signed",
    "…and it no longer names the state-executive act types, so the next reader cannot tell " +
    "why the federal three are absent while two others are present");
  has(execNote, "_pdxActLabel",
    "…nor why reusing the federal names would have relabeled a president's rows");

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
// ═════════════════════════════════════════════════════════════════════════════
// publication-floor.js — THE THREE SPANS THAT MOVED A KEY, NOT A RULE (v168)
// ═════════════════════════════════════════════════════════════════════════════
// THIS FILE IS THE ONE PUBLISHABILITY RULE, read by the browser and by
// scripts/gen-sitemap.mjs, so a wave that freezes it is protecting something
// real: no wave may move a floor. The word-first pass had to touch it anyway,
// and the distinction the seams draw is the whole reason it is allowed to — it
// changed WHICH KEY the stance list is fetched under, and not one rule about what
// clears. Curated cards are routinely filed under a name slug ("phil_lyman")
// while the roster keeps a short id ("lyman"); stance-helpers has always taken
// four hops to reconcile that, this file took one, and so the floor read zero
// cited positions for a person whose file renders seven sourced cards.
//
// EVERY ANCHOR BELOW EXISTS AT HEAD TOO, deliberately: the point of the list is
// that a caller can carve HEAD and now with the same seams and hold the pinned
// halves byte-identical. MIN_CITED_POSITIONS, MIN_PROMISES, isPid, read(),
// clears(), publishable() and identity() are all in that pinned half.
export const PF_SEAMS = [
  ["      formal: src.formal || root.PDXFormalIndex || null",
   "  // Positions that carry a source URL.",
   "the stance-key resolution chain"],
  ["  function citedPositions(pid, src) {\n",
   "  function promiseCount(pid, src) {",
   "the cited-positions lookup"],
  ["    _citedPositions: citedPositions,\n",
   "    _promiseCount: promiseCount,",
   "the resolution chain, published"],
];

/**
 * Argue what is inside publication-floor.js's spans. Same contract as the two
 * asserters above: the caller supplies its own has/eq/ok and pins the halves
 * outside these spans itself.
 */
export function assertPublicationFloorSeams(bodies, api) {
  const { has, ok } = api;
  const cut = byWhy(bodies, api, PF_SEAMS, "publication-floor.js");

  // ── the stance-key resolution chain ────────────────────────────
  // FOUR HOPS, IN stance-helpers' ORDER, and a floor that still cannot throw.
  const chain = cut("the stance-key resolution chain");
  const code = chain.replace(/^\s*\/\/.*$/gm, "");
  has(chain, "aliases: src.aliases || root.STANCE_ALIASES || {}",
    "the alias table is no longer read defensively — a runtime without one (the sitemap generator " +
    "loads five files and stance-helpers is not among them) must lose two hops, never a decision");
  has(chain, "if (pid && isList(s[pid])) return s[pid];",
    "the chain no longer tries the raw id first, which is the hop every already-published file " +
    "depends on");
  has(chain, "if (pid && aliases[pid] && isList(s[aliases[pid]])) return s[aliases[pid]];",
    "the chain lost the explicit-alias hop");
  has(chain, "if (nameSlug && isList(s[nameSlug])) return s[nameSlug];",
    "the chain lost the name-slug hop, which is the one `lyman` actually needs");
  has(chain, "if (nameSlug && aliases[nameSlug] && isList(s[aliases[nameSlug]])) return s[aliases[nameSlug]];",
    "the chain lost the alias-of-the-slug hop, so it no longer takes the same four hops " +
    "stance-helpers._resolveStanceList does and the sitemap can disagree with the file again");
  has(chain, "return null;",
    "the chain has no miss case — a key nobody filed cards under has to come back as nothing found, " +
    "not as an empty publication");
  // AND IT READS THE ROSTER FOR A NAME, NOT FOR MEMBERSHIP. A floor that admitted
  // anyone for being in CMP_DATA would be publishing identity, which is the one
  // thing this file exists to refuse.
  has(chain, "var nameSlug = d && d.name ? stanceSlug(d.name) : '';",
    "the roster row is used for something other than the display name the slug is derived from");
  ok(!/\bpublishable\b|\bclears\b|MIN_/.test(code),
    "the resolution chain reaches a floor rule or a floor threshold — it resolves a key and decides " +
    "nothing");
  ok(!/party|\bpty\b|office|state:/i.test(code),
    "the resolution chain reads a party, an office or a state off the roster row — none of the three " +
    "is a stance key");

  // ── the cited-positions lookup ───────────────────────────────
  // WHAT COUNTS AS CITED IS UNTOUCHED. Only where the list comes from moved.
  const cited = cut("the cited-positions lookup");
  has(cited, "var list = stanceList(pid, src);",
    "citedPositions fetches its own list again, which is how the floor and the file come to look up " +
    "one person under two different keys");
  has(cited, "if (it && it.source && it.source.url) out.push(it);",
    "the definition of a cited position moved — a source object with a label and no url is a " +
    "citation you cannot follow, and it has never counted toward this floor");
  ok(!/MIN_|>=|<=/.test(cited.replace(/^\s*\/\/.*$/gm, "")),
    "the cited-positions lookup compares against a threshold — counting is its job and deciding is not");

  // ── the resolution chain, published ─────────────────────────
  const pub = cut("the resolution chain, published");
  has(pub, "_stanceList: stanceList,",
    "the resolver is no longer published, so a harness cannot ask which key a person's cards were " +
    "found under without re-deriving the hops");
  {
    const c = pub.replace(/^\s*\/\/.*$/gm, "").replace(/'[^']*'/g, "''");
    ok(!/[(){}]/.test(c), "the floor's export seam grew something other than name-to-name export lines");
  }
}

export function assertStanceHelpersSeam(bodies, api) {
  const { has, ok } = api;
  // BY NAME, NOT BY POSITION, for the reason consistency.js's spans already are:
  // the act-table pass (v165) landed three spans at the TOP of the file, and the
  // two arguments below used to read bodies[0] and bodies[1]. Position-indexed
  // arguments would then have been silently arguing about the wrong bytes, which
  // is worse than a failure because it passes. Names do not move.
  const cut = byWhy(bodies, api, SH_SEAMS, "stance-helpers.js");
  const body = cut("the record-CTA stats");

  // ── the state-executive act types (v165) ───────────────────────────────────
  // Span 1 is prose: it must carry no statement, and it must still say why the
  // two new classes are not the federal names.
  const why = cut("why the state-executive act types are not the federal names");
  ok(why.replace(/^\s*\/\/.*$/gm, "").trim() === "",
    "the act-types explanation seam gained a statement — it is a doctrine note, and the " +
    "table it explains is argued separately");
  has(why, "gov_signed", "…and it no longer names the state-executive act types");
  has(why, "Direction Match",
    "…nor says that neither act is offered to Direction Match, which is the wall this " +
    "table has always stood behind");
  // Span 2 is the two classes themselves, and the argument is the whole of what a
  // wave has at stake in them: the floor class is untouched inside the span it
  // opens, the two new ones weigh LESS than a roll call and are not floor acts,
  // their labels are verbs about an act rather than ballot verbs, and no third
  // class was smuggled in beside them.
  const cls = cut("the two state-executive act classes").replace(/^\s*\/\/.*$/gm, "");
  has(cls, "floor:          { key: 'floor',          w: 1.00, floor: true,",
    "the floor class moved inside the seam that opens with it — a roll call is still the 1.00");
  for (const [key, label, w] of [["gov_signed", "Signed", "0.70"], ["gov_vetoed", "Vetoed", "0.70"]]) {
    has(cls, `${key}:`, `the act table lost ${key}, so a governor's lane is empty again`);
    has(cls, `w: ${w}`, `${key} no longer weighs ${w} — below a floor roll call is the whole claim`);
    has(cls, `label: '${label}'`, `${key} is no longer labelled ${JSON.stringify(label)}`);
  }
  ok(!/floor: true/.test(cls.replace(/^\s*floor: +\{[\s\S]*?\},$/m, "")),
    "a state-executive act declared itself a floor act — neither is a vote at any weight");
  ok(!/yea|nay|ballot|roll ?call|Voted/i.test(cls),
    "a ballot verb reached the state-executive classes — a governor casts no vote");
  const keys = (cls.match(/^ {6}([a-z_]+): +\{/gm) || []).map((l) => l.trim().replace(/:.*/, ""));
  ok(keys.join(",") === "floor,gov_signed,gov_vetoed",
    `the seam declares ${keys.join(", ")} — it may hold the floor class it opens with and the ` +
    "two state-executive classes, and nothing else");
  // Span 3 is the order the mix is spoken in, and the only thing at stake is that
  // a roll call is still said first and the two new keys are in the list at all.
  const order = cut("the order the act mix is spoken in").replace(/^\s*\/\/.*$/gm, "");
  has(order, "['floor', 'gov_signed', 'gov_vetoed',",
    "the act order no longer speaks a floor vote first, or dropped the state-executive acts " +
    "out of the spoken mix");
  ok(!/%|\bscore\b/.test(order), "the act-order seam gained a score or a percentage");

  // Seam 4 · the topic chip names the key it holds and opens that key's record.
  // Comments come out first, as everywhere else in this file: the prose over the
  // chip NAMES what it stopped doing — the ranked overlay, the family label it
  // used to print — and that is the half a reader needs and the half a regex
  // would trip on. What is argued below is the code.
  const chipBody = cut("the topic chip: its label and where it goes");
  const chip = chipBody === undefined ? undefined : chipBody.replace(/^\s*\/\/.*$/gm, "");
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
  // AND EVERY NAME HAS TO BE SPENT. The count above catches a seam added to the
  // list and never carved; it cannot catch a seam CARVED AND NEVER ARGUED, which
  // is the worse half — carving a span exempts those bytes from every wave's
  // byte-freeze, so an unargued seam is a hole in the freeze with nothing else
  // holding the bytes. The word-first pass (v168) landed three such spans and the
  // eight wave suites went green over them. What each name is spent on is checked
  // at the end of this function.
  const spent = new Set();
  const wa = (why) => {
    ok(byName.has(why), `the seam named "${why}" is not among the spans this suite carved out of word-action.js`);
    spent.add(why);
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
  // ── one row's sentence, with one author (v147) ────────────────────────────
  // The phrase exists once and the row reads it. What it may not do is compose:
  // the tier label and the counts are the engine's, and a verb or a figure
  // appearing in here is the card and the row starting to say different things.
  const say = wa("one row's sentence, with one author");
  has(say, "function shapeRowSay(x) {",
    "the row's spoken sentence is inline again, so a list card printing the same row can be phrased " +
    "differently from the row itself");
  has(say, "' — formal record: ' + (x.patLabel || 'on file')",
    "the row sentence names the pattern with something other than the tier's own published label");
  has(say, "var say = shapeRowSay(x) +",
    "the pattern row no longer speaks through the shared phrase — it built its own again");
  {
    const c = say.replace(/^\s*\/\/.*$/gm, "").replace(/'[^']*'/g, "''");
    ok(!/toFixed|Math\.|\/\s*100|\*\s*100|\bpct\b|percent|\bscore\b/i.test(c),
      "the row sentence grew arithmetic or a score of its own — every figure in it is a re-print");
    ok(!/\.party\b|Republican|Democrat|GOP/i.test(c), "the row sentence reads a party");
  }
  // ── the brief's finding, on one line (v147) ───────────────────────────────
  // ONE precedence for the record, at two lengths. The line asks the two lanes
  // in the order the brief below it asks them, prints the row's own sentence on a
  // pattern, and never makes the empty-file claim.
  const oneLine = wa("the brief's finding, on one line");
  has(oneLine, "function recordLine(pid, p) {",
    "the card-length form of the brief's finding is gone, so a list card has to word the record itself");
  has(oneLine, "execRecordSummary",
    "the one-line finding no longer asks the executive lane first, which is the order the brief resolves in");
  has(oneLine, "formalPatternIndex",
    "…nor the roll-call lane's published pattern index, which is the other half of that order");
  has(oneLine, "out.text = shapeRowSay(row);",
    "the one-line finding paraphrases the pattern row instead of printing the row's own sentence");
  has(oneLine, "briefRecordOnHand(pid)",
    "the one-line finding decides a candidate has no record without asking whether one is on hand");
  has(oneLine, "if (recordLineWaiting(pid))",
    "the one-line finding calls a record absent while it may still be arriving — the default is " +
    "\"still loading\", the same as the brief's");
  // AND THAT WAIT IS BOUNDED. It used to be `!briefWaitOver(pid)` alone, and
  // briefWaitOver only ends when briefNoted files a record or briefGaveUp fires —
  // and briefGaveUp is set by armBriefDeadline, which only the brief's own
  // paragraph arms. A list card arms nothing, so on a request that was started and
  // never filed the sentence was permanent: five cards read "Formal record still
  // loading…" for the whole life of the page about people whose record was empty.
  has(oneLine, "function recordLineWaiting(pid) {",
    "the wait has no owner of its own again, so whatever gates the loading sentence has no deadline");
  has(oneLine, "briefSettled(pid)",
    "the bounded wait no longer asks the lane's own settled answer (consistency.js publishes it with " +
    "a deadline of its own), so a started-and-never-filed request never ends the sentence");
  has(oneLine, "RECORD_LINE_WAIT_MS",
    "the bounded wait lost its own wall clock, so it is back to trusting two predicates that can both " +
    "stay false forever");
  {
    const w = oneLine.slice(oneLine.indexOf("function recordLineWaiting(pid) {"));
    const body = w.slice(0, w.indexOf("\n  }"));
    ok(/Date\.now\(\)/.test(body),
      "recordLineWaiting no longer reads a clock, so its wall-clock bound cannot expire");
    ok(!/setTimeout|setInterval|requestAnimationFrame|repaint|render/i.test(body),
      "recordLineWaiting arms a timer or schedules a paint — it is read-only by design, because a " +
      "list arms one per row and the card's warm listener is what brings it back");
  }
  // AND THE ROW'S RENDERED CHIP DOES NOT COME BACK OUT OF HERE. The shape rows
  // this reads carry `chip`, which is _stPatternHtml's .pdxst-pat span — HTML —
  // and a card that printed the object's fields as text painted the tag source.
  {
    const c = oneLine.replace(/^\s*\/\/.*$/gm, "");
    ok(!/\bout\.chip\b|chip:\s*row|chip:\s*x\.|\.chip\b/.test(c),
      "the one-line finding carries the shape row's `chip` again. That field is the characterisation " +
      "engine's RENDERED span, and every field on this object is documented as text — a caller that " +
      "escapes it prints the markup, a caller that does not mounts a node it never authored");
    ok(!/outerHTML|shapeRowHtml|<span/.test(c),
      "the one-line finding grew markup of its own — it returns a sentence, not a node");
  }
  {
    const c = oneLine.replace(/^\s*\/\/.*$/gm, "").replace(/'[^']*'/g, "''");
    ok(!/toFixed|\bpct\b|percent|\bscore\b|\bgrade\b|MIN_|FLOOR/i.test(c),
      "the one-line finding grew a percentage, a score or a publication floor");
    ok(!/\.party\b|Republican|Democrat|GOP/i.test(c), "the one-line finding reads a party");
    ok(!/briefAbsenceCopy/.test(c),
      "the one-line finding calls the empty-file paragraph, whose four vetoes exist because that claim " +
      "is not a list card's to make");
  }
  ok(!/nothing on file|no record on file/i.test(oneLine.replace(/^\s*\/\/.*$/gm, "")),
    "the one-line finding spells the empty-file claim itself");
  // ── the word-first letterhead (v168) ──────────────────────────────────────
  // WHAT THEY SAID, WHERE THERE IS NOTHING ELSE TO LEAD WITH — and not one thing
  // a wave measures. The gate is argued first, because every other claim in the
  // span is only true behind it.
  const said = wa("the word-first letterhead");
  const saidCode = said.replace(/^\s*\/\/.*$/gm, "");
  has(said, "if (sh.read || sh.judged || sh.characterised) return null;",
    "the word-first letterhead no longer stands down for a readable formal lane, which is the only " +
    "thing keeping it off a file that HAS a record");
  has(said, "if (!briefEmptyLegal(pid)) return null;",
    "the word-first letterhead no longer asks the empty-file door whether this absence may be " +
    "published at all");
  has(said, "if (briefGaveUp(pid)) return null;",
    "the word-first letterhead reads a record that FAILED TO LOAD as a record that does not exist — " +
    "two different sentences, and only one of them is true");
  has(said, "if (!saidLanded(pid)) return null;",
    "the word-first letterhead no longer waits for the member payload, so an in-app arrival at a " +
    "sitting member gets a frame of the word lane over a record already on its way");
  has(said, "typeof rows.length === 'number'",
    "the payload veto accepts something other than the array memberRecords documents — an object " +
    "with no length is not an answer, and every cold-boot harness in scripts/ leans on that");
  has(said, "if (!set.cited) return null;",
    "the word-first letterhead renders with no cited position behind it, which is the empty file " +
    "again under a warmer heading");
  // THE FIGURE. A percentage over an empty action lane is the third absence this
  // pass exists to remove, and this class of file is that lane by definition. It
  // may not print one and it may not call anything that does.
  ok(!/%/.test(saidCode),
    "the word-first letterhead ships a percent sign — the one class of file whose action half is " +
    "empty by definition is the one class that may never carry a figure");
  ok(!/shapeMatchHtml|fractionOf\(|figure\(pid/.test(saidCode),
    "the word-first letterhead reaches for the Direction Match renderer or the shared figure, so " +
    "the empty action lane is being scored after all");
  ok(!/MIN_[A-Z_]+/.test(saidCode),
    "the word-first letterhead consults a Direction Match floor, which is a threshold on a lane it " +
    "has already established is empty");
  // THE ROWS: a stated position, said to be one, sided by the card itself.
  has(said, "var SAID_CAP = 6;", "the word-first letterhead no longer caps its list at six rows");
  has(said, "out.shown = out.rows.slice(0, SAID_CAP);",
    "the cap is declared and not applied, so a file with thirty cited positions leads with thirty rows");
  has(said, '">SAID</span>',
    "the word-first rows no longer say SAID, so a documented position is tagged in whatever word is " +
    "left — and the two words this surface must never use are the two it would fall back to");
  ok(!/>RECORD<|>PATTERN<|pdxst-pat/.test(saidCode),
    "the word-first letterhead labels a stated position RECORD or PATTERN, or paints it with the " +
    "characterisation engine's own chip — nothing here has performed a characterisation");
  has(said, "var st = r && r.stance;",
    "the side word is no longer read off the shared stance object, so the row, the tree's leaf and " +
    "the dossier can hold two opinions about one position");
  ok(!/\bparty\b|\bpartyOf\b|\bpty\b/i.test(saidCode),
    "the word-first letterhead reads a party letter — a side inferred from party is not a position " +
    "anyone stated");
  has(said, "if (!(st.source && st.source.url)) continue;",
    "an uncited position counts toward the brief, and an uncited position is the one thing this " +
    "product declines to publish, let alone lead a file with");
  // THE TWO SENTENCES, whole. Harnesses assert them character for character.
  has(said, "var SAID_EYEBROW = 'What they have said — no formal term on file yet';",
    "the eyebrow no longer says which lane this is and what the other lane's silence means");
  has(said, "var SAID_NOTE = 'No roll call or signed act on file. These are documented positions, " +
    "not a voting pattern.';",
    "the honest line moved — it is the only claim in this block about the formal record, and it has " +
    "to keep making the narrowest true one");
  has(said, "'<ul class=\"pdxwa-said-list\">'",
    "the word-first list wears pdxwa-shape-list, the marker that says the top of this file named " +
    "this person's FORMAL patterns — it names none, and the standout strip below would stand down " +
    "for a claim nobody made");
  // ── the word-first letterhead's mount (v168) ──────────────────────────────
  // ONE QUESTION AND ONE EARLY RETURN, above every record branch. Anything more
  // in this span is a second opinion about which lane leads.
  const saidMount = wa("the word-first letterhead's mount");
  has(saidMount, "var said = saidLead(pid, p);",
    "the letterhead no longer asks the word-first gate, so the class of file the block was written " +
    "for cannot reach it");
  has(saidMount, "if (said) return saidBriefHtml(pid, p, said);",
    "the mount renders something other than what the gate measured, so the decision and the block " +
    "can disagree about the same person");
  {
    const c = saidMount.replace(/^\s*\/\/.*$/gm, "").split("\n").map((l) => l.trim())
      .filter(Boolean).join(" ");
    eq(c, "var sh = FPI.shape(pid); if (!sh) return ''; var said = saidLead(pid, p); " +
      "if (said) return saidBriefHtml(pid, p, said);",
      "the word-first mount grew something other than one question and one early return");
  }
  // ── the word-first lane, published (v168) ─────────────────────────────────
  const saidPub = wa("the word-first lane, published");
  has(saidPub, "saidLeadApplies: saidLeadApplies,",
    "the word-first predicate is no longer published, so the two-jobs explainer has to re-derive " +
    "which of its two jobs is the main view on this file");
  has(saidPub, "SAID_EYEBROW: SAID_EYEBROW,", "the eyebrow is no longer a published constant");
  has(saidPub, "SAID_NOTE: SAID_NOTE,", "the honest line is no longer a published constant");
  {
    const c = saidPub.replace(/^\s*\/\/.*$/gm, "").replace(/'[^']*'/g, "''");
    ok(!/[(){}]/.test(c),
      "the word-first export seam grew something other than name-to-name export lines");
  }
  // ── the one-line finding, published (v147) ────────────────────────────────
  const oneLinePub = wa("the one-line finding, published");
  has(oneLinePub, "recordLine: recordLine,",
    "the card-length finding is no longer published, so a card and a profile agreeing can only be " +
    "inferred from two rendered strings");
  has(oneLinePub, "shapeRowSay: shapeRowSay,", "the shared row sentence is no longer published");
  {
    const c = oneLinePub.replace(/^\s*\/\/.*$/gm, "").replace(/'[^']*'/g, "''");
    ok(!/[(){}]/.test(c), "the one-line export seam grew something other than name-to-name export lines");
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

  // ── the empty formal lane's veto (v163) ───────────────────────────────────
  // SIX SPANS, AND THE FLOORS ARE INSIDE TWO OF THEM, so this is the one place in
  // this file where an argument has to pin arithmetic rather than copy. It pins it
  // character for character: both floor comparisons, the pct expression and the
  // fallback ladder are asserted verbatim, and the only thing the veto may be is a
  // NEGATED CONJUNCTION in front of them — a term that can subtract a percentage
  // and can never add one. Everything else argued here is a reader or a sentence.
  const readers = wa("the empty formal lane's readers");
  has(readers, "function formalLaneReadable(pid, tested, p) {",
    "the one predicate every surface's silence comes from is gone, so each surface decides for " +
    "itself whether an office has a formal record — which is how two faces of one profile come to " +
    "disagree about whether the file is empty");
  has(readers, "var fpi = cs && cs.formalPatternIndex;", "the pattern index is no longer asked");
  has(readers, "var xs = cs && cs.execRecordSummary;", "the executive lane's own index is no longer asked");
  has(readers, "var fx = window.PDXFormalIndex;", "the generated act table is no longer asked");
  has(readers, "if (t && t.basis && t.basis !== 'pledge-ledger') return true;",
    "the read's own tested set is no longer asked — the cheapest positive knowledge there is, and " +
    "the one reader that cannot be cold");
  has(readers, "if (rows.length > 0) return true;",
    "a pattern row has to be READABLE to count as a lane again. /p/trump is 37 rows, none of them " +
    "warm, over 34 executive acts and a legitimate 71% — gating on the printability flag deletes a " +
    "president's number to fix a governor's");
  has(readers, "if (a === null || b === null || c2 === null) return true;",
    "the readers stopped failing OPEN. A file that cannot be asked is never called empty, and an " +
    "index that has not booted answers null, not no");
  has(readers, "if (!castsNoFloorVotes(pid, p)) return true;",
    "the gate lost its office scope, which is the difference between a standing fact and a fetch " +
    "still in flight: an empty pattern index means \"this office casts no floor votes\" for a " +
    "governor and \"the roll calls have not landed yet\" for a member of Congress, and roll calls " +
    "are fetched per member");
  has(readers, "if (LEGISLATIVE_OFFICE.test(office)) return false;", "the legislative exclusion is gone");
  has(readers, "if (LOCAL_OFFICE.test(office)) return false;", "the local-office exclusion is gone");
  has(readers, "return STATEWIDE_EXEC_OFFICE.test(office);",
    "the scope stopped being a named list of statewide executive titles — an office read as exec by " +
    "elimination is every unlabelled row in the roster");
  has(readers, "var NO_FORMAL_LANE_COPY =",
    "the sentence a reader is shown in place of the number is no longer one constant, so each " +
    "surface spells its own version of the same claim");
  {
    const c = readers.replace(/^\s*\/\/.*$/gm, "").replace(/'[^']*'/g, "''");
    ok(!/MIN_TESTED_ITEMS|MIN_TESTED_WEIGHT|EVIDENCE_CAP|publishable/.test(c),
      "a reader reaches for a floor. The readers answer one yes/no question — does a formal row " +
      "exist for this pid — and the floors are read()'s, one span below");
    ok(!/Math\.|toFixed|\*\s*100|\/\s*100/.test(c),
      "the readers grew arithmetic. Nothing here scores, and nothing here may compose a figure");
    ok(!/\.party\b|Republican|Democrat|GOP/i.test(c), "a reader reads a party");
    ok(!/\.push\(|\.sort\(|localeCompare|Object\.keys/.test(c),
      "a reader builds, ranks or sweeps something — every one of them is a question put to an index " +
      "that already exists, and an index this pass filled in itself would be an invented record");
    ok(!/%/.test(c),
      "the empty-lane copy carries a percentage — this span exists to say there is none. (The prose " +
      "above the readers quotes /p/cox's 56% and /p/trump's 71%, so the comments are stripped first.)");
  }

  // Second span: the veto, and both floors under it.
  const veto = wa("the empty lane's veto, and both floors under it");
  has(veto, "var laneEmpty = !formalLaneReadable(pid, tested, p);",
    "the veto no longer asks the one predicate, so read() answers a question no other surface can");
  // THE PUBLICATION RULE, PINNED BY SHAPE RATHER THAN BY ONE SPELLING. This used
  // to be a byte match on the single-veto form. Wave E1 (v165) added a SECOND
  // veto in front of the same two floors — an exec whose formal lane is full but
  // whose tested items are all pledge ledger — and a byte match cannot tell that
  // apart from a floor being loosened, which is the thing it exists to catch. So
  // the claim is asserted directly instead, and it is the stronger reading of the
  // same promise: both floors keep their constants and their operators byte for
  // byte, and everything in front of them is a NEGATED term joined by `&&` — the
  // only form that can subtract a percentage without ever adding one. A new veto
  // is admitted; a new alternative, a bare term or a moved floor is not.
  {
    const m = /var publishable = ([\s\S]*?);\n/.exec(veto);
    ok(!!m, "read() no longer declares `publishable` in this span, so no floor is pinned at all");
    const terms = (m ? m[1] : "").split("&&").map((t) => t.trim());
    const floors = terms.slice(-2).join(" && ");
    ok(floors === "tested.length >= MIN_TESTED_ITEMS && wN >= MIN_TESTED_WEIGHT",
      "THE PUBLICATION RULE CHANGED SHAPE. Both floors, both constants and both operators are " +
      `pinned here byte for byte, and they now read ${JSON.stringify(floors)}`);
    const vetoes = terms.slice(0, -2);
    ok(vetoes.length >= 1, "the veto in front of the floors is gone — the floors alone let an empty lane publish");
    for (const t of vetoes) {
      ok(/^![a-zA-Z_$][\w$]*$/.test(t),
        `\`${t}\` is not a negated boolean. Every term in front of the floors subtracts: a term that ` +
        "can be TRUE on its own is a way to publish that the floors never approved");
    }
  }
  has(veto, "var laneUntested = formalActsTestNothing(pid, tested, p);",
    "the second veto no longer asks its own predicate. A lane that is on file and tests nothing is " +
    "not the same silence as a lane that is empty, and read() owns both");
  has(veto, "var pct = publishable && wN ? Math.round(wSum / wN) : null;",
    "the percentage is no longer taken from the gate above it, character for character");
  has(veto, "var token = publishable ? outcomeToken\n              : (warming ? 'pending' : (items.length ? 'limited' : 'no_stance'));",
    "the fallback ladder moved. `no_record` is the more exact word for an empty formal lane than " +
    "`limited` and it is deliberately NOT taken: the ladder answers for every unpublished read in " +
    "the product, so relabelling one rung moves the verdict word on hundreds of profiles that were " +
    "never wrong");
  {
    const c = veto.replace(/^\s*\/\/.*$/gm, "").replace(/'[^']*'/g, "''");
    ok(!/publishable\s*=\s*[^;]*\|\|/.test(c),
      "the veto became an ALTERNATIVE to the floors rather than a term added to them — one `||` here " +
      "and an empty lane starts publishing what the floors just refused");
    ok(!/MIN_TESTED_ITEMS\s*[-+*\/]|MIN_TESTED_WEIGHT\s*[-+*\/]/.test(c),
      "a floor is arithmetic here instead of a constant, which is how a floor gets lowered in a " +
      "pass that says it lowered nothing");
    ok(!/laneEmpty\s*=\s*(?:true|false)/.test(c),
      "the veto is hard-coded rather than read, so the gate stops answering per office");
  }

  // Third span: the sentence a reader is shown instead of the number.
  const thin = wa("the thin copy's empty-lane sentence");
  has(thin, "if (c.warming) return 'Checking '",
    "the warming sentence left the branch above the empty-lane one");
  has(thin, "if (noFormalLane(pid, r, p)) return NO_FORMAL_LANE_COPY;",
    "the thin copy no longer says which gap this is, so an office with no formal acts on file reads " +
    "as a person with a thin record");
  ok(thin.indexOf("if (c.warming) return 'Checking '") < thin.indexOf("if (noFormalLane("),
    "THE EMPTY-LANE BRANCH MOVED ABOVE THE WARMING BRANCH — a lane still being fetched would then " +
    "be called an empty one, which is the one thing this whole gate exists to avoid");
  {
    const c = thin.replace(/^\s*\/\/.*$/gm, "").replace(/'[^']*'/g, "''");
    ok(!/MIN_|publishable|Math\./.test(c), "the thin copy tests a floor or scores");
  }
  ok(!/%/.test(thin), "the thin copy prints a percentage");

  // Fourth span: the letterhead's call into it.
  const thinCall = wa("the letterhead's thin-copy call");
  has(thinCall, "? esc((v && v.short) || '')", "the letterhead's verdict branch moved");
  has(thinCall, ": esc(thinCopy(r, name, pid, p))) +",
    "the letterhead stopped handing thinCopy the pid and the profile, and the office question " +
    "cannot be answered without them — dhenderson has no roster row, so a read alone reads as no " +
    "office at all");
  {
    const c = thinCall.replace(/^\s*\/\/.*$/gm, "").replace(/'[^']*'/g, "''");
    ok(!/scopedRead\(|read\(pid/.test(c), "the letterhead takes a second read to print one sentence");
    ok(!/%/.test(c), "the letterhead's thin clause grew a percentage");
  }

  // Fifth span: one rung on the ring's waiting ladder.
  const heroLane = wa("the hero ring's empty-lane sub-line");
  has(heroLane, "else if (noFormalLane(pid, r, p)) sub = 'No formal record on file to test against';",
    "the ring's sub-line no longer says the formal lane is empty, so the rungs below it answer " +
    "instead — and every one of them is a false sentence here");
  // THE FLOOR PHRASINGS ARE OUTSIDE THIS SPAN AND STILL PINNED, which is what
  // makes "the new rung sits above them" a fact about the file rather than a claim
  // about it: the span ends at `else if (!c.scorable)`, so "N on file, none tested
  // yet" and "N of 3 tested needed" are in the byte-compared half. On /p/cox the
  // last of those read "9 of 3 tested needed" under a suppressed number — the
  // pledge ledger clears a three-item floor on its own — and it is the sentence
  // the new rung exists to reach first.
  ok(!/tested needed|none tested yet|c\.scorable/.test(heroLane.replace(/^\s*\/\/.*$/gm, "")),
    "a floor phrasing moved INTO the empty-lane span, out of the half that is compared byte for " +
    "byte against HEAD — the new rung is above the floor rungs by construction, and this is the " +
    "assertion that keeps it that way. (The note inside the span QUOTES the last of those " +
    "sentences, so the comments come off first.)");
  {
    const c = heroLane.replace(/^\s*\/\/.*$/gm, "").replace(/'[^']*'/g, "''");
    ok(!/figure\(|fig\.|Math\.|publishable/.test(c),
      "the new rung sizes or scores something — the ring's figure is taken one span above this and " +
      "printed, never recomputed");
  }
  ok(!/%/.test(heroLane), "the ring's empty-lane rung prints a percentage");

  // Sixth span: the predicate, published.
  const lanePub = wa("the empty-lane predicate, published");
  has(lanePub, "formalLaneReadable: formalLaneReadable,", "the predicate is no longer published");
  has(lanePub, "noFormalLane: noFormalLane,",
    "the question a caller holding a read asks is no longer published, so the card score slot every " +
    "browse and compare surface routes through has to re-derive it from the indexes");
  has(lanePub, "castsNoFloorVotes: castsNoFloorVotes,", "the office scope is no longer published");
  has(lanePub, "NO_FORMAL_LANE_COPY: NO_FORMAL_LANE_COPY,",
    "the reader's sentence is no longer published as one constant");
  {
    const c = lanePub.replace(/^\s*\/\/.*$/gm, "").replace(/'[^']*'/g, "''");
    ok(!/[(){}]/.test(c), "the empty-lane export seam grew something other than name-to-name export lines");
    // Not /FLOOR/i: castsNoFloorVotes is one of the four names, and the word in it
    // is the roll-call floor of a chamber, not a publication floor.
    ok(!/MIN_|_FLOOR|pct|percent|party/i.test(c),
      "the empty-lane export seam publishes a floor, a percentage or a party alongside its four names");
  }

  // ── EVERY CARVED SPAN, ARGUED ─────────────────────────────────────────────
  const unspent = WA_SEAMS.map((s) => s[2]).filter((why) => !spent.has(why));
  eq(unspent.join(" | "), "",
    `word-action.js has ${unspent.length} span(s) carved out of every wave's byte-freeze and argued ` +
    "by nobody — a seam names bytes a pass is allowed to change, so the arguments here are the only " +
    "thing left holding them");
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
/**
 * cmp-data.js — AN OFFICE LABEL MOVED, AND NOTHING ELSE DID (v168).
 *
 * THE ROSTER IS IDENTITY, so waves pin this file byte for byte and they are right
 * to: an admission, a dropped row or a re-pointed district is exactly the kind of
 * change that must never arrive as a side effect. But a roster row can also be
 * WRONG, and this one was — phil_lyman was filed as "Governor Candidate" after he
 * had entered the UT-3 House race, so the live file, the roster and every card
 * that quotes the office disagreed with each other.
 *
 * The narrower invariant a byte pin was standing in for: NO ROW APPEARED, NO ROW
 * VANISHED, and every field of every row is byte-identical to HEAD except the
 * office label of the pids the caller names. A caller passes the offices it means
 * to have corrected; anything else that moved fails here, and the failure names
 * the line rather than the file. Callers: F10, F11 and the All-Seeing Eye's
 * record-first suite, each of which boots this file to measure something else.
 */
export function assertRosterOfficeIsTheOnlyMove(api, headSrc, treeSrc, allowed, wave) {
  const { ok, eq } = api;
  const tag = wave ? `${wave}: ` : "";
  const a = String(headSrc).split("\n"), b = String(treeSrc).split("\n");
  if (!eq(b.length, a.length,
    `${tag}cmp-data.js gained or lost lines — an office correction rewrites one value in place, and a ` +
    "roster that changed length has admitted or dropped somebody")) return;

  // WHICH LINES MOVED, AND WHAT IS ON THEM. Same length and same order, so a
  // positional walk is the whole comparison; each side of a moved pair has to be
  // an office value, and the value on our side has to be one the caller declared.
  const moved = [];
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) moved.push([i + 1, a[i], b[i]]);
  const OFFICE = /^\s*"office":\s*".*",?$/;
  const bad = moved.filter(([, x, y]) => !OFFICE.test(x) || !OFFICE.test(y));
  eq(bad.map(([n]) => `line ${n}`).join(", "), "",
    `${tag}cmp-data.js changed ${bad.length} line(s) that are not an office label — this file names who ` +
    "exists, and only the office copy was open to correction");
  const got = moved.map(([, , y]) => (y.match(/"office":\s*"([^"]*)"/) || ["", ""])[1]).sort();
  eq(got.join(" | "), (allowed || []).slice().sort().join(" | "),
    `${tag}cmp-data.js corrected an office this caller does not declare`);

  // AND THE ROSTER STILL NAMES THE SAME PEOPLE. Cheap and independent of the walk
  // above: every pid key in HEAD is still a pid key here, and no key was added.
  const pids = (src) => (String(src).match(/^\s*"([a-z0-9_]+)":\s*\{$/gm) || []).sort().join(",");
  eq(pids(treeSrc), pids(headSrc),
    `${tag}the roster's set of people changed — an office correction admits nobody and drops nobody`);
  ok(moved.length > 0,
    `${tag}cmp-data.js is byte-identical to HEAD, so this waiver is being spent on nothing — drop the ` +
    "call and put the file back on the pinned list");
}

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
  // The pinned half, with the ONE argued span cut out of both sides. AT_SEAMS is
  // empty of everything a caller here cares about (see the note over it), and a
  // seam whose anchors have moved or stopped being unique fails as a failure
  // rather than quietly comparing the wrong bytes.
  const cut = (src, side) => {
    for (const [a, b, why] of AT_SEAMS) {
      const one = (x) => src.split(x).length === 2;
      if (!ok(one(a) && one(b) && src.indexOf(b) > src.indexOf(a),
        `${tag}the seam for ${why} no longer reads as written in alignment-tool.js (${side}) — widen the anchor here, do not loosen the check`)) return src;
    }
    return carveSeams(src, AT_SEAMS, side, "alignment-tool.js", (c, m) => ok(c, m)).pinned;
  };
  eq(cut(B.after, "now"), cut(A.after, "HEAD"),
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
