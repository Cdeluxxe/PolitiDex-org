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

// ── stance-helpers.js: one span, the record-CTA stats ────────────────────────
export const SH_SEAMS = [
  ["    var formal = 0;\n",
   "\n  window._pdxStanceRecordStats = _pdxStanceRecordStats;",
   "the record-CTA stats"],
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

// ── word-action.js: three spans — the gate, and the two mounts ───────────────
export const WA_SEAMS = [
  ["  function shapeRowsHtml(rows, pid, mount) {\n    return (rows || []).map(function (x) { return shapeRowHtml(x, pid, mount); }).join('');\n  }\n",
   "  function shapeHeroHtml(pid, p) {\n",
   "the slice gate and its locked copy"],
  ["          '<p class=\"pdxwa-shape-depth\">' + depth + '</p>' +\n",
   "          '<button type=\"button\" class=\"pdxwa-shape-all\"'",
   "the letterhead's mount"],
  ["    var total = opts.total || sh.issues;\n",
   "        exploreAllHtml(total) +",
   "the brief's mount"],
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
 * Which list a body array came from is decided by its length: the three lists are
 * distinct lengths and a suite hands over exactly one of them. If that ever stops
 * being true, pass the list rather than guessing it — do not relax the lookup.
 */
function seamListFor(bodies) {
  const n = (bodies || []).length;
  const lists = [CJ_SEAMS_ALL, CJ_SEAMS, CJ_SEAMS_BELOW];
  const hit = lists.filter((l) => l.length === n);
  return hit.length === 1 ? hit[0] : null;
}
function byWhy(bodies, api) {
  const list = seamListFor(bodies);
  api.ok(!!list, `consistency.js was carved into ${(bodies || []).length} spans, which is not one of the ` +
    "declared seam lists in scripts/v103-chrome-seams.mjs — a seam was added to the module and not to the caller");
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
  const cut = byWhy(bodies, api);
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

  // And the export spans, wherever the caller cut them from.
  ok(!below || seamListFor(below) === CJ_SEAMS_BELOW,
    "the lower half of consistency.js was carved with something other than CJ_SEAMS_BELOW");
  assertConsistencyExportSeams(below || CJ_SEAMS_BELOW.map(([, , why]) => cut(why)), api);
}

/**
 * Argue what is inside consistency.js's export spans. Separate because they sit
 * below the _DOS_MECH literal, and the suites that cut this file in half at that
 * literal hand over the two halves' bodies as two arrays.
 */
export function assertConsistencyExportSeams(bodies, api) {
  const { ok } = api;
  const strip = (t) => t.replace(/^\s*\/\/.*$/gm, "").replace(/'[^']*'/g, "''");
  const cut = byWhy(bodies, api);
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

/** Argue what is inside word-action.js's three spans. */
export function assertWordActionSeams(bodies, api) {
  const { has, eq, ok } = api;
  // ── seam A: the gate ──────────────────────────────────────────────────────
  // The copy is locked, in two forms and no third, and it carries no party, no
  // rate and no verdict about the person.
  const gate = bodies[0];
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
  has(bodies[1], "tops + splits + thin + sliceNoteHtml(pid, sh) +",
    "the letterhead mounts the slice note somewhere other than under its pattern list");
  has(bodies[2], "tops + splits + none + thin + sliceNoteHtml(pid, sh) +",
    "the brief mounts the slice note somewhere other than under its pattern list");
  for (const i of [1, 2]) {
    ok(!/\d\s*%|toFixed/.test(bodies[i]), "a mount grew a figure of its own");
    ok(bodies[i].split("sliceNoteHtml").length === 2, "a mount calls the slice note more than once");
  }
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
  eq(B.before, A.before,
    `${tag}alignment-tool.js changed ABOVE the parent table — ISSUE_MAP itself, the alignment ` +
    `engine and every scope note live there, and a wave that adds no key moves none of them`);
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
