/* ─────────────────────────────────────────────────────────────────────────────
   stance-tree.js — 🌳 THE TOPIC TREE OF STANCES
   ─────────────────────────────────────────────────────────────────────────────
   The profile's browse-all-stances surface. It replaces a FLAT WALL — Stance at
   a Glance, an alphabet-soup list of documented positions with no grouping, no
   colour and no record beside it — with a collapsible tree a reader can actually
   sort themselves through: broad topic → (optional) mid → the issue we track.

   WHAT IS NEW HERE IS THE ARRANGEMENT. Nothing on this surface is computed by
   this file. Every leaf reads exactly two shared engines:

     · PDXConsistency.issueRows(pid)        — the one row model. `stance` is what
       they SAID (off _polPositionMap, through positionStance), `label`, `category`
       and the rest are the row's own fields.
     · PDXConsistency.recordPattern.display(r) — the row's RECORD SLOT: which of
       five states the formal record on this issue is in (scored / direction /
       on file / pending / none), its label, its depth, and Direction Match's own
       percentage where that issue was tested. It reads the five-rung pattern
       engine, the executive action index and the row's own resolved result; it
       computes no score and moves no threshold.

   So a threshold cannot drift between this tree and the row faces, the Official
   Record or the full formal-pattern index: there is one place to move it, and it
   is not in this file.

   ONE FORMAL ITEM IS ALREADY A RECORD — for DISPLAY. A single mapped vote, or a
   single executive action, is enough for a leaf to appear and for its 🏛 Record
   slot to say something true, labelled at its real depth ("Thin · 1 vote — early
   signal"). That is a presentation rule and it is only a presentation rule: the
   scoring floors it does not touch are listed under wall 1. One item is the start
   of a pattern, time can strengthen or reverse it, and hiding it until it reaches
   a scoring threshold is the failure mode this surface exists to undo.

   THE FIVE WALLS, and they are the reason this file is allowed to print the word
   "opposes" next to a person's name twice on one line:

     1. NO SCORE OF ITS OWN, AND NO SCORE WHERE ONE WAS NOT EARNED. The only
        percentage this module can print is Direction Match's own figure for that
        one issue, read off the shared row result, and only on a leaf whose record
        slot is in the `scored` state — the state that exists because Direction
        Match tested it against its own floors. Nothing here averages, aggregates,
        rounds or re-derives a percentage: a branch has none, a pattern-only leaf
        has none, a thin record has none, and a row the public record decided has
        none on this surface. The floors themselves (MIN_TESTED_ITEMS,
        MIN_TESTED_WEIGHT, the record engine's member and judged floors) are not
        read here and not lowered anywhere: a one-item issue shows a Record LINE,
        never a number.
     2. BROAD NODES ARE NAVIGATION, AND THEY MAY DESCRIBE WHAT IS UNDER THEM.
        A branch face carries an icon, a name, a COUNT of the issues filed under
        it, and a STATE SUMMARY of the leaves currently visible beneath it — "2
        cuts against · 1 mixed · 3 aligns", in the bands' own lower-case words,
        counting rows. What it still carries is no percentage, no ratio, no tier
        word, no direction of its own and no word that reads as a grade on the
        topic: a topic is not a thing a person can be scored on, and rolling
        thirteen leaves up into one BADGE is how a taxonomy quietly becomes a
        scoreboard. Counting the states underneath is the opposite move — it is
        what stops a closed branch from hiding the row that mattered.
     3. SAID AND RECORD ARE TWO DIFFERENT CLAIMS, SIDE BY SIDE. `Said:` is theirs.
        `🏛 Record:` is the formal record's. They sit in adjacent slots on one line
        precisely so a reader can see them disagree — which is why the alignment
        cue is only ever printed when BOTH halves exist.
     4. PATTERN-ONLY ROWS ARE MARKED, EVERY TIME. An issue with a readable formal
        pattern and no stated position on file still belongs on a browse-all
        surface — sixty-odd of them exist, and filing them under "nothing known"
        is the framing this tree undoes. But it is not a stance, so the row says
        so in its own text ("Pattern only · Not in Direction Match"), in its
        accessible name (the full sentence), in its skin (dashed rail, no fill)
        and in the tree's own disclosure line. Nothing here writes to a position
        map: this module never calls _polPositionMap and has no write path to it.
     5. THIN STAYS THIN, AND SAYS SO. A one-to-three-item run is admitted (it is
        true) and is never dressed as a tendency: it keeps the pattern engine's own
        `thin` weight class, it sorts below every read that earned a direction, a
        pattern-only thin row is additionally marked quiet, and a ONE-ITEM record
        additionally prints the horizon out loud — "early signal; more votes can
        change this" — on the row, in its title and in its accessible name. A
        record the engine will not characterise is still not given a direction: it
        prints the inventory it holds and the reason no direction is claimed.

   ─────────────────────────────────────────────────────────────────────────────
   THIS SURFACE IS A GATEWAY, NOT A SECOND REPORT. Three steps, and the language
   gets more precise at every one of them:

     1 · BROAD TOPIC (a closed branch face). Direct language and numbers only —
         the topic's own name, how many issues are filed under it, and the state
         of those issues in the bands' own words, worst first. "Economy,
         Inflation & Cost of Living · 9 issues · 4 mixed". No per-issue prose
         belongs on a closed face; a reader at this level is choosing a topic.
     2 · SUB-TOPICS (the leaves inside an open branch). The precise issue name and
         a denser summary of it: what they SAID, what the formal RECORD did, the
         depth behind that read, the early-signal horizon when the depth is one,
         Direction Match's own % where that issue was scored, and the alignment
         cue. Enough to decide WHICH ONE TO OPEN, and deliberately not more.
     3 · THE DOSSIER (a tap on a leaf). The existing issue dossier for this
         politician × this issue — the full deep dive, unchanged, opened through
         the same public entry every other surface opens it through.

   THERE IS NO FOURTH SURFACE. This module renders no report of its own, opens no
   view of its own and navigates to no route: the deepest thing it can do is hand
   a pid and an issue key to the dossier that already exists.

   NO PARTY FRAMING. Party is not read, not mapped and not mentioned; the only
   grouping axis is the issue taxonomy the site already ships.

   ─────────────────────────────────────────────────────────────────────────────
   WHAT A READER ACTUALLY DOES WITH THIS SURFACE decides three more things, and
   all three are presentation: they change what is shown first, not what is true.

     · TENSION ORDER (see BAND). Branch ORDER is the taxonomy's, always, so the
       tree reads the same on every profile — but the order of leaves, the flat
       list and the branch that opens by default all read one sort key, and that
       key puts said-vs-record disagreement first. Nobody should have to walk
       seven taxonomy branches to find the row where the two halves disagree.
     · FILTERS (see FILTERS). Ten chips, one active at a time, each of them a
       VIEW: it hides rows and touches nothing else. An empty one says so in
       words rather than rendering an empty tree. Three of the ten read the
       formal pattern engine's own characterisation — record supports, record
       opposes, split — and they select the rows it actually characterised, in
       its words, with no figure of their own.
     · FLAT MODE (see FLAT). At or under the threshold, the topic accordions are
       pure tap tax — five one-row branches to open one at a time — so the same
       leaves render as one flat list in tension order. Above it, the tree.
   ─────────────────────────────────────────────────────────────────────────────

   ─────────────────────────────────────────────────────────────────────────────
   THE GROUPING MAP is CORE_NATIONAL_ISSUES (alignment-tool.js) in its own order,
   plus ONE explicit trailing node. 21 ISSUE_MAP keys belong to no core issue
   (campaign finance, privacy, government transparency, the public-lands cluster,
   the family/infrastructure/tech/reform clusters). Filing them under the nearest
   core colour would state a taxonomy relationship we do not have, so they get
   their own node on PDXIssueColors.FALLBACK — the neutral grey the colour system
   already reserves for exactly this.

   COLOUR comes from PDXIssueColors.styleFor(issueKey), which resolves a leaf key
   to its core issue itself. Branch and leaf therefore paint from the same four
   custom properties the rest of the site paints from, and an issue is the same
   colour here as it is on a row, in a dossier and on the alignment tool.
   ───────────────────────────────────────────────────────────────────────────── */
(function () {
  'use strict';

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
  function escAttr(s) {
    return esc(s).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function norm(s) { return String(s == null ? '' : s).trim().toLowerCase(); }
  var _seq = 0;

  // ── SAID: the four faces of the stated side ───────────────────────────────
  // Three of them are the house's own stance vocabulary (_OR_STANCE in
  // consistency.js) and the fourth is the honest absence. `none` is a statement
  // about OUR FILE, not about the person — "No stated position" means we hold no
  // sourced position, and its grey says so rather than implying a refusal.
  var SAID = {
    support: { key: 'support', label: 'Supports', c: '#4ade80', ico: '👍' },
    oppose:  { key: 'oppose',  label: 'Opposes',  c: '#f87171', ico: '👎' },
    mixed:   { key: 'mixed',   label: 'Mixed',    c: '#f5c842', ico: '⚖️' },
    none:    { key: 'none',    label: 'No stated position', c: '#8fa6c6', ico: '·' }
  };
  var SAID_DIR = { support: 1, oppose: -1, mixed: 0 };

  // ── THE ALIGNMENT CUE ─────────────────────────────────────────────────────
  // Four words, printed at the end of a leaf, and the first three are ONLY ever
  // printed when both halves of the line exist. "Cuts against" is deliberately
  // the phrase the public-record lane already uses for "runs against the position
  // they stated" (_SD_DIR.contradicts.word) — the same relation should not have
  // two names on one profile.
  //
  // The cue is a RELATION, not a result. It compares two facts already on the
  // line; it has no threshold of its own, no weight, and nothing sorts a score on
  // it. `split` covers both ways the comparison can refuse to resolve: a stated
  // Mixed, or a record that ran both ways.
  var CUES = {
    aligns:       { key: 'aligns', label: 'Aligns', tone: 'agree',
      note: 'Their stated position and the direction of their formal record point the same way.' },
    cuts_against: { key: 'cuts_against', label: 'Cuts against', tone: 'tension',
      note: 'Their stated position and the direction of their formal record point opposite ways.' },
    split:        { key: 'split', label: 'Split', tone: 'mixed',
      note: 'One side of this is mixed, so the two cannot be said to agree or disagree.' },
    pattern_only: { key: 'pattern_only', label: 'Pattern only', tone: 'muted',
      note: 'There is no stated position on file for this issue, so there is nothing to compare the record against.' }
  };

  // The pattern-only disclosure, in one place, printed in three: the leaf's own
  // accessible name, the leaf's title, and the tree's visible footer whenever any
  // pattern-only leaf is on screen. Worded as three separate denials on purpose —
  // a reader who reads only the tag ("Not in Direction Match") still gets the one
  // that matters most.
  var PATTERN_ONLY_NOTE = 'Inferred from the formal record pattern — this is not a quoted stance, ' +
    'and it is not counted in Direction Match.';
  var PATTERN_ONLY_TAG = 'Not in Direction Match';
  // ── THE BASELINE, IN THE SAID SLOT ────────────────────────────────────────
  // The Said slot on a pattern-only leaf used to be one grey word: "No stated
  // position". True, and a statement about OUR FILE that reads as a statement
  // about them — printed directly beside a Record chip carrying twelve roll calls
  // that all went the same way. Where the shared derivation (PDXConsistency
  // .baseline) reads a side off that record, the slot carries THAT side instead,
  // under its own label so it can never be mistaken for something they said:
  // "Baseline: Supports · from the record".
  //   IT IS THE SAME READ AS THE CHIP BESIDE IT. The word comes from the shared
  // baseline, which comes from the formal-pattern index, which is what the Record
  // chip is already printing — one derivation, two projections of it, so the two
  // halves of a leaf cannot disagree. `said.stated` stays false, `patternOnly`
  // stays true, the "Not in Direction Match" tag stays on the row, and the
  // With-stance filter still means what it always meant.
  var BASELINE_LABEL = 'Baseline';
  var BASELINE_FROM = 'from the record';
  var BASELINE_NOTE = 'No stated position on file, so the direction of the formal record itself ' +
    'stands in as the baseline. It is a reading of the votes, not a quoted stance, and it is not ' +
    'counted in Direction Match.';
  // ── AND WHAT THE RECORD RODE IN ON ──────────────────────────────────────────
  // A leaf is one line, so this is the shortest true form of the disclosure: a
  // tag saying the formal signal on this issue travelled inside a larger measure
  // rather than as a vote on the issue. The full sentence and the bill numbers are
  // on the title and in the accessible name, and the row's own dossier holds the
  // instruments. Nothing is derived here — PDXConsistency.vehicle.read is the same
  // read the index row and the record chip use, so a leaf cannot disagree with the
  // row it opens. It changes no slot, no cue, no band and no ordering.
  var VEHICLE_TAG = 'In a package';
  var TREE_NOTE = 'Said is their own stated position. 🏛 Record is what the formal record on file ' +
    'did — one item is enough to show a line, and the depth beside it says how much is behind it. ' +
    'Where Direction Match has tested an issue the slot carries that verdict and its %; a record with ' +
    'no result behind it is a description of the record only, never a stated position and never ' +
    'counted in Direction Match.';
  // A SCORED ROW'S CUE IS DIRECTION MATCH'S OWN ANSWER, TRANSLATED. The cue compares
  // said against did, and on an issue Direction Match already tested, that comparison
  // has an answer with floors behind it. Deriving a second one here from the record's
  // lean could contradict the verdict word printed one chip to the left — so on a
  // scored row the cue is the verdict token and nothing else. `flag` is a documented
  // red flag on the record, which is tension by definition.
  var VERDICT_CUE = {
    consistent: 'aligns', contradicts: 'cuts_against', flag: 'cuts_against', mixed: 'split'
  };

  // The trailing node. Its key is '' because that is what PDXIssueColors.coreKeyFor
  // returns for an unmapped issue, so the bucket id and the colour lookup agree.
  var OTHER = { key: '', label: '🗂 Other tracked issues',
    blurb: 'Issues we track that sit outside the core national issue set.' };

  // ── THE MID-LEVEL GATE ────────────────────────────────────────────────────
  // A mid level is a cost: one more tap between a reader and the issue they came
  // for. It is worth paying only where a branch is genuinely too long to scan,
  // and it must never appear as a single child wrapping everything (a fake level)
  // or as a scatter of one-leaf boxes (a worse list). So all three conditions:
  // the branch is long, it splits into at least two real groups, and each of
  // those groups holds at least two leaves. Anything that fails the gate renders
  // flat, which is what every real profile does today — the deepest core bundle
  // (Economy, 21 keys) is where this earns its keep.
  //
  // The mid label is the ROW's own `categoryLabel`. No new taxonomy: the row model
  // already carries the coarse category, so a mid heading here cannot disagree
  // with the category shown anywhere else.
  var MID = { minLeaves: 7, minGroups: 2, minPerGroup: 2 };

  // ── GLOBAL TENSION PRIORITY ────────────────────────────────────────────────
  // ONE ORDER, AND IT IS A SORT KEY ONLY. Every leaf carries a BAND, and every
  // decision about what to show first — the order inside a branch, the order of
  // the flat list, which branch opens by default — reads that one key. Six bands,
  // in the order a reader wants them:
  //
  //   0 cuts_against  they stated a position and the formal record runs against it
  //   1 mixed         they stated one and the record ran both ways (or Mixed itself)
  //   2 aligns        they stated one and the record points the same way
  //   3 pattern       nothing stated, and a record with a direction (strong → thin)
  //   4 onfile        formal items on file, no direction read from them
  //   5 nofile        nothing formal on file yet
  //
  // A PATTERN-ONLY ROW CAN NEVER OUTRANK A REAL SAID-VS-RECORD TENSION. Bands 0-2
  // are exactly the rows where both halves of the line exist and were compared;
  // band 3 begins only after all of them. DEPTH breaks ties INSIDE a band — the
  // pattern engine's own weight class, strong before thin, so a one-item read
  // never leads a band it shares with a characterised one — and never across
  // bands.
  //
  // NOTHING ORDINAL HERE IS A JUDGEMENT. A band is not a grade, not a score and
  // not a threshold: no percentage is derived from it, none of the scoring floors
  // is read to compute it, it is not published to the DOM, and the only thing it
  // can change is the order two true rows appear in.
  var BAND = { cuts_against: 0, mixed: 1, aligns: 2, pattern: 3, onfile: 4, nofile: 5 };
  var BANDS = ['cuts_against', 'mixed', 'aligns', 'pattern', 'onfile', 'nofile'];
  // The cue is the comparison; the band is where that comparison sorts. One map,
  // so "split" cannot come to mean two different positions in the order.
  var CUE_BAND = { cuts_against: 'cuts_against', split: 'mixed', aligns: 'aligns' };
  var DEPTH_RANK = { full: 0, thin: 1, flat: 2 };
  function rankOf(band, weight) {
    var b = BAND.hasOwnProperty(band) ? BAND[band] : BAND.nofile;
    var d = DEPTH_RANK.hasOwnProperty(weight) ? DEPTH_RANK[weight] : 3;
    return b * 10 + d;
  }

  // ── THE BRANCH SUMMARY ────────────────────────────────────────────────────
  // A closed branch that says only "Economy · 6 issues" hides the six states
  // underneath it, which is how a reader ends up opening seven branches to find
  // the one that mattered. So the face also carries a short STATE SUMMARY of the
  // leaves visible beneath it — in the BANDS' own words, which are the words the
  // leaf slots and the alignment cues already use. Never a new vocabulary, never
  // a percentage, never a ratio (see wall 2).
  //
  // THE BANDS PARTITION THE BRANCH, so the bits always add up to the count beside
  // them: a reader can check the summary against the count without opening it.
  // "Thin" is not a band because depth is a fact about one row, not a state of
  // the branch — a thin row is counted in its own band and sorts last inside it,
  // and its depth is printed on the row where the item count is.
  var BAND_WORD = {
    cuts_against: 'cuts against', mixed: 'mixed', aligns: 'aligns',
    pattern: 'pattern only', onfile: 'on file', nofile: 'no record yet'
  };
  // Worst tension first, and at most three bits on the face. The whole sentence
  // rides the face's title, and on a phone CSS keeps the count plus the first
  // (worst) bit — which is why the bits are emitted in band order and the extras
  // carry their own class rather than being dropped from the markup.
  var SUMMARY_MAX = 3;
  function summaryOf(list) {
    list = list || [];
    var n = {}, bits = [];
    list.forEach(function (lf) { if (lf && lf.band) n[lf.band] = (n[lf.band] || 0) + 1; });
    BANDS.forEach(function (b) {
      if (n[b]) bits.push({ key: b, n: n[b], label: n[b] + ' ' + BAND_WORD[b] });
    });
    return {
      total: list.length, bits: bits,
      text: bits.map(function (b) { return b.label; }).join(' \u00b7 ')
    };
  }

  // ── THE FILTERS ───────────────────────────────────────────────────────────
  // Ten chips, ONE ACTIVE AT A TIME, and every one of them is a VIEW ONLY. A
  // filter hides rows. It does not touch a row, a record read, a count, a floor
  // or a score; the same leaf says exactly the same thing under every filter, and
  // `all` — the full set, nothing hidden — is the default.
  //
  // PATTERN-ONLY KEEPS EVERY DISCLOSURE UNDER ITS OWN FILTER: the tag on the row,
  // the three denials in the accessible name, the footer note. A screenful of
  // pattern-only rows is where the disclosure matters most, not least.
  //
  // THE CHARACTERISED SET, TAKEN FROM THE ENGINE THAT OWNS IT. `strong` and
  // `mostly` are the two tiers the formal brief counts as characterised (see
  // _FPI_CHARACTERISED in consistency.js) and `split` is its third bucket; this
  // table is the same two names so a row is characterised on the tree if and only
  // if it is characterised in the brief. Nothing here reads a floor, a score or a
  // percentage: the tier and the tone were decided by the shared record-display
  // accessor before the leaf was built, and this only names them.
  var CHARACTERISED = { strong: 1, mostly: 1 };
  function recTier(lf) { return (lf && lf.record && lf.record.tier) || 'none'; }
  // ONE SIDE, OR NOTHING. `support` and `oppose` are the only two tones a
  // one-sided read carries; `mixed` belongs to Split and `muted` is a refusal, so
  // both fall out here rather than being sorted into a side by default.
  function charSide(lf) {
    if (!CHARACTERISED[recTier(lf)]) return '';
    var tone = (lf.record && lf.record.tone) || '';
    return (tone === 'support' || tone === 'oppose') ? tone : '';
  }
  var FILTER_ALL = 'all';
  var FILTERS = [
    { key: 'all', label: 'All', title: 'Every issue on this tree.', test: null },
    { key: 'stance', label: 'With stance',
      title: 'Issues with a stated position of theirs on file.',
      test: function (lf) { return !!lf.said.stated; } },
    { key: 'cuts', label: 'Cuts against',
      title: 'Their stated position and their formal record point opposite ways.',
      test: function (lf) { return lf.band === 'cuts_against'; } },
    { key: 'aligns', label: 'Aligns',
      title: 'Their stated position and their formal record point the same way.',
      test: function (lf) { return lf.band === 'aligns'; } },
    { key: 'only', label: 'Pattern only',
      title: 'A formal record on file with no stated position to compare it against.',
      test: function (lf) { return !!lf.patternOnly; } },
    { key: 'baseline', label: 'From record',
      title: 'No stated position on file — the formal record\'s own direction stands in as the baseline.',
      test: function (lf) { return !!lf.baseline; } },
    { key: 'onfile', label: 'Formal on file',
      title: 'At least one formal item on the record for that issue.',
      test: function (lf) { return !!(lf.record && lf.record.onRecord); } },
    // ── THE THREE CHARACTERISED VIEWS ───────────────────────────────────────
    // WHICH WAY DID THE RECORD ACTUALLY RUN, asked of the rows where that
    // question has an answer. These three read `record.tier` and `record.tone`
    // and nothing else: the pattern engine's own characterisation, already
    // computed for the chip printed on the row, reused rather than re-derived.
    // So a row selected here says on screen exactly what the chip that selected
    // it says — "Strongly supports", "Mostly opposes", "Split" — and the tree
    // and the formal brief cannot drift into two vocabularies for one read.
    //
    // THIN, UNREAD AND NO-POLE ROWS DO NOT ENTER. `CHARACTERISED` is the brief's
    // own set (strong, mostly) and `split` is the brief's own third bucket; the
    // `thin` tier, the `none` refusal, and the balance/no-pole keys the display
    // bar mutes to `none` all fall outside all three. A reader who taps "Record
    // supports" gets the characterised one-sided rows and not one row more.
    //
    // NOT A TALLY. A chip is a view: it narrows the rows on screen. It carries no
    // figure, so nothing here is a percentage, an approval rating or a
    // profile-wide count of which way a person leans — and Direction Match, which
    // never counts a pattern read, is untouched by every one of them.
    { key: 'recsup', label: 'Record supports',
      title: 'The formal record on that issue ran one way — strongly or mostly supports. ' +
        'A pattern in the votes on file, never counted in Direction Match.',
      test: function (lf) { return charSide(lf) === 'support'; } },
    { key: 'recopp', label: 'Record opposes',
      title: 'The formal record on that issue ran one way — strongly or mostly opposes. ' +
        'A pattern in the votes on file, never counted in Direction Match.',
      test: function (lf) { return charSide(lf) === 'oppose'; } },
    { key: 'recsplit', label: 'Split',
      title: 'The formal record on that issue ran both ways — read as Split, not as a side.',
      test: function (lf) { return recTier(lf) === 'split'; } }
  ];
  // AN EMPTY FILTER SAYS SO, IN WORDS. A filter a profile has no rows for is not a
  // broken tree with nothing in it: it is an answer, and it is one of the more
  // useful answers this surface gives ("nothing on this profile cuts against").
  var EMPTY_NOTE = 'None on this profile.';
  function filterOf(key) {
    for (var i = 0; i < FILTERS.length; i++) if (FILTERS[i].key === key) return FILTERS[i];
    return FILTERS[0];
  }
  function filterLeaves(list, key) {
    var f = filterOf(key);
    list = list || [];
    if (!f || !f.test) return list.slice();
    return list.filter(function (lf) { try { return !!f.test(lf); } catch (e) { return false; } });
  }

  // ── THE FLAT-MODE THRESHOLD, IN ONE PLACE ─────────────────────────────────
  // Under a handful of leaves the accordions cost more than they organise: five
  // one-row branches is five taps to read five rows, which on a phone is the "pure
  // tap tax" this threshold exists to remove. At or below it the same leaves render
  // as ONE FLAT LIST IN TENSION ORDER — same leaf chrome, same dossier door, same
  // filters, no branches; above it, the tree. The count tested is the count of
  // leaves ACTUALLY VISIBLE, so narrowing with a filter drops the chrome too.
  var FLAT = { maxLeaves: 5 };
  function modeFor(n) { return ((n || 0) <= FLAT.maxLeaves) ? 'flat' : 'tree'; }

  // ── THE ORDER CONTROL: TOPIC, OR SHARPEST FIRST ───────────────────────────
  // 🧭 Stances & Connections used to publish the same person×issue set as one
  // globally tension-ranked wall, below this tree. Two full browsers of the same
  // rows in one scroll is what that section cost, and the only thing it could do
  // that the tree could not was rank ACROSS topics — "show me the sharpest thing
  // about this person" is a real question and a topic accordion cannot answer it.
  //
  // So it is a view of this tree, not a second surface: `tension` drops the
  // branches and prints every visible leaf in the shared sortLeaves() order —
  // the SAME comparator the branch panels and the flat mode already use. Nothing
  // is re-scored, nothing is filtered, no leaf says anything different in one
  // order than in the other; only the arrangement changes.
  //
  // FAIL CLOSED. The control is drawn only where the two orders can differ — a
  // view already rendering as one flat list is already in tension order, and an
  // empty view gets the empty note and no controls at all.
  var SORT_TOPIC = 'topic';
  var SORT_TENSION = 'tension';
  var SORTS = [
    { key: 'topic', label: 'Topic', title: 'Grouped by topic, the way the tree files them.' },
    { key: 'tension', label: 'Tension',
      title: 'One list across every topic, sharpest first: where the record pushes back, then mixed, then aligned.' }
  ];
  var SORT_NOTE = 'Sharpest first, across every topic — where the formal record pushes back on ' +
    'what they said, then mixed, then aligned, then what nothing has tested. Same issues, same ' +
    'rows; only the order is different.';
  function sortOf(key) {
    for (var i = 0; i < SORTS.length; i++) if (SORTS[i].key === key) return SORTS[i];
    return SORTS[0];
  }

  function IC() { return window.PDXIssueColors || null; }
  // A key with no core issue is NOT left unstyled: styleFor() answers with the
  // colour system's own neutral (FALLBACK), which is the whole reason that token
  // exists. `on` is the separate question — did this land on a real core issue —
  // and only that gates the coloured dot, so an unmapped issue is painted grey
  // rather than borrowing the colour of whichever topic it was filed near.
  function skinFor(key) {
    var ic = IC();
    if (!ic || typeof ic.styleFor !== 'function') return { style: '', on: false, color: null };
    var on = false, color = null;
    try {
      color = ic.getIssueColor(key) || null;
      on = (typeof ic.isCore === 'function') ? ic.isCore(key) : !!(color && color.mapped);
    } catch (e) { on = false; }
    return { style: ic.styleFor(key), on: !!on, color: color };
  }
  function coreKeyOf(issueKey) {
    var ic = IC();
    try {
      if (ic && typeof ic.coreKeyFor === 'function') return ic.coreKeyFor(issueKey) || '';
    } catch (e) {}
    try {
      var c = (typeof window.coreIssueForKey === 'function') ? window.coreIssueForKey(issueKey) : null;
      return (c && c.key) || '';
    } catch (e2) { return ''; }
  }

  // The grouping map, read live so a new core issue appears here the moment it is
  // declared in alignment-tool.js rather than the next time this file is edited.
  function TOPICS() {
    var out = [];
    try {
      (window.CORE_NATIONAL_ISSUES || []).forEach(function (c) {
        if (c && c.key) out.push({ key: c.key, label: c.label || c.key, blurb: c.blurb || '' });
      });
    } catch (e) {}
    out.push({ key: OTHER.key, label: OTHER.label, blurb: OTHER.blurb });
    return out;
  }

  // ── ONE LEAF ──────────────────────────────────────────────────────────────
  // Returns null for an issue that belongs on no browse surface. The inclusion
  // rule is the brief's, stated once: a leaf appears if a STATED POSITION exists,
  // or if there is at least ONE FORMAL ITEM on file for that issue — one mapped
  // vote, one executive action. It does not wait for a pattern the engine will
  // characterise, and it does not wait for a score.
  //
  // WHY THE BAR IS ONE ITEM AND NOT A PATTERN. The old rule admitted a leaf only
  // where the pattern engine returned a direction, which quietly hid three real
  // situations: an issue with one mapped vote, an issue whose votes the engine
  // declines to characterise, and every issue on the executive lane (where the
  // roll-call pattern engine has no read at all, by design). All three have
  // sourced instruments in the dossier, and filing them under "nothing known"
  // states something false about our own file. The Record slot instead names the
  // state it is actually in — see PDXConsistency.recordPattern.display.
  //
  // WHAT STILL DOES NOT APPEAR: an issue with no stated position AND no formal
  // item on file. Two absences are not a finding, and there is nothing behind the
  // door.
  function leafOf(row) {
    if (!row || !row.key) return null;
    var CS = window.PDXConsistency;
    var stanceKey = (row.stance && row.stance.key) || null;
    var said = SAID[stanceKey] || SAID.none;
    // The record slot, whole, from the shared accessor. Its `state` is the only
    // thing this file branches on and it is never recomputed here.
    var rec = null;
    try {
      if (CS && CS.recordPattern && typeof CS.recordPattern.display === 'function') {
        rec = CS.recordPattern.display(row) || null;
      }
    } catch (e) { rec = null; }
    var onRecord = !!(rec && rec.onRecord);
    if (!stanceKey && !onRecord) return null;

    var patternOnly = !stanceKey;
    // The baseline, from the shared derivation and never re-derived here. Only on
    // a leaf with no stated position — a quote always wins, and the accessor
    // enforces that on its own side too.
    var baseline = null;
    if (patternOnly) {
      try {
        if (CS && CS.baseline && typeof CS.baseline.for === 'function') {
          baseline = CS.baseline.for(row.pid, row.key) || null;
        }
      } catch (e) { baseline = null; }
    }
    // The vehicle read is NOT gated on patternOnly: a stated position does not
    // make the votes behind it standalone, and a row with a quote is exactly where
    // a package-borne record most looks like a clean one.
    var vehicle = null;
    try {
      if (CS && CS.vehicle && typeof CS.vehicle.read === 'function') {
        var vr = CS.vehicle.read(row.pid, row.key);
        if (vr && vr.line) vehicle = { line: vr.line, short: vr.short || '', note: vr.note || '' };
      }
    } catch (e) { vehicle = null; }
    // The cue needs two directional facts. A stated Mixed, a Split record, a
    // record with no direction read from it yet, or no record at all all land on
    // `split`/no-cue rather than being forced into agreement or disagreement.
    var cue = null;
    if (patternOnly) cue = CUES.pattern_only;
    else if (rec && rec.state === 'scored') {
      cue = CUES[VERDICT_CUE[rec.token]] || null;
    } else if (rec && rec.state === 'direction') {
      var sd = SAID_DIR.hasOwnProperty(stanceKey) ? SAID_DIR[stanceKey] : null;
      var rd = rec.directional ? (rec.tone === 'support' ? 1 : rec.tone === 'oppose' ? -1 : 0) : 0;
      if (sd === 0 || rd === 0 || !rec.directional) cue = CUES.split;
      else cue = (sd === rd) ? CUES.aligns : CUES.cuts_against;
    }
    // QUIET is a pattern-only row whose record does not amount to a direction —
    // thin, flat, or on file with no direction read. It still appears; it sorts
    // last and it is dimmed, because it is the weakest thing this surface holds.
    var quiet = !!(patternOnly && rec &&
      (!rec.directional || rec.weight === 'thin' || rec.weight === 'flat'));
    // THE BAND, resolved from facts already on the line and nothing else: is a
    // position stated, is anything formal on file, and did the two halves of the
    // line end up agreeing. `rank` is that band with the record's own weight class
    // as a tie-break — one integer, used only to order rows.
    var band;
    if (!rec || !onRecord) band = 'nofile';
    else if (patternOnly) band = rec.directional ? 'pattern' : 'onfile';
    else band = (cue && CUE_BAND[cue.key]) || 'onfile';
    var rank = rankOf(band, rec ? rec.weight : 'flat');

    var topic = coreKeyOf(row.key);
    return {
      pid: row.pid, key: row.key, label: row.label || row.key,
      topic: topic,
      group: row.category || 'other', groupLabel: row.categoryLabel || 'Other',
      said: { key: said.key, label: said.label, stated: !!stanceKey, color: said.c, ico: said.ico },
      // The record slot, projected. `pct` lives HERE and nowhere else on the leaf:
      // there is one percentage on a leaf, it belongs to one issue's Direction
      // Match result, and nothing that sorts or groups leaves can reach it.
      record: rec ? {
        state: rec.state, label: rec.label, depth: rec.depth || '', counts: rec.counts || '',
        items: rec.items || 0, onRecord: onRecord,
        // How many DISTINCT documents those items are, from the shared accessor.
        // Carried through the projection because the leaf face prints it beside the
        // item count: see oneHtml().
        docs: rec.docs || 0, single: !!rec.single,
        tier: rec.tier || 'none', weight: rec.weight || 'flat', tone: rec.tone || 'muted',
        directional: !!rec.directional, early: !!rec.early, earlyNote: rec.earlyNote || '',
        scored: !!rec.scored, pct: (typeof rec.pct === 'number') ? rec.pct : null,
        metric: rec.metric || '', color: rec.color || '',
        note: rec.note || '', why: rec.why || null
      } : null,
      cue: cue,
      patternOnly: patternOnly,
      // { stance, word, tier, tone, counts } or null — the projection this file
      // prints, so nothing downstream reaches into the shared entry's internals.
      baseline: baseline ? {
        stance: baseline.stance, word: baseline.word, tier: baseline.tier,
        tone: baseline.tone, counts: baseline.counts || ''
      } : null,
      // { line, short, note } or null. Presentation only; see VEHICLE_TAG above.
      vehicle: vehicle,
      quiet: quiet,
      band: band,
      rank: rank,
      skin: skinFor(row.key)
    };
  }

  // ONE COMPARATOR, used by the branch panels, the flat list and the default-open
  // rule alike, so "what comes first" cannot mean two different things on one
  // surface: band, then the record's own depth, then how much is on file, then the
  // label — the last two only so the order is stable rather than incidental.
  function sortLeaves(list) {
    return (list || []).slice().sort(function (a, b) {
      if (a.rank !== b.rank) return a.rank - b.rank;
      var ai = (a.record && a.record.items) || 0, bi = (b.record && b.record.items) || 0;
      if (ai !== bi) return bi - ai;
      return a.label < b.label ? -1 : a.label > b.label ? 1 : 0;
    });
  }

  function leaves(pid) {
    var CS = window.PDXConsistency;
    if (!CS || typeof CS.issueRows !== 'function') return [];
    var rows = [];
    try { rows = CS.issueRows(pid) || []; } catch (e) { return []; }
    var out = [];
    rows.forEach(function (r) { var lf = leafOf(r); if (lf) out.push(lf); });
    return sortLeaves(out);
  }

  // ── THE MID LEVEL, AS A PURE FUNCTION ─────────────────────────────────────
  // Exposed so the gate is testable on its own: given a branch's leaves, either
  // an array of mid nodes or null for "render this branch flat".
  function midsFor(list) {
    list = list || [];
    if (list.length < MID.minLeaves) return null;
    var order = [], byKey = {};
    list.forEach(function (lf) {
      var k = lf.group || 'other';
      if (!byKey[k]) { byKey[k] = { key: k, label: lf.groupLabel || 'Other', leaves: [] }; order.push(k); }
      byKey[k].leaves.push(lf);
    });
    var real = order.filter(function (k) { return byKey[k].leaves.length >= MID.minPerGroup; });
    if (real.length < MID.minGroups) return null;
    // Everything below the per-group floor collects into one trailing node rather
    // than becoming a row of one-leaf boxes.
    var mids = real.map(function (k) { return byKey[k]; });
    var rest = [];
    order.forEach(function (k) {
      if (real.indexOf(k) === -1) rest = rest.concat(byKey[k].leaves);
    });
    if (rest.length) mids.push({ key: '_rest', label: 'More in this topic', leaves: rest });
    return mids;
  }

  // ── THE BRANCHES ──────────────────────────────────────────────────────────
  // BRANCH ORDER IS THE TAXONOMY'S, ON EVERY PROFILE. Sorting branches by how much
  // tension is under them would make the same tree read differently for every
  // person and would turn the topic list itself into a ranking of topics — so the
  // declared core-issue order stands, and the things that answer "where do I look
  // first" instead are the STATE SUMMARY on each closed face (which core holds the
  // rows that cut against), the LEAF order inside each branch (tension first), and
  // the Tension sort, which is a flat sharpest-first list a reader asks for.
  //
  // `list` is an optional pre-filtered set of leaves: a filter is a view, so it is
  // applied once, here, and every figure the branch prints — its count, its state
  // summary, its mid gate — describes exactly the rows a reader can see under it.
  function groups(pid, list) {
    var all = list ? sortLeaves(list) : leaves(pid);
    var byTopic = {};
    all.forEach(function (lf) {
      var k = lf.topic || '';
      (byTopic[k] || (byTopic[k] = [])).push(lf);
    });
    var out = [];
    TOPICS().forEach(function (t) {
      var ls = byTopic[t.key];
      if (!ls || !ls.length) return;
      out.push({
        key: t.key || 'other', topicKey: t.key, label: t.label, blurb: t.blurb,
        count: ls.length, leaves: ls, mids: midsFor(ls),
        summary: summaryOf(ls),
        skin: skinFor(t.key)
      });
    });
    return out;
  }
  function count(pid) { try { return leaves(pid).length; } catch (e) { return 0; } }

  // ── WALL 4 · NOTHING IS OPEN WHEN THE TREE FIRST PAINTS ───────────────────
  // The tree is the profile's explore gateway, and the first thing it owes a reader
  // is the MAP: the core national issues this person has a record on, all of them,
  // in one short list they can take in without scrolling. Fourteen doors is a map.
  // Thirteen doors with one of them hanging open — the shape this tree shipped with,
  // where the highest-tension branch auto-expanded — is a map with a paragraph
  // stapled over it: the leaves of one core push every core below it off the first
  // screen, and the reader meets an issue list before they have met the topics.
  //
  // So a cold paint opens NOTHING. `opts.open` is the only thing that expands a
  // branch, and the only caller that passes it is the warm repaint handing back
  // what the reader themselves had open. There is no "we picked one for you" state,
  // which also means a reader who closes every branch stays closed across a repaint
  // instead of having one silently reopened under them.
  //
  // What this does NOT do is hide where the tension is. A closed face still carries
  // its state summary ("2 cut against · 1 mixed"), which is the same answer the
  // auto-open branch was giving less legibly, and Tension sort is a one-tap flat
  // sharpest-first list for the reader who wants the ranking rather than the map.

  // ─────────────────────────────────────────────────────────────────────────
  // MARKUP
  // ─────────────────────────────────────────────────────────────────────────
  function uidFor(pid) {
    return ('pdxtree-' + norm(pid) + '-' + (++_seq)).replace(/[^A-Za-z0-9_-]/g, '');
  }
  function leafId(uid, key) {
    return (uid + '-lf-' + norm(key)).replace(/[^A-Za-z0-9_-]/g, '');
  }

  // The accessible name is ONE sentence, not a pile of fragments. A screen reader
  // reading "Election Security / Said Supports / Record Strongly opposes / Cuts
  // against" as four separate things loses the relation, and a pattern-only row
  // read as fragments loses the disclosure entirely — so it is spelled out here.
  function leafSay(lf) {
    var rc = lf.record;
    var s = lf.label + '. ';
    s += lf.said.stated ? ('Their stated position: ' + lf.said.label + '. ')
                        : 'No stated position on file. ';
    // The baseline is read out in the same breath as the absence it fills, so a
    // screen reader never hears a side without hearing where it came from.
    if (!lf.said.stated && lf.baseline) {
      s += 'Baseline from the formal record: ' + lf.baseline.word + '. ';
    }
    // THE RECORD HALF, IN THE STATE IT IS ACTUALLY IN. Five states, five sentences,
    // and none of them is silence: a screen reader that hears the Said half and
    // then nothing cannot tell "we hold no formal record" apart from "we did not
    // print one".
    if (rc && rc.state === 'scored') {
      s += 'Direction match on this issue: ' + rc.label +
        ((rc.pct === null) ? '' : ', ' + rc.pct + '%') +
        (rc.depth ? ', from ' + rc.depth + ' on file' : '') + '. ';
    } else if (rc && rc.state === 'direction') {
      s += 'Formal record: ' + rc.label + (rc.depth ? ', ' + rc.depth + ' on file' : '') +
        (rc.counts ? ' (' + rc.counts + ')' : '') + '. ';
    } else if (rc && rc.state === 'onfile') {
      s += rc.label + (rc.depth ? ' — ' + rc.depth + ' on file' : '') + '. ';
    } else if (rc) {
      s += rc.label + '. ';
    }
    // One document under the count, out loud, on the same leaves the printed
    // marker appears on.
    if (rc && rc.single && (rc.state === 'scored' || rc.state === 'direction')) {
      s += (rc.items > 1 ? 'All of it is one measure. ' : 'That is one measure. ');
    }
    // The one-item horizon, out loud. A depth of one read without it is a verdict
    // on a sample of one.
    if (rc && rc.early && rc.earlyNote) s += 'This is an ' + rc.earlyNote + ' ';
    // WHY there is no direction, where there are items but no read. The reason is
    // the shared one — a poleless issue, an incidental-only run, a lane still
    // warming — and it is worth more to a reader than the state name.
    if (rc && rc.why && rc.why.note) s += rc.why.note + ' ';
    if (lf.cue && lf.said.stated && rc && rc.onRecord) s += lf.cue.label + ' — ' + lf.cue.note + ' ';
    if (lf.patternOnly) s += PATTERN_ONLY_NOTE + ' ';
    // The vehicle, in full, after the record it qualifies — a screen reader that
    // heard "Thin opposes, 3 on file" and nothing else has been told the same
    // half-truth the printed tag exists to end.
    if (lf.vehicle) s += lf.vehicle.line + '. ';
    return s + 'Opens the issue dossier.';
  }

  // The Record chip, in every state. THERE IS NO SIXTH STATE IN WHICH IT IS ABSENT:
  // a leaf exists because something is on file or something was said, and in both
  // cases the reader is owed a sentence about the formal record rather than a gap
  // they have to interpret. `st-` is the state, `t-`/`w-`/`tone-` are the pattern
  // engine's own tier vocabulary kept for the skin, and a scored row paints from
  // the verdict's colour instead of the record's lean — the word in the slot is the
  // verdict's, so the colour must be too.
  // HOW MANY DOCUMENTS, BESIDE HOW MANY ITEMS. `rc.depth` counts items — "6 votes"
  // — and six roll calls on one bill print as six. `rc.docs` is the distinct
  // instrument count from the shared accessor, so a leaf says both numbers and a
  // reader never has to assume they are the same one.
  //
  // Printed on every single-document leaf that shows a verdict, not only where the
  // two counts differ. "6 votes · 1 measure" is the case this exists for and "1
  // vote · 1 measure" is close to a restatement — but a marker that appears only
  // sometimes is a marker a reader cannot rely on, and its absence would then have
  // to mean something. It means nothing here except that the leaf has more than one
  // document under it.
  //
  // Verdict-bearing states only, by the same rule the percentage follows: a leaf
  // with nothing to qualify has nothing to qualify.
  function oneHtml(rc) {
    if (!rc || !rc.single) return '';
    if (rc.state !== 'scored' && rc.state !== 'direction') return '';
    return '<i class="pdxtree-one" data-pdxtree-docs="1"> · 1 measure</i>';
  }
  function recHtml(rc) {
    if (!rc) return '';
    var scored = (rc.state === 'scored');
    var early = (rc.early && rc.earlyNote)
      ? '<i class="pdxtree-early"> — ' + esc(String(rc.earlyNote).replace(/\.$/, '')) + '</i>' : '';
    return '<span class="pdxtree-pat st-' + escAttr(rc.state) + ' t-' + escAttr(rc.tier) +
        ' w-' + escAttr(rc.weight) + ' tone-' + escAttr(scored ? 'verdict' : rc.tone) + '"' +
        ((scored && rc.color) ? ' style="--pdx-rc:' + escAttr(rc.color) + '"' : '') + '>' +
        '<b>🏛 Record:</b> ' + esc(rc.label) +
        (rc.depth ? '<i class="pdxtree-depth"> · ' + esc(rc.depth) + '</i>' : '') +
        oneHtml(rc) +
        early +
      '</span>';
  }
  // The one percentage a leaf may carry, and only in the one state that earned it.
  function pctHtml(rc) {
    if (!rc || rc.state !== 'scored' || typeof rc.pct !== 'number') return '';
    return '<span class="pdxtree-pct"' +
      (rc.color ? ' style="--pdx-rc:' + escAttr(rc.color) + '"' : '') + '>' +
      esc(rc.pct) + '%</span>';
  }

  function leafHtml(lf, uid) {
    var id = leafId(uid, lf.key);
    var rc = lf.record;
    var title = lf.baseline ? BASELINE_NOTE
      : lf.patternOnly ? PATTERN_ONLY_NOTE : ((rc && rc.note) || '');
    return '<div class="pdxtree-leaf' + (lf.skin.on ? ' pdxtree-ic' : '') +
        (lf.patternOnly ? ' is-patternonly' : '') + (lf.quiet ? ' is-quiet' : '') + '"' +
        ' style="' + escAttr(lf.skin.style) + '"' +
        ' data-pdxtree-issue="' + escAttr(lf.key) + '"' +
        ' data-pdxtree-topic="' + escAttr(lf.topic || '') + '"' +
        ' data-pdxtree-said="' + escAttr(lf.said.key) + '"' +
        ' data-pdxtree-pat="' + escAttr(rc ? rc.tier : 'none') + '"' +
        ' data-pdxtree-rec="' + escAttr(rc ? rc.state : 'none') + '"' +
        ' data-pdxtree-cue="' + escAttr(lf.cue ? lf.cue.key : '') + '"' +
        ' data-pdxtree-only="' + (lf.patternOnly ? '1' : '0') + '"' +
        ' data-pdxtree-baseline="' + escAttr(lf.baseline ? lf.baseline.stance : '') + '"' +
        (lf.vehicle ? ' data-pdxtree-vehicle="1"' : '') + '>' +
        '<button type="button" class="pdxtree-face" id="' + escAttr(id) + '"' +
          ' data-pdxtree-dos="' + escAttr(lf.key) + '"' +
          ' data-pdxtree-pid="' + escAttr(lf.pid) + '"' +
          ' data-pdxtree-origin="' + escAttr(id) + '"' +
          (title ? ' title="' + escAttr(title) + '"' : '') +
          ' aria-label="' + escAttr(leafSay(lf)) + '">' +
          '<span class="pdxtree-dot" aria-hidden="true"></span>' +
          '<span class="pdxtree-name">' + esc(lf.label) + '</span>' +
          '<span class="pdxtree-slots" aria-hidden="true">' +
            (lf.baseline
              ? '<span class="pdxtree-said s-' + escAttr(lf.baseline.stance) + ' is-baseline"' +
                  ' title="' + escAttr(BASELINE_NOTE) + '">' +
                  '<b>' + esc(BASELINE_LABEL) + ':</b> ' + esc(lf.baseline.word) +
                  '<i class="pdxtree-basefrom"> \u00b7 ' + esc(BASELINE_FROM) + '</i></span>'
              : '<span class="pdxtree-said s-' + escAttr(lf.said.key) + '">' +
                  '<b>Said:</b> ' + esc(lf.said.label) + '</span>') +
            recHtml(rc) +
            pctHtml(rc) +
            (lf.cue ? '<span class="pdxtree-cue c-' + escAttr(lf.cue.key) + '">' +
                        esc(lf.cue.label) + '</span>' : '') +
            (lf.patternOnly ? '<span class="pdxtree-tag">' + esc(PATTERN_ONLY_TAG) + '</span>' : '') +
            (lf.vehicle ? '<span class="pdxtree-veh" title="' + escAttr(lf.vehicle.note) + '">' +
                            '\uD83D\uDE82 ' + esc(VEHICLE_TAG) + '</span>' : '') +
          '</span>' +
          '<span class="pdxtree-go" aria-hidden="true">›</span>' +
        '</button>' +
      '</div>';
  }

  // ── A BRANCH FACE ─────────────────────────────────────────────────────────
  // Icon, name, count, and a state summary of the rows visible underneath. The
  // numbers on it are counts of rows and nothing else: no percentage, no ratio, no
  // tier word, no direction of the branch's own — see wall 2. The summary is built
  // from the leaves this branch actually holds under the active filter, so a closed
  // header and its open panel can never disagree.
  function bsumHtml(g) {
    var sm = g.summary || summaryOf(g.leaves);
    if (!sm.bits.length) return '';
    return '<span class="pdxtree-bsum">' + sm.bits.slice(0, SUMMARY_MAX).map(function (b, i) {
      return '<span class="pdxtree-bsumbit b-' + escAttr(b.key) + (i ? ' is-extra' : '') + '">' +
        esc(b.label) + '</span>';
    }).join('') + '</span>';
  }
  function branchHtml(g, uid, open) {
    var panel = uid + '-p-' + escAttr(g.key);
    var body = g.mids
      ? g.mids.map(function (m) {
          return '<div class="pdxtree-mid" data-pdxtree-mid="' + escAttr(m.key) + '">' +
            '<div class="pdxtree-midhd">' + esc(m.label) + '</div>' +
            m.leaves.map(function (lf) { return leafHtml(lf, uid); }).join('') +
          '</div>';
        }).join('')
      : g.leaves.map(function (lf) { return leafHtml(lf, uid); }).join('');
    var n = g.count + ' issue' + (g.count === 1 ? '' : 's');
    var sm = g.summary || summaryOf(g.leaves);
    // The whole sentence, on the face's own title: the visible bits are capped at
    // three so the header stays scannable, and nothing is only in the markup a
    // phone hides.
    var ttl = g.label + ' \u00b7 ' + n + (sm.text ? ' \u00b7 ' + sm.text : '');
    return '<div class="pdxtree-branch' + (g.skin.on ? ' pdxtree-ic' : '') + '"' +
        ' style="' + escAttr(g.skin.style) + '"' +
        ' data-pdxtree-branch="' + escAttr(g.key) + '"' +
        ' data-pdxtree-open="' + (open ? '1' : '0') + '">' +
        '<button type="button" class="pdxtree-bface" data-pdxtree-toggle="' + escAttr(g.key) + '"' +
          ' title="' + escAttr(ttl) + '"' +
          ' aria-expanded="' + (open ? 'true' : 'false') + '" aria-controls="' + escAttr(panel) + '">' +
          '<span class="pdxtree-caret" aria-hidden="true">▸</span>' +
          '<span class="pdxtree-btitle">' + esc(g.label) + '</span>' +
          '<span class="pdxtree-bn">' + esc(n) + '</span>' +
          bsumHtml(g) +
        '</button>' +
        '<div class="pdxtree-panel" id="' + escAttr(panel) + '"' + (open ? '' : ' hidden') + '>' +
          body +
        '</div>' +
      '</div>';
  }

  // ── THE HEADER TALLY ──────────────────────────────────────────────────────
  // ONE COUNTS OBJECT. Every figure on this line comes from
  // PDXConsistency.profileCounts(pid) — the same accessor the quick chips and the
  // header tally read — and every figure NAMES ITS OWN DENOMINATOR in its title,
  // from that object's own `of` map. There is no count computed in this file and no
  // second total for anything.
  //
  // WHILE THE ROLL-CALL LANE IS STILL WARMING, THE RECORD FIGURES ARE NOT PRINTED.
  // `onRecord` climbs as votes arrive, so an integer printed cold is an integer we
  // would have to take back — and "8 with a formal record" that becomes 14 a second
  // later teaches a reader that our counts are guesses. The two figures that cannot
  // move (what is on screen, what they have stated) print immediately; the rest says
  // it is still looking, in the same words the rows use.
  function countsOf(pid) {
    var CS = window.PDXConsistency;
    try {
      if (CS && typeof CS.profileCounts === 'function') return CS.profileCounts(pid) || null;
    } catch (e) {}
    return null;
  }
  //
  // UNDER AN ACTIVE FILTER the first figure says what it is: how many of the tree's
  // own issues are on screen. The denominator is still `counts.shown` — the shared
  // object's figure for this tree — so a filtered view narrows what a reader sees
  // without inventing a second total for anything.
  var TALLY_WARM = 'Checking the formal record…';
  function tallyHtml(pid, shownNow, filterKey) {
    var c = countsOf(pid);
    if (!c) return '';
    var of = c.of || {};
    var bits = [];
    var filtered = !!(filterKey && filterKey !== FILTER_ALL);
    function bit(v, t) { bits.push({ v: v, t: t || '' }); }
    if (filtered) {
      bit(shownNow + ' of ' + c.shown + ' issue' + (c.shown === 1 ? '' : 's') + ' shown \u00b7 ' +
        filterOf(filterKey).label, of.shown);
    } else {
      bit(shownNow + ' issue' + (shownNow === 1 ? '' : 's') + ' on this tree', of.shown);
    }
    bit(c.stated + ' with a stated position', of.stated);
    if (c.warming) {
      bit(TALLY_WARM, '');
    } else {
      bit(c.onRecord + ' with a formal record on file', of.onRecord);
      if (c.scorable) {
        bit(c.tested + ' of ' + c.scorable + ' tested by Direction Match',
          (of.tested || '') + ' — out of ' + (of.scorable || ''));
      }
    }
    return '<p class="pdxtree-tally">' + bits.map(function (b) {
      return '<span class="pdxtree-tallybit"' + (b.t ? ' title="' + escAttr(b.t) + '"' : '') + '>' +
        esc(b.v) + '</span>';
    }).join('') + '</p>';
  }

  // ── THE FILTER BAR ────────────────────────────────────────────────────────
  // WHICH CHIPS EXIST IS A PROPERTY OF THE PROFILE, not a fixed row of six. A chip
  // that would select every row, or none of them, tells a reader nothing and costs
  // a tap target — so `all` plus the chips that actually narrow this profile is the
  // bar, and it is not drawn at all where there is nothing to narrow. The ACTIVE
  // chip is always drawn even when its set is empty, because a reader who filtered
  // into an empty view needs to see what they chose and the way back out.
  function chipsFor(all, active) {
    var out = [FILTERS[0]];
    FILTERS.slice(1).forEach(function (f) {
      var n = filterLeaves(all, f.key).length;
      if ((n > 0 && n < all.length) || f.key === active) out.push(f);
    });
    return out.length > 1 ? out : [];
  }
  function filtersHtml(all, active) {
    var chips = chipsFor(all, active);
    if (!chips.length) return '';
    return '<div class="pdxtree-filters" role="group" aria-label="Filter these issues">' +
      chips.map(function (f) {
        var on = (f.key === active);
        return '<button type="button" class="pdxtree-fchip' + (on ? ' is-on' : '') + '"' +
          ' data-pdxtree-filter="' + escAttr(f.key) + '"' +
          ' aria-pressed="' + (on ? 'true' : 'false') + '"' +
          ' title="' + escAttr(f.title) + '">' + esc(f.label) + '</button>';
      }).join('') + '</div>';
  }
  // The order bar. One control, two states, drawn beside the filters rather than
  // above the tree, because it narrows nothing and adds no destination: it is the
  // same block, re-rendered in a different arrangement.
  function sortHtml(shownN, active, byCount) {
    // Nothing to choose between: a view that is already one flat list is already
    // in tension order, and an empty view has no rows to arrange.
    if (!shownN) return '';
    if (byCount !== 'tree' && active !== SORT_TENSION) return '';
    return '<div class="pdxtree-sort" role="group" aria-label="Order these issues">' +
      '<span class="pdxtree-sort-k">Order</span>' +
      SORTS.map(function (o) {
        var on = (o.key === active);
        return '<button type="button" class="pdxtree-schip' + (on ? ' is-on' : '') + '"' +
          ' data-pdxtree-sort="' + escAttr(o.key) + '"' +
          ' aria-pressed="' + (on ? 'true' : 'false') + '"' +
          ' title="' + escAttr(o.title) + '">' + esc(o.label) + '</button>';
      }).join('') + '</div>';
  }

  // The honest empty view: what was asked, that the answer is none, and one control
  // back to the full set. Never an empty tree, and never a filter silently ignored.
  function emptyHtml(active) {
    return '<p class="pdxtree-empty">' +
      '<b>' + esc(filterOf(active).label) + ':</b> ' + esc(EMPTY_NOTE) +
      ' <button type="button" class="pdxtree-fchip pdxtree-reset"' +
      ' data-pdxtree-filter="' + escAttr(FILTER_ALL) + '">Show all issues</button></p>';
  }

  // ── THE TREE BODY ─────────────────────────────────────────────────────────
  // `opts.open` is the branch keys to leave expanded — the caller passes back
  // whatever the reader had open before a warm repaint, so a repaint never
  // collapses the branch someone is reading. `opts.filter` is the active view; it
  // is applied ONCE, here, to the leaf list, and everything below it (branches,
  // counts on the faces, summaries, the mode, the default-open branch) describes
  // that visible set. Nothing on this path reads or recomputes a score.
  function treeHtml(pid, opts) {
    opts = opts || {};
    var all = leaves(pid);
    if (!all.length) return '';
    var uid = opts.uid || uidFor(pid);
    var active = filterOf(opts.filter || FILTER_ALL).key;
    var order = sortOf(opts.sort || SORT_TOPIC).key;
    var shown = filterLeaves(all, active);
    // Two inputs to one shape: how many leaves are visible, and which order the
    // reader asked for. Tension order is always the flat list — a global ranking
    // inside topic accordions would be a ranking a reader cannot see.
    var byCount = modeFor(shown.length);
    var mode = (order === SORT_TENSION) ? 'flat' : byCount;
    var head = '<div class="pdxtree" data-pdxtree-pid="' + escAttr(pid) + '"' +
      ' data-pdxtree-uid="' + escAttr(uid) + '"' +
      ' data-pdxtree-filter="' + escAttr(active) + '"' +
      ' data-pdxtree-sort="' + escAttr(order) + '"' +
      ' data-pdxtree-mode="' + escAttr(shown.length ? mode : 'empty') + '">' +
      tallyHtml(pid, shown.length, active) +
      filtersHtml(all, active) +
      sortHtml(shown.length, order, byCount);
    var body;
    if (!shown.length) {
      body = emptyHtml(active);
    } else if (mode === 'flat') {
      // FLAT MODE: one list, tension order, no accordions. Same leaf markup, so the
      // dossier door, the slots, the disclosures and the ids are the tree's.
      body = ((order === SORT_TENSION && byCount === 'tree')
          ? '<p class="pdxtree-note pdxtree-ordernote">' + esc(SORT_NOTE) + '</p>' : '') +
        '<div class="pdxtree-flat" data-pdxtree-flat="1">' +
        shown.map(function (lf) { return leafHtml(lf, uid); }).join('') + '</div>';
    } else {
      var gs = groups(pid, shown);
      // Whatever the reader had open, minus branches this view no longer holds. If
      // that leaves nothing open, nothing is open: see wall 4. A filter that empties
      // the reader's branch hands them the map of what the filter left, not a
      // different branch we chose for them.
      var openKeys = (opts.open || []).filter(function (k) {
        return gs.some(function (g) { return g.key === k; });
      });
      body = gs.map(function (g) {
        return branchHtml(g, uid, openKeys.indexOf(g.key) !== -1);
      }).join('');
    }
    var anyOnly = false, anyBase = false;
    shown.forEach(function (lf) {
      if (lf.patternOnly) anyOnly = true;
      if (lf.baseline) anyBase = true;
    });
    // The notes live INSIDE the tree element: a filter chip re-renders this whole
    // block in place, and a disclosure that was a sibling of it would survive a
    // repaint that removed the rows it was disclosing.
    return head + body +
      '<p class="pdxtree-note">' + esc(TREE_NOTE) + '</p>' +
      (anyOnly ? '<p class="pdxtree-note pdxtree-note-only"><span class="pdxtree-tag">' +
        esc(PATTERN_ONLY_TAG) + '</span> ' + esc(PATTERN_ONLY_NOTE) + '</p>' : '') +
      (anyBase ? '<p class="pdxtree-note pdxtree-note-only"><span class="pdxtree-tag">' +
        esc(BASELINE_LABEL) + '</span> ' + esc(BASELINE_NOTE) + '</p>' : '') +
      '</div>';
  }

  // ── THE SECTION ───────────────────────────────────────────────────────────
  // Mounts under the Word vs Action summary. It carries the nav anchors of the two
  // browse-all-stances surfaces it replaced as well as its own — `pdxsec-glance`
  // (the old flat Stance at a Glance index) and `pdxsec-stances` (🧭 Stances &
  // Connections, unmounted in the one-browse-path pass) — so every existing jump
  // into "their stated positions", from the rail, a deep link or a shared hash,
  // lands on the surface that now holds them instead of on nothing.
  // ── IS A TREE COMING? ─────────────────────────────────────────────────────
  // The tree's leaves are built from PDXConsistency.issueRows(pid), which reads
  // the roll-call record — so on a cold arrival there are none yet and treeHtml
  // returns ''. Returning '' from the SECTION on that basis is what made the
  // absence permanent: with no host in the document, bindHost is never armed, and
  // the warm repaint that has 70 issues to draw has nowhere to draw them. A file
  // with a record and no tree is a MOUNT bug.
  //
  // So the section asks a second question when the body is empty: is there a
  // record for this person that a tree can be built from once it is read? Two
  // sources, both cheap and both available before any fetch resolves — the rows
  // already in memory, and the shipped formal index. NEITHER IS A STANCE LEDGER:
  // an identity-only member with no stated positions at all is exactly the file
  // this branch exists for, and coverage.scorable / coverage.warming are asked
  // nowhere here.
  function treeExpected(pid) {
    if (!pid) return false;
    try {
      var VR = window.PDXVotingRecord;
      var rows = (VR && typeof VR.memberRecords === 'function') ? VR.memberRecords(pid) : null;
      if (rows && rows.length) return true;
    } catch (e) {}
    try {
      var FX = window.PDXFormalIndex;
      if (FX && typeof FX.has === 'function' && FX.has(pid)) return true;
    } catch (e) {}
    return false;
  }

  // What stands in the body until the read lands. Not a spinner and not a claim
  // about the file: one sentence saying which half is still arriving, replaced
  // wholesale by the tree the moment there is one.
  var TREE_WAIT = 'Their roll-call record is on file and the topic tree is being built from it — ' +
    'the issues appear here as the read lands.';

  function sectionHtml(pid) {
    // ONE id for the section and for the leaves inside it. The warm repaint re-renders
    // the body with this same uid, so a leaf's id — which is the `origin` the dossier's
    // back pill returns to — survives the swap instead of being reissued under it.
    var host = uidFor(pid);
    var body = '';
    try { body = treeHtml(pid, { uid: host }); } catch (e) { body = ''; }
    if (!body) {
      if (!treeExpected(pid)) return '';
      body = '<p class="pdxtree-note pdxtree-wait" data-pdxtree-wait="1">' + esc(TREE_WAIT) + '</p>';
    }
    try { setTimeout(function () { bindHost(host, pid); }, 0); } catch (e) {}
    return '<span id="pdxsec-stancetree" class="pdx-nav-anchor" aria-hidden="true"></span>' +
      '<span id="pdxsec-glance" class="pdx-nav-anchor" aria-hidden="true"></span>' +
      '<span id="pdxsec-stances" class="pdx-nav-anchor" aria-hidden="true"></span>' +
      '<section class="modal-block pdxtree-sec" data-pdxtree-host="' + escAttr(host) + '">' +
        '<h3 class="pdxtree-h">🌳 All Issues by Topic</h3>' +
        '<p class="pdxtree-sub">Every issue we track for them, filed under the core national ' +
          'issues. Open a topic to see the issues under it — what they <b>said</b> beside what ' +
          'their formal <b>record</b> did — then tap an issue for the full dossier.</p>' +
        '<div class="pdxtree-body">' + body + '</div>' +
      '</section>';
  }

  // ─────────────────────────────────────────────────────────────────────────
  // BEHAVIOUR
  // ─────────────────────────────────────────────────────────────────────────
  // MOBILE: ONE BRANCH AT A TIME. On a phone a tree that keeps four branches open
  // is the flat wall again with extra taps in it, so opening a branch closes its
  // siblings. On a wider viewport there is room to compare two topics side by
  // side, so nothing is closed for you. The breakpoint is the site's own phone
  // breakpoint and it is READ AT TOGGLE TIME, not at mount — a rotation or a
  // resize therefore changes the behaviour without a repaint.
  var PHONE = '(max-width: 639px)';
  function isPhone() {
    try {
      return !!(window.matchMedia && window.matchMedia(PHONE).matches);
    } catch (e) { return false; }
  }
  // THE OPEN/CLOSE RULE, as a pure function of (what is open, what was tapped, is
  // this a phone). The click handler does nothing but read the DOM into this, and
  // write the answer back — so the rule is one testable statement rather than a
  // sequence of DOM mutations, and "one branch at a time on mobile" cannot drift
  // out of agreement with what the tree actually does. Closing is never exclusive:
  // tapping the open branch on a phone closes it and leaves nothing open, which is
  // a reader deliberately collapsing the tree, not a state to correct.
  function nextOpen(open, key, phone) {
    open = (open || []).slice();
    var i = open.indexOf(key);
    if (i !== -1) { open.splice(i, 1); return open; }
    return phone ? [key] : open.concat([key]);
  }
  function setOpen(branch, open) {
    if (!branch) return;
    var btn = branch.querySelector('[data-pdxtree-toggle]');
    var panel = branch.querySelector('.pdxtree-panel');
    branch.setAttribute('data-pdxtree-open', open ? '1' : '0');
    if (btn) btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (panel) { if (open) panel.removeAttribute('hidden'); else panel.setAttribute('hidden', ''); }
  }
  function openBranches(root) {
    var out = [];
    try {
      var bs = root.querySelectorAll('[data-pdxtree-branch][data-pdxtree-open="1"]');
      for (var i = 0; i < bs.length; i++) out.push(bs[i].getAttribute('data-pdxtree-branch'));
    } catch (e) {}
    return out;
  }

  // ── OPENING A BRANCH MUST NOT MOVE IT OFF THE SCREEN ──────────────────────
  // The one-branch-at-a-time rule has a cost nobody sees on a desktop: opening
  // branch seven CLOSES branch one, the document above the reader's thumb gets
  // shorter by the height of that panel, and the branch they just tapped travels
  // upward out of the viewport. The tap worked; the tree looks like it ignored it.
  // On a phone, where the panel that closed is routinely taller than the screen,
  // that is indistinguishable from a dead control — which is the "expand does
  // nothing" report this pass exists to answer.
  //
  // So a toggle does two things after it writes the open state, in this order:
  //
  //   1 · PIN. The face a reader tapped stays under the thumb that tapped it. The
  //       branch's own top edge is measured before the write and again after, and
  //       the scroll container is moved by exactly the drift. Nothing "animates"
  //       here — this is the correction that makes the layout hold still.
  //   2 · REVEAL. Only then, if the branch sits under the sticky rail or its panel
  //       runs past the bottom of the scrolling box, it is brought into the visible
  //       band — never so far that the face it belongs to is pushed out of sight.
  //
  // Step 2 is a pure function of five numbers (revealDelta) so the rule is testable
  // without a browser, the same way the open/close rule is. It moves a scroll
  // position and nothing else: no row, no count, no record read and no score.
  var REVEAL = { pad: 8, navId: 'pdx-profile-nav' };
  function num(v) { return (typeof v === 'number' && isFinite(v)) ? v : null; }
  function revealDelta(m) {
    m = m || {};
    var faceTop = num(m.faceTop), faceBottom = num(m.faceBottom);
    var panelBottom = num(m.panelBottom);
    var viewTop = num(m.viewTop), viewBottom = num(m.viewBottom);
    if (faceTop === null || viewTop === null || viewBottom === null) return 0;
    if (faceBottom === null) faceBottom = faceTop;
    if (panelBottom === null) panelBottom = faceBottom;
    var band = viewBottom - viewTop;
    if (band <= 0) return 0;
    // Above the band, or hidden under the sticky rail: bring the face down to the
    // top of the band. This is the only case that scrolls the reader backwards.
    if (faceTop < viewTop + REVEAL.pad) return Math.round(faceTop - viewTop - REVEAL.pad);
    // Below it: show the face and as much of its panel as the band can hold, and
    // stop at the point where the face itself would leave the top of the band. A
    // panel taller than the screen is read by scrolling, not by being jumped past.
    var wantBottom = Math.min(panelBottom + REVEAL.pad, faceTop + band);
    var need = Math.max(0, wantBottom - viewBottom);
    if (need <= 0) return 0;
    return Math.round(Math.min(need, faceTop - viewTop - REVEAL.pad));
  }
  // The scrolling box the tree is actually inside — the profile modal's body on
  // every surface that mounts this today. Null means the document scrolls.
  function scrollBox(el) {
    var n = el && el.parentNode;
    while (n && n.nodeType === 1) {
      var ov = '';
      try { ov = String((window.getComputedStyle(n) || {}).overflowY || ''); } catch (e) { ov = ''; }
      if ((ov === 'auto' || ov === 'scroll') &&
          (n.scrollHeight || 0) > (n.clientHeight || 0) + 1) return n;
      n = n.parentNode;
    }
    return null;
  }
  // The band a reader can actually see inside that box: its own edges, less the
  // sticky jump rail that floats over the top of it. The modal's footer deck is a
  // FLEX SIBLING of the scrolling body rather than an overlay, so the box's own
  // bottom edge is already clear of it.
  function viewBand(box) {
    var top, bottom;
    if (box && box.getBoundingClientRect) {
      var r = box.getBoundingClientRect();
      top = r.top; bottom = r.bottom;
    } else {
      top = 0;
      bottom = num(window.innerHeight);
      if (bottom === null) return null;
    }
    try {
      var nav = document.getElementById(REVEAL.navId);
      if (nav && nav.offsetHeight) top += nav.offsetHeight;
    } catch (e) {}
    if (num(top) === null || num(bottom) === null) return null;
    return { top: top, bottom: bottom };
  }
  function scrollByPx(box, d, smooth) {
    if (!d) return 0;
    try {
      if (box) {
        if (smooth && box.scrollTo) box.scrollTo({ top: Math.max(0, (box.scrollTop || 0) + d), behavior: 'smooth' });
        else box.scrollTop = Math.max(0, (box.scrollTop || 0) + d);
      } else if (window.scrollBy) {
        window.scrollBy(smooth ? { top: d, behavior: 'smooth' } : 0, smooth ? undefined : d);
      }
    } catch (e) { return 0; }
    return d;
  }
  function rectOf(el) {
    try { return (el && el.getBoundingClientRect) ? el.getBoundingClientRect() : null; } catch (e) { return null; }
  }
  // Called with the branch's top edge as it was BEFORE the open state was written.
  // Fails silently on any surface that cannot measure — a tree in a sandbox, a
  // print stylesheet — because a scroll position is the only thing at stake.
  function revealBranch(branch, wasTop) {
    if (!branch) return 0;
    var box = scrollBox(branch);
    var moved = 0;
    var r = rectOf(branch);
    if (r && num(wasTop) !== null && num(r.top) !== null) {
      moved += scrollByPx(box, Math.round(r.top - wasTop), false);
    }
    var face = branch.querySelector ? branch.querySelector('[data-pdxtree-toggle]') : null;
    var panel = branch.querySelector ? branch.querySelector('.pdxtree-panel') : null;
    var fr = rectOf(face) || rectOf(branch);
    var open = branch.getAttribute && branch.getAttribute('data-pdxtree-open') === '1';
    var pr = (open && panel) ? rectOf(panel) : null;
    var band = viewBand(box);
    if (!fr || !band) return moved;
    moved += scrollByPx(box, revealDelta({
      faceTop: fr.top, faceBottom: fr.bottom,
      panelBottom: pr ? pr.bottom : fr.bottom,
      viewTop: band.top, viewBottom: band.bottom
    }), true);
    return moved;
  }

  // ── A DOOR THAT CANNOT OPEN SAYS SO ───────────────────────────────────────
  // The dossier assembles itself from the shared engines and it is allowed to be
  // unavailable — the module that owns it may not have loaded, or the sheet may
  // refuse to mount. What is NOT allowed is silence. A leaf that eats the tap
  // teaches a reader that the issue behind it holds nothing, and the row directly
  // above it just told them it holds a formal record; so the failure is printed on
  // the row itself, in a live region, and the row keeps working the moment the
  // dossier can. Nothing here writes to a record, a count or a score.
  var DOOR_FAIL = 'The full report for this issue could not open just now. ' +
    'Nothing on this row has changed — reload the profile and tap again.';
  function leafOfEl(el) {
    try { return (el && el.closest) ? el.closest('.pdxtree-leaf') : null; } catch (e) { return null; }
  }
  function doorFailed(btn) {
    var leaf = leafOfEl(btn);
    if (!leaf) return false;
    try {
      leaf.setAttribute('data-pdxtree-failed', '1');
      var note = leaf.querySelector('.pdxtree-fail');
      if (!note) {
        note = document.createElement('p');
        note.className = 'pdxtree-fail';
        note.setAttribute('role', 'status');
        leaf.appendChild(note);
      }
      note.textContent = DOOR_FAIL;
    } catch (e) { return false; }
    return true;
  }
  function clearDoorFail(btn) {
    var leaf = leafOfEl(btn);
    if (!leaf || leaf.getAttribute('data-pdxtree-failed') !== '1') return false;
    try {
      leaf.removeAttribute('data-pdxtree-failed');
      var note = leaf.querySelector('.pdxtree-fail');
      if (note && note.parentNode) note.parentNode.removeChild(note);
    } catch (e) { return false; }
    return true;
  }

  var _bound = false;
  function bindOnce() {
    if (_bound || !document.addEventListener) return;
    _bound = true;
    document.addEventListener('click', function (e) {
      if (!e.target || !e.target.closest) return;

      // ── THE FILTER CHIPS ────────────────────────────────────────────────
      // A chip re-renders the tree block in place with the new view. It is a
      // RE-RENDER OF THE SAME BUILDER, not a second code path that hides rows in
      // the DOM: the tally, the branch counts, the summaries, the mode and the
      // default-open branch therefore all describe the set that is on screen,
      // and no leaf is ever left saying something that was true of another view.
      //
      // THE CHIP IS A BUTTON, AND THE SELECTOR SAYS SO. The tree's own root
      // element carries data-pdxtree-filter too — that is where the ACTIVE VIEW
      // is recorded, and it is what the re-render reads back. So an unqualified
      // closest('[data-pdxtree-filter]') walking up from a branch face finds the
      // ROOT, and every tap anywhere inside the tree — every expand, every leaf —
      // was answered by re-rendering the tree in the view it was already in. The
      // branch a reader opened came back closed, the dossier never opened, and
      // the whole surface read as dead on a phone. A chip is a button; the state
      // on the root is not. Qualifying the selector is the whole fix, and it is
      // why the toggle and the door below can be reached at all.
      var fc = e.target.closest('button[data-pdxtree-filter]');
      if (fc) {
        var froot = fc.closest('.pdxtree');
        if (!froot) return;
        var fhost = froot.parentNode;
        // The key is normalised through the filter table before it is used for
        // anything, so an unrecognised value renders the full view rather than an
        // empty one — and never reaches a selector as-is.
        var fkey = filterOf(fc.getAttribute('data-pdxtree-filter') || FILTER_ALL).key;
        var fuid = froot.getAttribute('data-pdxtree-uid') || '';
        var next;
        try {
          // The ORDER rides across a filter change for the same reason the filter
          // rides across a warm repaint: a reader who chose sharpest-first and then
          // narrowed to "cuts against" did not ask to be put back into topic order.
          next = treeHtml(froot.getAttribute('data-pdxtree-pid') || '', {
            uid: fuid, filter: fkey,
            sort: froot.getAttribute('data-pdxtree-sort') || SORT_TOPIC
          });
        } catch (e1) { next = ''; }
        if (next) {
          froot.outerHTML = next;
          // THE CHIP A READER PRESSED IS REPLACED BY THE RE-RENDER, so focus is put
          // back on its successor. Without this a keyboard reader is dropped to the
          // top of the document by their own filter, which is the one control on
          // this surface they are most likely to use twice in a row.
          try {
            var back = fhost && fhost.querySelector('.pdxtree[data-pdxtree-uid="' + fuid + '"] ' +
              '[data-pdxtree-filter="' + fkey + '"]');
            if (back && back.focus) back.focus();
          } catch (e2) {}
        }
        e.preventDefault();
        return;
      }

      // ── THE ORDER CHIPS ─────────────────────────────────────────────────
      // The same re-render the filter chips do, for the same reason: the tally,
      // the branch counts, the mode and the notes all describe what is actually
      // on screen, so the only safe way to change the arrangement is to rebuild
      // the block from the builder. The reader's FILTER and their open branches
      // ride across the swap — switching to sharpest-first and back must not
      // silently widen the view or collapse the topic they were reading.
      var sc = e.target.closest('button[data-pdxtree-sort]');
      if (sc) {
        var sroot = sc.closest('.pdxtree');
        if (!sroot) return;
        var shost = sroot.parentNode;
        var skey = sortOf(sc.getAttribute('data-pdxtree-sort') || SORT_TOPIC).key;
        var suid = sroot.getAttribute('data-pdxtree-uid') || '';
        var snext;
        try {
          snext = treeHtml(sroot.getAttribute('data-pdxtree-pid') || '', {
            uid: suid, sort: skey,
            filter: sroot.getAttribute('data-pdxtree-filter') || FILTER_ALL,
            open: openBranches(sroot)
          });
        } catch (e4) { snext = ''; }
        if (snext) {
          sroot.outerHTML = snext;
          try {
            var sback = shost && shost.querySelector('.pdxtree[data-pdxtree-uid="' + suid + '"] ' +
              '[data-pdxtree-sort="' + skey + '"]');
            if (sback && sback.focus) sback.focus();
          } catch (e5) {}
        }
        e.preventDefault();
        return;
      }

      // The branch toggle. STEP ONE OF THE FUNNEL: the topic row is a real control
      // whose only job is to reveal the issues filed under it. It opens nothing
      // else, navigates nowhere, and states nothing a closed face did not.
      var tg = e.target.closest('[data-pdxtree-toggle]');
      if (tg) {
        var tree = tg.closest('.pdxtree');
        if (!tree) return;
        var key = tg.getAttribute('data-pdxtree-toggle') || '';
        var self = tg.closest('[data-pdxtree-branch]');
        // Where the branch sits right now, before anything above it can collapse.
        var wasTop = null;
        var pre = rectOf(self);
        if (pre && num(pre.top) !== null) wasTop = pre.top;
        // Read the current state off the DOM, ask the rule, write the answer back.
        // The phone test is made HERE rather than at mount, so a rotation or a
        // window resize changes the behaviour without needing a repaint.
        var want = nextOpen(openBranches(tree), key, isPhone());
        var sibs = tree.querySelectorAll('[data-pdxtree-branch]');
        for (var i = 0; i < sibs.length; i++) {
          setOpen(sibs[i], want.indexOf(sibs[i].getAttribute('data-pdxtree-branch')) !== -1);
        }
        // …and put it back under the thumb that tapped it, then into view. See
        // revealBranch: this moves a scroll position and nothing else.
        try { revealBranch(self, wasTop); } catch (e3) {}
        e.preventDefault();
        return;
      }

      // ── THE LEAF IS THE DOOR ────────────────────────────────────────────
      // STEP THREE OF THE FUNNEL, and the last one: a leaf's primary tap opens the
      // ISSUE DOSSIER, through PDXConsistency.openGap — the same public entry the
      // stance rows, the Official Record rows and the formal-pattern index all use,
      // so the deep dive a leaf reaches is the deep dive that issue already had. There is no second dossier, no
      // tree-only report surface and no new route: this module navigates nowhere.
      // A leaf carries exactly one control, so nothing on it can steal that tap.
      // `origin` is the leaf's own id, which is how closing the dossier returns the
      // reader to the leaf they opened it from rather than the top of the profile.
      var dos = e.target.closest('[data-pdxtree-dos]');
      if (dos) {
        var CS = window.PDXConsistency;
        var opened = false;
        try {
          opened = !!(CS && typeof CS.openGap === 'function') &&
            CS.openGap(dos.getAttribute('data-pdxtree-pid') || '',
                       dos.getAttribute('data-pdxtree-dos') || '',
                       { arrival: false, origin: dos.getAttribute('data-pdxtree-origin') || '' }) !== false;
        } catch (e2) { opened = false; }
        // FAIL CLOSED, OUT LOUD. A door that swallows the tap and shows nothing is
        // the worst outcome available here: the reader is left believing the issue
        // has no report behind it, which is false. So the tap is always consumed and
        // the row says what happened, in place, where the thumb already is.
        e.preventDefault();
        if (opened) clearDoorFail(dos); else doorFailed(dos);
      }
    }, false);
  }

  // ── THE WARM REPAINT ──────────────────────────────────────────────────────
  // The pattern half of every leaf comes from the roll-call index, which arrives
  // after first paint. Without this the tree would be permanently pre-warm — every
  // record slot reading its cold value — so it rebuilds on the same
  // 'pdx-consistency-warm' event the header tally and the issue index rebuild on,
  // carrying the reader's open branches across the swap.
  // THE THREE EVENTS THAT CAN FILL AN EMPTY TREE. 'pdx-consistency-warm' is the
  // consistency queue reporting that a read it started is warm — and on an
  // identity-only file nothing ever queues one, because that queue is fed by the
  // stance ledger. 'pdx-voting-warm' is the sync record cache warming, and
  // 'pdx-record-noted' is PDXVotingRecord.noteMember announcing rows in memory:
  // between them they cover every path that can put a roll-call record in this
  // tab, including the head prefetch and the offline pack. A tree that waits only
  // on the first event is a tree that never arrives for the members who most need
  // it.
  var TREE_REPAINT = ['pdx-consistency-warm', 'pdx-voting-warm', 'pdx-record-noted'];

  function bindHost(host, pid) {
    bindOnce();
    if (!window.addEventListener) return;
    // The section's markup is usually still inside a template string the caller
    // is assembling when this arms (see sectionHtml's setTimeout), so a missing
    // host means "not yet", not "gone" — until it has been seen once.
    var seen = false;
    var handler = function (ev) {
      var el = document.querySelector('[data-pdxtree-host="' + host + '"] .pdxtree-body');
      if (!el) {
        if (seen) TREE_REPAINT.forEach(function (n) { window.removeEventListener(n, handler); });
        return;
      }
      seen = true;
      if (ev && ev.detail && !treeEvForPid(ev, pid)) return;
      try {
        // The reader's view survives the warm swap as well as their open branches:
        // a repaint that silently reset an active filter would look like the
        // filter had failed.
        var root = el.querySelector('.pdxtree');
        var next = treeHtml(pid, {
          open: openBranches(el), uid: host,
          filter: (root && root.getAttribute('data-pdxtree-filter')) || FILTER_ALL,
          sort: (root && root.getAttribute('data-pdxtree-sort')) || SORT_TOPIC
        });
        if (next) el.innerHTML = next;
      } catch (e) {}
    };
    TREE_REPAINT.forEach(function (n) { window.addEventListener(n, handler); });
    // One reconciling paint, for the same reason bindHero takes one: the rows can
    // already be in memory by the time this listener exists (the pack is
    // synchronous, a head prefetch routinely lands first), in which case the
    // event that would have filled the tree was dispatched to nobody.
    try { setTimeout(function () { handler(null); }, 0); } catch (e) {}
  }

  // Both ids travel on 'pdx-record-noted' — the caller's and the canonical one
  // the rows are stored under — and they differ for every aliased pid, so a
  // strict comparison against one of them drops the repaint on exactly the
  // members whose record was hardest to find.
  function treeEvForPid(ev, pid) {
    var d = ev && ev.detail;
    if (!d || (!d.pid && !d.canon)) return true;
    var want = norm(pid), alias = want;
    try {
      if (typeof window.PDXCanonicalPid === 'function') alias = norm(window.PDXCanonicalPid(pid) || pid);
    } catch (e) {}
    var names = [d.pid, d.canon];
    for (var i = 0; i < names.length; i++) {
      if (!names[i]) continue;
      var got = norm(names[i]);
      if (got === want || got === alias) return true;
      try {
        if (typeof window.PDXCanonicalPid === 'function' &&
            norm(window.PDXCanonicalPid(names[i]) || names[i]) === alias) return true;
      } catch (e) {}
    }
    return false;
  }
  try { bindOnce(); } catch (e) {}

  window.PDXStanceTree = {
    // The grouping map and the vocabularies, as data. Every label this surface can
    // print is reachable from here, which is what lets the tests assert the copy
    // instead of scraping markup for literals.
    TOPICS: TOPICS,
    OTHER: OTHER,
    SAID: SAID,
    CUES: CUES,
    MID: MID,
    // The sort key, as data: the band order, the words a branch summary may use,
    // and the depth tie-break inside a band. Nothing here is printed as a number.
    RANK: BAND,
    BANDS: BANDS,
    BAND_WORD: BAND_WORD,
    DEPTH_RANK: DEPTH_RANK,
    rankOf: rankOf,
    SUMMARY_MAX: SUMMARY_MAX,
    summary: summaryOf,
    // The views. `FILTERS` is the whole chip set with its predicates; `filter`
    // applies one to a leaf list and is the only thing that ever narrows this
    // surface.
    FILTERS: FILTERS,
    FILTER_ALL: FILTER_ALL,
    // The characterised set, exported as data so a test can assert the tree and
    // the formal brief count the same two tiers rather than restating the pair.
    CHARACTERISED: CHARACTERISED,
    EMPTY_NOTE: EMPTY_NOTE,
    filter: filterLeaves,
    chipsFor: chipsFor,
    // The flat-mode threshold and the rule that reads it, in one place each.
    FLAT: FLAT,
    modeFor: modeFor,
    // The orders. `SORTS` is the chip set; `sortOf` normalises anything a caller
    // or an attribute hands over, so an unknown value renders topic order rather
    // than nothing. `order` is the shared comparator sharpest-first uses — the same
    // one the branch panels sort with, exported so a test can assert that the flat
    // tension list and a branch cannot disagree about what comes first.
    SORTS: SORTS,
    SORT_DEFAULT: SORT_TOPIC,
    SORT_TENSION: SORT_TENSION,
    SORT_NOTE: SORT_NOTE,
    sortOf: sortOf,
    order: sortLeaves,
    NOTE: TREE_NOTE,
    PATTERN_ONLY_NOTE: PATTERN_ONLY_NOTE,
    PATTERN_ONLY_TAG: PATTERN_ONLY_TAG,
    BASELINE_LABEL: BASELINE_LABEL,
    BASELINE_NOTE: BASELINE_NOTE,
    PHONE: PHONE,
    // The open/close rule, exposed so the mobile behaviour is asserted as a rule
    // rather than inferred from the markup.
    nextOpen: nextOpen,
    // The second half of a toggle, and the reason an expand on a phone is visible:
    // where the scroll container has to move so the branch a reader opened is the
    // branch they can see. A pure function of five measurements, exposed for the
    // same reason nextOpen is — it is a rule, not an accident of a layout.
    REVEAL: REVEAL,
    revealDelta: revealDelta,
    // What a leaf says when the dossier will not open. There is no state in which
    // the door is silent; see doorFailed.
    DOOR_FAIL: DOOR_FAIL,
    // The data layer: one leaf, all leaves, the mid gate, the branches, the count.
    leaf: function (pid, issueKey) {
      var CS = window.PDXConsistency;
      if (!CS || typeof CS.issueRows !== 'function') return null;
      try {
        var rows = CS.issueRows(pid, [issueKey]) || [];
        return rows.length ? leafOf(rows[0]) : null;
      } catch (e) { return null; }
    },
    leaves: leaves,
    // The counts object, exactly as the shared accessor returns it — no projection,
    // no second total. Every figure the tree prints is one of these fields.
    counts: countsOf,
    TALLY_WARM: TALLY_WARM,
    midsFor: midsFor,
    groups: groups,
    count: count,
    // The markup layer.
    html: treeHtml,
    sectionHtml: sectionHtml,
    leafHtml: function (lf, uid) { return leafHtml(lf, uid || 'pdxtree'); }
  };
})();
