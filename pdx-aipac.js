/* ============================================================================
   pdx-aipac.js — THE AIPAC CHIP ON THE PERSON-FILE LETTERHEAD
   ============================================================================
   WHAT IT ANSWERS. One question a reader could not answer from a person file:
   has this person taken AIPAC money, or voted the way an AIPAC tracker reads
   as AIPAC-aligned?
   The 💰 pills answer "what did the campaign raise" and "is an in-office
   disclosure on file"; the stance pills answer issue positions. Neither names the
   AIPAC relationship, so this chip does, in one of four states:

       AIPAC-backed           AIPAC or AIPAC-affiliated PAC money in the filing
                              on file for the current cycle, OR scored votes on
                              the side the reading publisher calls AIPAC-aligned
                              at or above BACKED_SHARE.
       Mixed                  some AIPAC-affiliated money (not the current
                              cycle), or scored votes split between the sides.
       Not AIPAC-aligned      scored votes on the other side at or below
                              NOT_ALIGNED_SHARE, and no AIPAC money on file.
       No AIPAC file on hand  neither source holds anything for this person.

   TWO SOURCES, BOTH ALREADY ON THE SITE OR EMPTY ON PURPOSE.

     1. RECEIPTS. The money lane's own filing door, PDXFinance.filing(pid) —
        the OpenSecrets / FEC record finance-lane.js already reads — filtered to
        AIPAC and AIPAC-affiliated PAC names (AFFILIATED below) and nothing else.
        This file never touches the filings index directly: it knocks on the same
        public door pdx-finance.js does, so there is one answer to "does this
        person have a filing" and the money lane's seam sweep still sees two
        files.

     2. THIRD-PARTY VOTE READINGS. AIPAC publishes no scorecard of its own,
        so SCORECARD holds rows from named outside publishers (READINGS), each
        row tagged with the publisher it came from. A row quotes one roll call
        the publisher itself names — chamber, congress, session, roll number and
        bill — and the vote on it the publisher CREDITS, exactly as published.
        A row only counts for a person when that roll call is ALREADY a formal
        act in their voting record (PDXVotingRecord.memberRecords) with a yea
        or nay. Nothing here creates a vote.

        The chip names the publisher, never AIPAC, as the author of the
        reading — "IMEU reading" — in the visible text and the accessible name,
        and says the positions are the publisher's. It never says "AIPAC
        scorecard".

        IMEU. The IMEU Policy Project's 119th-Congress Senate scorecard
        (imeupolicyproject.org/senate2025) gives a positive score to senators
        who voted for the April 2025 disapproval resolutions S.J.Res. 33 and 26
        (roll calls 165, 166) and the July 2025 ones S.J.Res. 41 and 34 (454,
        455), all four of which the archive carries as discharge votes. IMEU
        credits a yea. It frames that credit as support for Palestinian rights,
        not as anything about AIPAC; THIS SITE reads the credited vote as the
        side that is not AIPAC-aligned (READINGS.imeu.credited), and the
        accessible name says so. IMEU scores each April and July pair as one
        item ("voted for at least one"); here each roll call is its own row,
        because each is its own formal act. The April 2026 discharge votes
        (S.J.Res. 32, 138; rolls 80, 81) are in the archive but were not
        confirmed on IMEU's page, so they are not rows.

        TRACK AIPAC. Kept as a reading with no rows. Its member pages carry
        pro-Israel PAC and independent-expenditure totals and a red / green
        graphic, and name no roll call and no side, so there is nothing of its
        own to transcribe. Rows go in under `reading: 'trackaipac'` if it ever
        publishes per-vote positions.

   WHAT IT NEVER PRINTS. No dollar figure, no percentage, no score, no count — in
   the visible text or in the accessible name. The chip names a relationship and
   its source. The arithmetic that decides "backed" against "mixed" stays inside
   read() and is never published as a number a surface could print.

   THE AIPAC TRACKER LINE IS A SEPARATE SURFACE. trackerHtml() renders a
   text-only "AIPAC Tracker" link on every profile with one line quoting that
   outside tracker's own finding — including its dollar figure — attributed to
   it by name. The no-figure rule above is this chip's rule, not that line's;
   the two share no state and neither reads the other. See AIPAC TRACKER below.

   NEVER_FEEDS. Not an input to Direction Match / Word vs Action, the formal
   tiers, the publication floor, ballot order, Your Match or any ranking.

   ABSENT IS NOT CLEAN. The chip renders on every profile. "No AIPAC file on
   hand" says the archive holds nothing, not that there is no relationship.
   ========================================================================== */
(function () {
  'use strict';
  var W = typeof window !== 'undefined' ? window : this;

  // AIPAC and the PACs it runs. Matched against the named contributor rows of
  // the filing on file; anything else is not this chip's business.
  var AFFILIATED = [
    /\bAIPAC\b/i,
    /American Israel Public Affairs/i,
    /United Democracy Project/i
  ];

  // The 119th Congress was elected in the 2024 cycle and faces the 2026 one.
  var CONGRESS = '119';
  var CURRENT_CYCLES = ['2024', '2026'];

  // The share of a person's scored votes on the AIPAC-aligned side, per
  // reading, over at least MIN_SCORED roll calls already in the archive.
  // Fewer than that is not a voting record and reads as nothing on file.
  //   >= BACKED_SHARE                       AIPAC-backed
  //   > NOT_ALIGNED_SHARE, < BACKED_SHARE   Mixed
  //   <= NOT_ALIGNED_SHARE                  Not AIPAC-aligned
  var BACKED_SHARE = 0.45;
  var NOT_ALIGNED_SHARE = 0.12;
  var MIN_SCORED = 3;

  // The publishers whose readings the table may hold. `label` is what the
  // chip prints as the source. `credited` says which side the publisher's
  // CREDITED vote is on: both of these credit the vote they count in a
  // member's favour on Palestinian rights, which this site reads as the side
  // that is not AIPAC-aligned.
  var READINGS = {
    imeu: {
      name: 'IMEU',
      label: 'IMEU reading',
      longName: 'the IMEU Policy Project',
      url: 'https://www.imeupolicyproject.org/senate2025',
      credited: 'not_aligned'
    },
    trackaipac: {
      name: 'Track AIPAC',
      label: 'Track AIPAC reading',
      longName: 'Track AIPAC',
      url: 'https://www.trackaipac.com/',
      credited: 'not_aligned'
    }
  };

  // One row per roll call a publisher names, for the current Congress:
  //   { reading: 'imeu'|'trackaipac', chamber: 'house'|'senate', congress: 119,
  //     session: 1|2, rollNumber, measure: 'S.J.Res. 33',
  //     credits: 'yea'|'nay', source: 'https://…' }
  // `credits` is the vote ON THIS ROLL CALL the publisher credits, as it
  // publishes it — no inversion is applied, because the publisher already
  // named the vote and not the motion's effect. Keyed by the archive's roll-
  // call identity, not its database id: that is a serial number and does not
  // survive a reseed. scorecardDefects() is the gate every row must pass.
  var IMEU_SENATE = 'https://www.imeupolicyproject.org/senate2025';
  var SCORECARD = [
    // April 2025 — would have blocked JDAMs and 2,000-pound, 500-pound and
    // small diameter bombs. IMEU: positive score for voting for either.
    { reading: 'imeu', chamber: 'senate', congress: 119, session: 1, rollNumber: 165,
      measure: 'S.J.Res. 33', credits: 'yea', source: IMEU_SENATE },
    { reading: 'imeu', chamber: 'senate', congress: 119, session: 1, rollNumber: 166,
      measure: 'S.J.Res. 26', credits: 'yea', source: IMEU_SENATE },
    // July 2025 — would have blocked JDAMs, 1,000-pound bombs and fully
    // automatic carbine rifles. IMEU: positive score for voting for either.
    { reading: 'imeu', chamber: 'senate', congress: 119, session: 1, rollNumber: 454,
      measure: 'S.J.Res. 41', credits: 'yea', source: IMEU_SENATE },
    { reading: 'imeu', chamber: 'senate', congress: 119, session: 1, rollNumber: 455,
      measure: 'S.J.Res. 34', credits: 'yea', source: IMEU_SENATE }
  ];

  // ── PRO-ISRAEL PACS' OWN REPORTED CONTRIBUTIONS ────────────────────────────
  // The money side for the whole federal roster, not only the thirteen people
  // the money lane carries a filing for. Generated from FEC's bulk file of
  // committee-to-candidate contributions by scripts/gen-aipac-pac.mjs, for the
  // three committees in PACS: type 24K, each committee's OWN contributions and
  // refunds only — earmarked individual donations passed along are excluded —
  // netted per person per committee over the current cycles. A committee is on
  // a person's row only when its net is above zero. These are contributions
  // from political action committees, reported to the FEC; they are not
  // lobbying by AIPAC itself, and the chip says so. No figure below is ever
  // printed. Pro-Israel America PAC files no committee-to-candidate rows in
  // either cycle, so no row carries it today.
  var PACS = {
    aipac: { name: 'AIPAC PAC', fec: 'C00797670' },
    norpac: { name: 'NORPAC', fec: 'C00247403' },
    proisrael: { name: 'Pro-Israel America PAC', fec: 'C00699470' }
  };
  var PAC_KEYS = ['aipac', 'norpac', 'proisrael'];
  // Every money source label starts with this, whichever committees it names.
  var PAC_SOURCE_PREFIX = 'Reported ';
  var PAC_SOURCE_SUFFIX = ' contributions (FEC)';
  function pacSource(keys) {
    var names = keys.map(function (k) { return PACS[k].name; });
    var list = names.length < 3 ? names.join(' and ')
      : names.slice(0, -1).join(', ') + ' and ' + names[names.length - 1];
    return PAC_SOURCE_PREFIX + list + PAC_SOURCE_SUFFIX;
  }
  function isPacSource(src) {
    return typeof src === 'string' && src.indexOf(PAC_SOURCE_PREFIX) === 0 &&
      src.slice(-PAC_SOURCE_SUFFIX.length) === PAC_SOURCE_SUFFIX;
  }
  // BEGIN AIPAC_PAC (generated by scripts/gen-aipac-pac.mjs — do not edit by hand)
  // Per roster person: the FEC candidate id the contributions were filed
  // against, and each committee's net direct contributions per cycle, as
  // reported — aipac: AIPAC PAC, norpac: NORPAC, proisrael: Pro-Israel America PAC.
  // Held for provenance and for the on-file test only; the chip prints none of it.
  // 356 people with a net above zero across 2024 + 2026 (aipac 351, norpac 56, proisrael 0).
  var AIPAC_PAC = {
    aaron_bean: { fec: 'H2FL04211', aipac: { '2024': 10000, '2026': 10000 } },
    abraham_hamadeh: { fec: 'H4AZ08108', aipac: { '2026': 5000 } },
    adam_gray: { fec: 'H2CA13115', aipac: { '2026': 5000 } },
    adam_smith: { fec: 'H6WA09025', aipac: { '2024': 10000, '2026': 5000 }, norpac: { '2026': 5000 } },
    addison_mcdowell: { fec: 'H4NC06177', aipac: { '2024': 10000, '2026': 10000 } },
    adrian_smith: { fec: 'H6NE03115', aipac: { '2024': 10000, '2026': 5000 } },
    adriano_espaillat: { fec: 'H2NY13096', aipac: { '2024': 10000, '2026': 5000 } },
    aguilar: { fec: 'H2CA31125', aipac: { '2024': 5000, '2026': 5000 } },
    andrea_salinas: { fec: 'H2OR06066', aipac: { '2024': 5000 } },
    andrew_ogles: { fec: 'H2TN05446', aipac: { '2024': 10000, '2026': 5000 } },
    andy_barr: { fec: 'H0KY06104', aipac: { '2024': 5000 } },
    andy_harris: { fec: 'H8MD01094', aipac: { '2024': 10000, '2026': 5000 } },
    angie_craig: { fec: 'H6MN02131', aipac: { '2024': 5000, '2026': 5000 } },
    angus_king: { fec: 'S2ME00109', aipac: { '2024': 5000 } },
    ann_wagner: { fec: 'H2MO02102', aipac: { '2024': 10000, '2026': 5000 } },
    april_mcclain_delaney: { fec: 'H4MD06340', aipac: { '2024': 10000 } },
    arrington: { fec: 'H6TX19099', aipac: { '2024': 10000 } },
    ashley_hinson: { fec: 'H0IA01174', aipac: { '2024': 10000, '2026': 0 } },
    ashley_moody: { fec: 'S6FL00640', aipac: { '2026': 5000 } },
    austin_scott: { fec: 'H0GA08099', aipac: { '2024': 10000, '2026': 4000 } },
    banks: { fec: 'H6IN03229', norpac: { '2024': 23000, '2026': 20600 } },
    barrasso: { fec: 'S6WY00068', aipac: { '2024': 5000 } },
    barry_loudermilk: { fec: 'H4GA11061', aipac: { '2024': 10000 } },
    barry_moore: { fec: 'H8AL02171', aipac: { '2024': 5000 } },
    ben_cline: { fec: 'H8VA06104', aipac: { '2024': 10000, '2026': 5000 } },
    beth_van_duyne: { fec: 'H0TX24209', aipac: { '2024': 10000, '2026': 5000 } },
    bill_huizenga: { fec: 'H0MI02094', aipac: { '2024': 5000, '2026': 5000 } },
    blackburn: { fec: 'S8TN00337', aipac: { '2024': 10000 }, norpac: { '2024': 42380 } },
    bmoore: { fec: 'H0UT01205', aipac: { '2024': 5000, '2026': 5000 } },
    booker: { fec: 'S4NJ00185', aipac: { '2026': 5000 }, norpac: { '2024': 13200 } },
    brad_finstad: { fec: 'H2MN01223', aipac: { '2024': 10000, '2026': 10000 } },
    brad_knott: { fec: 'H4NC13116', aipac: { '2024': 10000, '2026': 5000 } },
    brad_schneider: { fec: 'H2IL10068', aipac: { '2024': 10000, '2026': 5000 }, norpac: { '2026': 3500 } },
    brad_sherman: { fec: 'H6CA24113', aipac: { '2024': 10000, '2026': 5000 }, norpac: { '2024': 5000, '2026': 5000 } },
    brandon_gill: { fec: 'H4TX26149', aipac: { '2024': 10000, '2026': 5000 } },
    brendan_boyle: { fec: 'H4PA13199', aipac: { '2024': 10000, '2026': 10000 } },
    brian_babin: { fec: 'H6TX02079', aipac: { '2024': 10000, '2026': 5000 } },
    brian_jack: { fec: 'H4GA03126', aipac: { '2024': 15000, '2026': 15000 } },
    brian_mast: { fec: 'H6FL18097', aipac: { '2024': 10000, '2026': 5000 }, norpac: { '2026': 8500 } },
    brittany_pettersen: { fec: 'H8CO07045', aipac: { '2024': 10000, '2026': 5000 } },
    bruce_westerman: { fec: 'H4AR04048', aipac: { '2024': 10000, '2026': 10000 } },
    bryan_steil: { fec: 'H8WI01156', aipac: { '2024': 10000, '2026': 5000 } },
    buddy_carter: { fec: 'H4GA01039', aipac: { '2024': 10000 } },
    c_franklin: { fec: 'H0FL15104', aipac: { '2024': 5000, '2026': 5000 } },
    capito: { fec: 'S4WV00159', aipac: { '2026': 5000 }, norpac: { '2026': 500 } },
    carlos_gimenez: { fec: 'H0FL26036', aipac: { '2024': 10000, '2026': 5000 } },
    carol_miller: { fec: 'H8WV03097', aipac: { '2024': 10000, '2026': 5000 } },
    cassidy: { fec: 'S4LA00107', aipac: { '2026': 5000 } },
    charles_chuck_edwards: { fec: 'H2NC14050', aipac: { '2024': 10000, '2026': 10000 } },
    chris_deluzio: { fec: 'H2PA17103', aipac: { '2024': 1000 } },
    chris_pappas: { fec: 'H8NH01210', aipac: { '2024': 10000, '2026': 10000 }, norpac: { '2026': 19500 } },
    chris_smith: { fec: 'H8NJ04014', aipac: { '2024': 10000, '2026': 10000 }, norpac: { '2024': 15051 } },
    chrissy_houlahan: { fec: 'H8PA06087', aipac: { '2024': 10000, '2026': -5000 } },
    chuck_fleischmann: { fec: 'H0TN03254', aipac: { '2024': 10000, '2026': 5000 } },
    claudia_tenney: { fec: 'H4NY22051', aipac: { '2024': 10000, '2026': 5000 } },
    clay_higgins: { fec: 'H6LA03148', aipac: { '2024': 5000 } },
    cliff_bentz: { fec: 'H0OR02127', aipac: { '2024': 10000, '2026': -5000 } },
    clyburn: { fec: 'H2SC02042', aipac: { '2024': 5000 } },
    collins: { fec: 'S6ME00159', aipac: { '2026': 10000 }, norpac: { '2026': 3500 } },
    comer: { fec: 'H6KY01110', aipac: { '2024': 10000, '2026': 0 } },
    coons: { fec: 'S0DE00092', aipac: { '2026': 10000 } },
    cotton: { fec: 'S4AR00103', aipac: { '2026': 10000 } },
    craig_goldman: { fec: 'H4TX12065', aipac: { '2024': 5000, '2026': 5000 } },
    cruz: { fec: 'S2TX00312', aipac: { '2024': 10000 }, norpac: { '2024': 7000 } },
    curtis: { fec: 'H8UT03238', aipac: { '2024': 10000 } },
    daines: { fec: 'S2MT00096', aipac: { '2026': 10000 } },
    dale_strong: { fec: 'H2AL05102', aipac: { '2024': 5000, '2026': 5000 } },
    dan_crenshaw: { fec: 'H8TX02166', aipac: { '2024': 10000, '2026': 10000 } },
    dan_goldman: { fec: 'H2NY10308', aipac: { '2024': 10000, '2026': 0 } },
    dan_newhouse: { fec: 'H4WA04104', aipac: { '2024': 6500 } },
    dan_sullivan: { fec: 'S4AK00214', aipac: { '2026': 5000 } },
    daniel_meuser: { fec: 'H8PA10147', aipac: { '2024': 5000, '2026': 10000 } },
    daniel_webster: { fec: 'H0FL08208', aipac: { '2024': 10000, '2026': 5000 } },
    darin_lahood: { fec: 'H6IL18088', aipac: { '2024': 10000, '2026': 5000 } },
    darrell_issa: { fec: 'H0CA48024', aipac: { '2024': 10000, '2026': 5000 } },
    darren_soto: { fec: 'H6FL09179', aipac: { '2024': 10000, '2026': 15000 }, norpac: { '2024': 9890, '2026': 18700 } },
    david_joyce: { fec: 'H2OH14064', aipac: { '2024': 5000, '2026': 5000 } },
    david_kustoff: { fec: 'H2TN07103', aipac: { '2024': 10000, '2026': 5000 } },
    david_rouzer: { fec: 'H2NC07096', aipac: { '2024': 5000, '2026': 5000 } },
    david_schweikert: { fec: 'H4AZ06045', aipac: { '2024': 10000 } },
    david_taylor: { fec: 'H4OH02248', aipac: { '2024': 10000, '2026': 5000 } },
    david_valadao: { fec: 'H2CA20094', aipac: { '2024': 5000, '2026': 10000 } },
    deb_fischer: { fec: 'S2NE00094', aipac: { '2024': 10000 } },
    debbie_wasserman_schultz: { fec: 'H4FL20023', aipac: { '2024': 10000, '2026': 10000 } },
    deborah_ross: { fec: 'H0NC02125', aipac: { '2024': 5000 } },
    delauro: { fec: 'H0CT03072', aipac: { '2024': 5000 } },
    delbene: { fec: 'H0WA08046', aipac: { '2024': 10000, '2026': 0 } },
    derek_schmidt: { fec: 'H4KS02164', aipac: { '2024': 10000, '2026': 10000 } },
    derrick_van_orden: { fec: 'H0WI03175', aipac: { '2024': 10000, '2026': 6000 } },
    diana_harshbarger: { fec: 'H0TN01118', aipac: { '2024': 10000, '2026': 5000 } },
    dina_titus: { fec: 'H8NV03036', aipac: { '2024': 10000, '2026': 5000 } },
    don_bacon: { fec: 'H6NE02125', aipac: { '2024': 10000 }, norpac: { '2024': 16750 } },
    don_davis: { fec: 'H2NC02287', aipac: { '2024': 10000, '2026': 10000 } },
    donald_norcross: { fec: 'H4NJ01084', aipac: { '2024': 5000, '2026': 5000 }, norpac: { '2024': 5000 } },
    donalds: { fec: 'H2FL14186', aipac: { '2024': 10000 } },
    doris_matsui: { fec: 'H6CA05195', aipac: { '2024': 10000 } },
    dusty_johnson: { fec: 'H8SD01055', aipac: { '2024': 10000 }, norpac: { '2026': 6500 } },
    ed_case: { fec: 'H2HI02128', aipac: { '2024': 10000 } },
    emanuel_cleaver: { fec: 'H4MO05234', aipac: { '2024': 10000 } },
    emilia_sykes: { fec: 'H2OH13264', aipac: { '2024': 15000, '2026': 10000 } },
    emmer: { fec: 'H4MN06087', aipac: { '2024': 10000, '2026': 10000 } },
    eric_burlison: { fec: 'H2MO07143', aipac: { '2024': 5000, '2026': 5000 } },
    eric_sorensen: { fec: 'H2IL17147', aipac: { '2024': 5000, '2026': 5000 } },
    erin_houchin: { fec: 'H6IN09143', aipac: { '2026': 5000 } },
    ernst: { fec: 'S4IA00129', norpac: { '2024': 37970 } },
    fetterman: { fec: 'S6PA00274', norpac: { '2024': 11250 } },
    fitzpatrick: { fec: 'H6PA08277', aipac: { '2024': 10000, '2026': 5000 }, norpac: { '2026': 7000 } },
    foxx: { fec: 'H4NC05146', aipac: { '2024': 10000, '2026': 5000 }, norpac: { '2024': 13800 } },
    frank_lucas: { fec: 'H4OK06056', aipac: { '2024': 10000, '2026': 5000 } },
    frank_mrvan: { fec: 'H0IN01150', aipac: { '2024': 10000, '2026': 10000 } },
    frederica_wilson: { fec: 'H0FL17068', aipac: { '2024': 5000 } },
    french_hill: { fec: 'H4AR02141', aipac: { '2024': 10000, '2026': 5000 } },
    gabe_amo: { fec: 'H4RI01265', aipac: { '2024': 15000, '2026': 1000 } },
    gabe_evans: { fec: 'H4CO08034', aipac: { '2026': 5000 } },
    garbarino: { fec: 'H0NY02234', aipac: { '2024': 10000, '2026': 10000 } },
    gary_palmer: { fec: 'H4AL06098', aipac: { '2024': 5000, '2026': 5000 } },
    george_latimer: { fec: 'H4NY16087', aipac: { '2024': 10000, '2026': 5000 }, norpac: { '2024': 43550 } },
    gilbert_cisneros: { fec: 'H4CA31170', aipac: { '2026': 5000 } },
    gillibrand: { fec: 'S0NY00410', aipac: { '2024': 10000 }, norpac: { '2024': 25000, '2026': 4000 } },
    glenn_grothman: { fec: 'H4WI06048', aipac: { '2024': 10000, '2026': 5000 } },
    glenn_ivey: { fec: 'H2MD04315', aipac: { '2026': 5000 } },
    glenn_thompson: { fec: 'H8PA05071', aipac: { '2024': 5000, '2026': 5000 } },
    grace_meng: { fec: 'H2NY06116', aipac: { '2024': 10000, '2026': 5000 }, norpac: { '2024': 8195 } },
    graham: { fec: 'S0SC00149', aipac: { '2026': 5000 }, norpac: { '2026': 26800 } },
    greg_landsman: { fec: 'H2OH01194', aipac: { '2024': 10000, '2026': 10000 } },
    greg_stanton: { fec: 'H8AZ09040', aipac: { '2024': 10000 } },
    gregory_murphy: { fec: 'H0NC03172', aipac: { '2024': 5000, '2026': 10000 }, norpac: { '2024': 360 } },
    gus_bilirakis: { fec: 'H6FL09070', aipac: { '2024': 10000, '2026': 10000 } },
    guthrie: { fec: 'H8KY02031', aipac: { '2024': 10000, '2026': 0 } },
    guy_reschenthaler: { fec: 'H8PA18199', aipac: { '2024': 10000, '2026': 10000 }, norpac: { '2026': 1000 } },
    h_griffith: { fec: 'H0VA09055', aipac: { '2024': 10000, '2026': 5000 } },
    hagerty: { fec: 'S0TN00169', aipac: { '2026': 5000 } },
    hal_rogers: { fec: 'H0KY05015', aipac: { '2024': 10000, '2026': 5000 } },
    haley_stevens: { fec: 'H8MI11254', aipac: { '2024': 10000, '2026': 5000 } },
    harriet_hageman: { fec: 'H2WY00166', aipac: { '2024': 10000 } },
    hawley: { fec: 'S8MO00160', aipac: { '2024': 10000 }, norpac: { '2024': 35086 } },
    henry_cuellar: { fec: 'H2TX23082', aipac: { '2024': 5000, '2026': 10000 } },
    herbert_conaway: { fec: 'H4NJ03080', aipac: { '2024': 5000 } },
    hillary_scholten: { fec: 'H0MI03316', aipac: { '2024': 5000, '2026': 6500 } },
    hudson: { fec: 'H2NC08185', aipac: { '2024': 10000, '2026': 5000 } },
    hyde_smith: { fec: 'S8MS00261', aipac: { '2026': 10000 } },
    j_correa: { fec: 'H6CA46116', aipac: { '2024': 0, '2026': 5000 } },
    jack_bergman: { fec: 'H6MI01226', aipac: { '2024': 10000, '2026': 5000 } },
    jake_auchincloss: { fec: 'H0MA04192', aipac: { '2024': 10000, '2026': 10000 }, norpac: { '2024': 15700 } },
    jake_ellzey: { fec: 'H8TX06266', aipac: { '2024': 10000, '2026': 10000 } },
    james_baird: { fec: 'H8IN04199', aipac: { '2024': 5000, '2026': 5000 } },
    jared_golden: { fec: 'H8ME02185', aipac: { '2024': 5000, '2026': 5000 }, norpac: { '2024': 2300 } },
    jared_moskowitz: { fec: 'H2FL22171', aipac: { '2024': 10000, '2026': 10000 } },
    jason_crow: { fec: 'H8CO06229', aipac: { '2024': 500 } },
    jason_smith: { fec: 'H4MO08162', aipac: { '2024': 10000, '2026': 5000 } },
    jay_obernolte: { fec: 'H0CA08135', aipac: { '2024': 5000, '2026': 5000 } },
    jeff_hurd: { fec: 'H4CO03357', aipac: { '2026': 5000 } },
    jefferson_shreve: { fec: 'H4IN06185', aipac: { '2024': 5000, '2026': 5000 } },
    jefferson_van_drew: { fec: 'H8NJ02166', aipac: { '2024': 10000, '2026': 10000 } },
    jeffries: { fec: 'H2NY10092', aipac: { '2024': 7500 } },
    jennifer_kiggans: { fec: 'H2VA02064', aipac: { '2024': 5000, '2026': 6000 } },
    jennifer_mcclellan: { fec: 'H4VA04066', aipac: { '2024': 10000 } },
    jim_costa: { fec: 'H4CA20082', aipac: { '2024': 15000, '2026': 10000 } },
    jim_himes: { fec: 'H8CT04172', aipac: { '2024': 500 } },
    jim_jordan: { fec: 'H6OH04082', aipac: { '2024': 5000, '2026': 15000 } },
    jimmy_gomez: { fec: 'H8CA34266', aipac: { '2024': 10000, '2026': 5000 } },
    jimmy_panetta: { fec: 'H6CA20152', aipac: { '2024': 10000, '2026': 5000 } },
    jimmy_patronis: { fec: 'H6FL01390', aipac: { '2026': 15000 } },
    joe_courtney: { fec: 'H2CT02112', aipac: { '2024': 6000 } },
    joe_wilson: { fec: 'H2SC02059', aipac: { '2024': 5000, '2026': 10000 } },
    john_carter: { fec: 'H2TX31044', aipac: { '2024': 5000, '2026': 5000 } },
    john_cornyn: { fec: 'S2TX00106', aipac: { '2026': 5000 } },
    john_james: { fec: 'H2MI10150', aipac: { '2024': 10000 }, norpac: { '2024': 50 } },
    john_larson: { fec: 'H8CT01046', aipac: { '2024': 5000, '2026': 10000 } },
    john_moolenaar: { fec: 'H4MI04126', aipac: { '2024': 10000, '2026': 6000 } },
    john_rose: { fec: 'H8TN06094', aipac: { '2024': 10000 } },
    john_rutherford: { fec: 'H6FL04105', aipac: { '2024': 10000, '2026': 6000 } },
    johnny_olszewski: { fec: 'H4MD02232', aipac: { '2024': 10000, '2026': 5000 } },
    jon_husted: { fec: 'S6OH00304', aipac: { '2026': 5000 }, norpac: { '2026': 2500 } },
    joseph_morelle: { fec: 'H8NY25105', aipac: { '2024': 10000, '2026': 5000 } },
    josh_brecheen: { fec: 'H2OK02315', aipac: { '2024': 10000, '2026': 0 } },
    josh_gottheimer: { fec: 'H6NJ05171', aipac: { '2024': 10000, '2026': 5000 }, norpac: { '2024': 83200 } },
    josh_harder: { fec: 'H8CA10126', aipac: { '2024': 5000, '2026': 5000 } },
    joyce_beatty: { fec: 'H2OH03125', aipac: { '2024': 5000, '2026': 5000 } },
    juan_ciscomani: { fec: 'H2AZ02360', aipac: { '2024': 10000, '2026': 5000 } },
    juan_vargas: { fec: 'H2CA50026', aipac: { '2024': 10000, '2026': 10000 } },
    julia_brownley: { fec: 'H2CA00120', aipac: { '2024': 10000 } },
    julia_letlow: { fec: 'H2LA05126', aipac: { '2024': 10000 } },
    julie_fedorchak: { fec: 'H4ND00061', aipac: { '2024': 5000, '2026': 10000 } },
    julie_johnson: { fec: 'H4TX32089', aipac: { '2024': 5000 } },
    kat_cammack: { fec: 'H0FL03175', aipac: { '2024': 10000, '2026': 0 } },
    kathy_castor: { fec: 'H6FL11126', aipac: { '2024': 10000, '2026': 5000 } },
    kclark: { fec: 'H4MA05084', aipac: { '2024': 5000, '2026': 10000 } },
    keith_self: { fec: 'H2TX03290', aipac: { '2026': 5000 } },
    ken_calvert: { fec: 'H2CA37023', aipac: { '2024': 10000, '2026': 5000 } },
    kennedy: { fec: 'H4UT03260', aipac: { '2024': 10000 } },
    kevin_cramer: { fec: 'S8ND00120', aipac: { '2024': 10000 } },
    kevin_hern: { fec: 'H8OK01157', aipac: { '2024': 10000, '2026': 10000 } },
    kevin_kiley: { fec: 'H2CA03157', aipac: { '2024': 5000, '2026': 5000 }, norpac: { '2026': 18000 } },
    kevin_mullin: { fec: 'H2CA14162', aipac: { '2024': 5000 } },
    kim_schrier: { fec: 'H8WA08189', aipac: { '2024': 10000, '2026': 5000 } },
    klobuchar: { fec: 'S6MN00267', aipac: { '2024': 15000 } },
    kweisi_mfume: { fec: 'H6MD07020', aipac: { '2024': 10000, '2026': 10000 } },
    lance_gooden: { fec: 'H8TX05144', aipac: { '2024': 10000, '2026': 5000 } },
    laura_friedman: { fec: 'H4CA30149', aipac: { '2024': 5000, '2026': 5000 } },
    laura_gillen: { fec: 'H4NY04158', aipac: { '2026': 5000 } },
    laurel_lee: { fec: 'H2FL15241', aipac: { '2024': 10000, '2026': 5000 } },
    linda_sanchez: { fec: 'H2CA39078', aipac: { '2024': 9000 } },
    lizzie_fletcher: { fec: 'H8TX07140', aipac: { '2024': 10000, '2026': 5000 } },
    lloyd_smucker: { fec: 'H6PA16320', aipac: { '2024': 10000, '2026': 10000 } },
    lois_frankel: { fec: 'H2FL14053', aipac: { '2024': 10000, '2026': 5250 } },
    lucy_mcbath: { fec: 'H8GA06393', aipac: { '2024': 10000, '2026': 5000 } },
    luna: { fec: 'H0FL13158', aipac: { '2024': 10000 } },
    luz_rivas: { fec: 'H4CA29141', aipac: { '2024': 5000, '2026': 10000 } },
    maggie_goodlander: { fec: 'H4NH02399', aipac: { '2024': 10000, '2026': 5000 }, norpac: { '2024': 100 } },
    maloy: { fec: 'H4UT02296', aipac: { '2024': 15000, '2026': 5000 } },
    marc_veasey: { fec: 'H2TX33073', aipac: { '2024': 10000, '2026': 0 } },
    maria_salazar: { fec: 'H8FL27185', aipac: { '2024': 10000, '2026': 5000 } },
    mariannette_miller_meeks: { fec: 'H8IA02043', aipac: { '2024': 10000, '2026': 6000 } },
    marie_gluesenkamp_perez: { fec: 'H2WA03217', aipac: { '2024': 10000, '2026': 10000 }, norpac: { '2026': 2800 } },
    marilyn_strickland: { fec: 'H0WA10034', aipac: { '2024': 10000, '2026': 10000 } },
    mario_diaz_balart: { fec: 'H2FL25018', aipac: { '2024': 10000, '2026': 5000 } },
    mark_alford: { fec: 'H2MO04207', aipac: { '2024': 5000, '2026': 10000 } },
    mark_amodei: { fec: 'H2NV02395', aipac: { '2024': 10000 } },
    mark_harris: { fec: 'H6NC09200', aipac: { '2024': 10000, '2026': 5000 } },
    mark_messmer: { fec: 'H4IN08249', aipac: { '2024': 5000, '2026': 5000 } },
    max_miller: { fec: 'H2OH16051', aipac: { '2024': 5000, '2026': 5000 }, norpac: { '2024': 14900, '2026': 2000 } },
    mcclain: { fec: 'H0MI10287', aipac: { '2024': 10000, '2026': 5000 } },
    meeks: { fec: 'H8NY06048', aipac: { '2024': 10000, '2026': 10000 } },
    michael_baumgartner: { fec: 'H4WA05234', aipac: { '2024': 10000, '2026': 10000 } },
    michael_cloud: { fec: 'H8TX27049', aipac: { '2024': 10000 } },
    michael_guest: { fec: 'H8MS03125', aipac: { '2024': 10000, '2026': 5000 } },
    michael_mccaul: { fec: 'H4TX10093', aipac: { '2024': 15000 } },
    michael_rulli: { fec: 'H4OH06165', aipac: { '2024': 15000, '2026': 5000 } },
    michael_turner: { fec: 'H2OH03067', aipac: { '2024': 5000, '2026': 5000 } },
    michelle_fischbach: { fec: 'H0MN07091', aipac: { '2024': 10000, '2026': 5000 } },
    mike_bost: { fec: 'H4IL12060', aipac: { '2024': 5000, '2026': 10000 } },
    mike_carey: { fec: 'H2OH15228', aipac: { '2024': 10000, '2026': 10000 } },
    mike_collins: { fec: 'H4GA10071', aipac: { '2026': 5000 } },
    mike_ezell: { fec: 'H2MS04258', aipac: { '2024': 5000, '2026': 5000 } },
    mike_flood: { fec: 'H2NE01118', aipac: { '2024': 10000, '2026': 10000 } },
    mike_haridopolos: { fec: 'H4FL08168', aipac: { '2024': 10000, '2026': 5000 } },
    mike_johnson: { fec: 'H6LA04138', aipac: { '2024': 10000, '2026': 5000 } },
    mike_kelly: { fec: 'H0PA03271', aipac: { '2024': 5000, '2026': 5000 } },
    mike_lawler: { fec: 'H2NY17162', aipac: { '2024': 10000, '2026': 10000 }, norpac: { '2024': 6600, '2026': 10500 } },
    mike_levin: { fec: 'H8CA49058', aipac: { '2024': 10000, '2026': 5000 } },
    mike_rogers_al: { fec: 'H2AL03032', aipac: { '2026': 5000 }, norpac: { '2026': 3500 } },
    mike_rounds: { fec: 'S4SD00049', aipac: { '2026': 5000 }, norpac: { '2026': 200 } },
    mike_simpson: { fec: 'H8ID02064', aipac: { '2024': 10000, '2026': 5000 } },
    mike_waltz: { fec: 'H8FL06148', aipac: { '2024': 10000 } },
    monica_de_la_cruz: { fec: 'H0TX15124', aipac: { '2024': 10000, '2026': 10000 } },
    morgan_luttrell: { fec: 'H2TX08182', aipac: { '2024': 10000 } },
    morgan_mcgarvey: { fec: 'H2KY03206', aipac: { '2024': 5000 } },
    mullin: { fec: 'S2OK00186', aipac: { '2026': 5000 } },
    nancy_mace: { fec: 'H0SC01394', aipac: { '2024': 10000 }, norpac: { '2024': 512 } },
    nancy_pelosi: { fec: 'H8CA05035', aipac: { '2024': 5000 } },
    nanette_barragan: { fec: 'H6CA44103', aipac: { '2024': 5000 } },
    nathaniel_moran: { fec: 'H2TX01112', aipac: { '2024': 10000, '2026': 5000 } },
    neal: { fec: 'H8MA02041', aipac: { '2024': 10000 } },
    neal_dunn: { fec: 'H6FL02208', aipac: { '2024': 10000, '2026': 5000 } },
    neguse: { fec: 'H8CO02160', aipac: { '2024': 10000, '2026': 10000 } },
    nellie_pou: { fec: 'H4NJ09194', aipac: { '2024': 5000 } },
    nicholas_langworthy: { fec: 'H2NY23228', aipac: { '2024': 10000, '2026': 5000 } },
    nicolas_lalota: { fec: 'H2NY01190', aipac: { '2024': 10000, '2026': 10000 }, norpac: { '2024': 1000 } },
    nicole_malliotakis: { fec: 'H0NY11078', aipac: { '2024': 5000, '2026': 10000 } },
    nicole_nikki_budzinski: { fec: 'H2IL13153', aipac: { '2024': 5000 } },
    nikema_williams: { fec: 'H0GA05301', aipac: { '2024': 10000, '2026': 5000 } },
    norma_torres: { fec: 'H4CA35031', aipac: { '2024': 10000, '2026': 5000 } },
    owens: { fec: 'H0UT04076', aipac: { '2024': 5000 } },
    pallone: { fec: 'H8NJ03073', aipac: { '2024': 10000, '2026': 5000 }, norpac: { '2024': 33200 } },
    pat_fallon: { fec: 'H0TX04219', aipac: { '2024': 10000, '2026': 5000 } },
    pat_harrigan: { fec: 'H2NC13243', aipac: { '2024': 10000, '2026': 5000 } },
    pete_sessions: { fec: 'H2TX03126', aipac: { '2024': 10000, '2026': 5000 } },
    pete_stauber: { fec: 'H8MN08043', aipac: { '2024': 5000, '2026': 5000 } },
    pfluger: { fec: 'H0TX11230', aipac: { '2024': 10000, '2026': 10000 } },
    raja_krishnamoorthi: { fec: 'H6IL08147', aipac: { '2024': 5000 } },
    randy_feenstra: { fec: 'H0IA04145', aipac: { '2024': 10000 } },
    randy_weber: { fec: 'H2TX14149', aipac: { '2024': 10000, '2026': 10000 } },
    raul_ruiz: { fec: 'H2CA36439', aipac: { '2024': 10000, '2026': 5000 } },
    reed: { fec: 'S6RI00163', aipac: { '2026': 5000 }, norpac: { '2026': 1000 } },
    rfine: { fec: 'H6FL06258', aipac: { '2026': 10000 } },
    rich_mccormick: { fec: 'H0GA07273', aipac: { '2024': 5000, '2026': 5000 } },
    rick_allen: { fec: 'H2GA12121', aipac: { '2024': 10000, '2026': 5000 } },
    rick_crawford: { fec: 'H0AR01083', aipac: { '2024': 10000, '2026': 5000 } },
    rick_larsen: { fec: 'H0WA02080', aipac: { '2024': 10000, '2026': 5000 } },
    rick_scott: { fec: 'S8FL00273', aipac: { '2024': 15000 } },
    riley_moore: { fec: 'H4WV02205', aipac: { '2024': 10000 } },
    risch: { fec: 'S8ID00092', aipac: { '2026': 5000 }, norpac: { '2026': 18000 } },
    rob_bresnahan: { fec: 'H4PA08124', aipac: { '2026': 10000 } },
    robert_aderholt: { fec: 'H6AL04098', aipac: { '2024': 5000, '2026': 5000 } },
    robert_latta: { fec: 'H8OH05036', aipac: { '2024': 5000, '2026': 5000 } },
    robert_menendez: { fec: 'H2NJ08232', aipac: { '2024': 5000, '2026': 5000 }, norpac: { '2024': 14048 } },
    robert_onder: { fec: 'H4MO03221', aipac: { '2024': 5000, '2026': 5000 } },
    robert_wittman: { fec: 'H8VA01147', aipac: { '2024': 10000, '2026': 6000 } },
    roger_marshall: { fec: 'S0KS00315', aipac: { '2026': 5000 }, norpac: { '2026': 24500 } },
    roger_williams: { fec: 'H2TX33040', aipac: { '2024': 10000, '2026': 5000 } },
    ron_estes: { fec: 'H8KS04112', aipac: { '2024': 10000, '2026': 5000 }, norpac: { '2024': 5000, '2026': 7000 } },
    ronny_jackson: { fec: 'H0TX13228', aipac: { '2024': 20000, '2026': 5000 } },
    rosen: { fec: 'S8NV00156', aipac: { '2024': 5000 } },
    rudy_yakym: { fec: 'H2IN02295', aipac: { '2024': 10000, '2026': 10000 } },
    russ_fulcher: { fec: 'H8ID01124', aipac: { '2024': 10000, '2026': 5000 } },
    russell_fry: { fec: 'H2SC07280', aipac: { '2024': 10000, '2026': 5000 } },
    ryan_mackenzie: { fec: 'H8PA15195', aipac: { '2026': 10000 } },
    sam_graves: { fec: 'H0MO06073', aipac: { '2024': 10000, '2026': 5000 } },
    sanford_bishop: { fec: 'H2GA02031', aipac: { '2024': 10000 } },
    sarah_elfreth: { fec: 'H4MD03156', aipac: { '2024': 5000, '2026': 0 } },
    sarah_mcbride: { fec: 'H4DE00045', aipac: { '2024': 10000 } },
    scalise: { fec: 'H0LA01087', aipac: { '2024': 10000, '2026': 5000 } },
    schiff: { fec: 'H0CA27085', aipac: { '2024': 5000 } },
    scott_desjarlais: { fec: 'H0TN04195', aipac: { '2026': 5000 } },
    scott_fitzgerald: { fec: 'H0WI05113', aipac: { '2024': 10000, '2026': 5000 } },
    scott_perry: { fec: 'H2PA04135', aipac: { '2024': 5000, '2026': 5000 } },
    seth_magaziner: { fec: 'H2RI02184', aipac: { '2024': 10000 } },
    seth_moulton: { fec: 'H4MA06090', aipac: { '2024': 10000, '2026': 0 } },
    sharice_davids: { fec: 'H8KS03155', aipac: { '2024': 10000 } },
    sheehy: { fec: 'S4MT00183', norpac: { '2024': 1000, '2026': 2300 } },
    sheri_biggs: { fec: 'H4SC01313', aipac: { '2024': 10000, '2026': 5000 } },
    shomari_figures: { fec: 'H4AL02170', aipac: { '2024': 5000 } },
    shontel_brown: { fec: 'H2OH11169', aipac: { '2024': 10000, '2026': 5000 } },
    shri_thanedar: { fec: 'H2MI13204', aipac: { '2024': 10000, '2026': 5000 } },
    stefanik: { fec: 'H4NY21079', aipac: { '2024': 5000, '2026': 5000 }, norpac: { '2024': 350 } },
    steny_hoyer: { fec: 'H2MD05155', aipac: { '2024': 10000 } },
    stephanie_bice: { fec: 'H0OK05205', aipac: { '2024': 10000, '2026': 5000 } },
    steve_womack: { fec: 'H0AR03055', aipac: { '2024': 15000, '2026': 5000 } },
    steven_horsford: { fec: 'H2NV04011', aipac: { '2024': 10000, '2026': 5000 } },
    susie_lee: { fec: 'H6NV04020', aipac: { '2026': 10000 } },
    suzanne_bonamici: { fec: 'H2OR01133', aipac: { '2024': 1000 } },
    sylvia_garcia: { fec: 'H8TX29052', aipac: { '2024': 10000, '2026': -5000 } },
    ted_lieu: { fec: 'H4CA33119', aipac: { '2024': 10000, '2026': 10000 } },
    terri_sewell: { fec: 'H0AL07086', aipac: { '2024': 10000 } },
    thomas_kean: { fec: 'H0NJ07261', aipac: { '2024': 10000, '2026': 10000 }, norpac: { '2024': 22340 } },
    tillis: { fec: 'S4NC00162', norpac: { '2024': 1000 } },
    tim_burchett: { fec: 'H8TN02119', aipac: { '2024': 5000, '2026': 5000 } },
    tim_moore: { fec: 'H4NC14015', aipac: { '2024': 5000, '2026': 5000 } },
    timothy_kennedy: { fec: 'H4NY26078', aipac: { '2024': 10000, '2026': 5000 } },
    tom_cole: { fec: 'H2OK04055', aipac: { '2024': 5000, '2026': 5000 } },
    tom_mcclintock: { fec: 'H8CA04152', aipac: { '2024': 10000, '2026': 5000 } },
    tom_suozzi: { fec: 'H6NY03247', aipac: { '2024': 10000, '2026': 10000 }, norpac: { '2024': 50 } },
    tony_wied: { fec: 'H4WI08119', aipac: { '2024': 10000 } },
    torres: { fec: 'H0NY15160', aipac: { '2024': 10500, '2026': 10000 }, norpac: { '2026': 7000 } },
    tracey_mann: { fec: 'H0KS01123', aipac: { '2024': 10000, '2026': 10000 } },
    trent_kelly: { fec: 'H6MS01131', aipac: { '2024': 5000, '2026': 5000 } },
    troy_balderson: { fec: 'H8OH12180', aipac: { '2024': 5000, '2026': 5000 } },
    troy_carter: { fec: 'H2LA02149', aipac: { '2024': 5000 } },
    troy_downing: { fec: 'H4MT02098', aipac: { '2024': 10000, '2026': 5000 } },
    troy_nehls: { fec: 'H0TX22302', aipac: { '2024': 5000 } },
    vern_buchanan: { fec: 'H6FL13148', aipac: { '2024': 10000 } },
    vicente_gonzalez: { fec: 'H6TX15162', aipac: { '2024': 10000, '2026': 10000 } },
    victoria_spartz: { fec: 'H0IN05326', aipac: { '2024': 10000, '2026': 0 } },
    vince_fong: { fec: 'H4CA20181', aipac: { '2024': 10000, '2026': 10000 } },
    w_steube: { fec: 'H8FL17053', aipac: { '2024': 10000, '2026': 5000 } },
    walberg: { fec: 'H4MI07103', aipac: { '2024': 10000, '2026': 5000 }, norpac: { '2026': 27450 } },
    warner: { fec: 'S6VA00093', aipac: { '2026': 5000 }, norpac: { '2024': 15700 } },
    wesley_hunt: { fec: 'H0TX07170', aipac: { '2024': 5000 } },
    whitehouse: { fec: 'S6RI00221', aipac: { '2024': 15000 } },
    wicker: { fec: 'S8MS00196', aipac: { '2024': 5000 }, norpac: { '2024': 27100 } },
    william_keating: { fec: 'H0MA10082', aipac: { '2024': 10000 } },
    william_timmons: { fec: 'H8SC04250', aipac: { '2024': 10000, '2026': 5000 } },
    young_kim: { fec: 'H8CA39240', aipac: { '2024': 10000, '2026': 5000 } },
    yvette_clarke: { fec: 'H4NY11138', aipac: { '2026': 5000 } },
    zach_nunn: { fec: 'H2IA03119', aipac: { '2024': 10000, '2026': 5000 } }
  };
  // END AIPAC_PAC

  // ── AIPAC TRACKER ─────────────────────────────────────────────────────────
  // A SECOND, SEPARATE SURFACE, and the one place in this file a dollar figure
  // is printed. It does not read, feed or change the chip above: it quotes
  // what one outside tracker, AIPAC Tracker (trackaipac.com), publishes about
  // the person, attributed to that tracker in the visible text and the
  // accessible name, and links to the tracker's own page for them. The figure
  // is the tracker's "Israel Lobby Total", exactly as printed there on
  // TRACKER_AS_OF; it is not computed, rounded into a range or checked here.
  // Three lines, and only these:
  //     Accepted $X (AIPAC Tracker)            the tracker prints a figure above $0
  //     Has not accepted funds (AIPAC Tracker) the tracker prints $0
  //     No data on AIPAC Tracker               no tracker page is known for this
  //                                            person, or its page shows no figure
  // With no known page the label links to the tracker's main search instead.
  // No partnership wording, no logo. Not an input to anything in NEVER_FEEDS.
  var TRACKER_HOME = 'https://www.trackaipac.com';
  var TRACKER_SEARCH = TRACKER_HOME + '/tracker';
  // BEGIN AIPAC_TRACKER (generated by scripts/gen-aipac-tracker.mjs — do not edit by hand)
  // Per roster person: [the AIPAC Tracker page slug, the dollar figure the
  // tracker prints as its Israel Lobby Total, or null when its page shows none].
  // Read from trackaipac.com/tracker on TRACKER_AS_OF; these are the tracker's
  // figures, not this site's, and the chip says so.
  // 687 people: 620 with a figure above zero, 20 at $0, 47 with no figure.
  var TRACKER_AS_OF = '2026-11-05';
  var AIPAC_TRACKER = {
    aaron_bean: ['member-aaron-bean-fl-04-r', 80927],
    abdul_el_sayed: ['candidate-endorsements-1-23', null],
    abraham_hamadeh: ['member-abe-hamadeh-az-08-r', 61882],
    adam_gray: ['member-adam-gray-ca-13-d', 72266],
    adam_hamawy: ['candidate-endorsements-1-31', null],
    adam_smith: ['member-adam-smith-wa-09-d', 661852],
    addison_mcdowell: ['member-addison-mcdowell-nc-06-r', 67737],
    adelita_grijalva: ['member-adelita-grijalva-az-07-d', 5186],
    adrian_boafo: ['candidate-candidates-1-23', 5753013],
    adrian_smith: ['member-adrian-smith-ne-03-r', 34871],
    adriano_espaillat: ['member-adriano-espaillat-ny-13-d', 3753386],
    aguilar: ['member-pete-aguilar-ca-33-d', 1541561],
    aisha_wahab: ['member-aisha-wahab-ca-14-d', 128633],
    al_green: ['member-al-green-tx-09-d', 27855],
    alan_armstrong: ['member-alan-armstrong-ok-sen-r', 0],
    alex_mealer: ['candidate-candidates-1-131', 31035],
    alma_adams: ['member-alma-adams-nc-12-d', 25883],
    alsobrooks: ['member-angela-alsobrooks-md-sen-d', 246550],
    amanda_mckinney: ['candidate-candidates-1-145', 5000],
    ami_bera: ['member-ami-bera-ca-06-d', 269520],
    amish_shah: ['candidate-candidates-1-2', 55908],
    analilia_mejia: ['member-analilia-mejia-nj-11-d', 12010],
    andre_carson: ['member-andre-carson-in-07-d', 24930],
    andrea_salinas: ['member-andrea-salinas-or-06-d', 303332],
    andrew_clyde: ['member-andrew-clyde-ga-09-r', 1000],
    andrew_ogles: ['member-andy-ogles-tn-05-r', 47157],
    andy_barr: ['member-andy-barr-ky-06-r', 324757],
    andy_beshear: ['candidate-presidential-2028-1-1', null],
    andy_biggs: ['member-andy-biggs-az-05-r', 28684],
    andy_harris: ['member-andy-harris-md-01-r', 111973],
    andy_kim: ['member-andy-kim-nj-sen-d', 530808],
    angela_torres: ['candidate-endorsements-1-8', null],
    angelica_duenas: ['candidate-endorsements-1-7', null],
    angie_craig: ['member-angie-craig-mn-02-d', 656710],
    angie_nixon: ['candidate-endorsements-1-12', null],
    angus_king: ['member-angus-king-me-sen-i', 206555],
    ann_wagner: ['member-ann-wagner-mo-02-r', 319150],
    annie_andrews: ['candidate-candidates-1-42', 5460],
    aoc: ['member-alexandria-ocasio-cortez-ny-14-d', 0],
    april_mcclain_delaney: ['member-april-mcclain-delaney-md-06-d', 159486],
    arrington: ['member-jodey-arrington-tx-19-r', 44730],
    ashley_bell: ['candidate-endorsements-1-26', null],
    ashley_hinson: ['member-ashley-hinson-ia-02-r', 217610],
    ashley_moody: ['member-ashley-moody-fl-sen-r', 696778],
    austin_scott: ['member-austin-scott-ga-08-r', 66234],
    ayanna_pressley: ['member-ayanna-pressley-ma-07-d', 0],
    baldacci_me: ['candidate-candidates-1-85', 0],
    bale_dalton: ['candidate-candidates-1-62', 2500],
    banks: ['member-jim-banks-in-sen-r', 354151],
    barrasso: ['member-john-barrasso-wy-sen-r', 693198],
    barry_loudermilk: ['member-barry-loudermilk-ga-11-r', 78182],
    barry_moore: ['member-barry-moore-al-01-r', 34173],
    becca_balint: ['member-becca-balint-vt-at-large-d', 67213],
    ben_cline: ['member-ben-cline-va-06-r', 55604],
    ben_mcadams: ['candidate-candidates-1-52', 309406],
    bennet: ['member-michael-bennet-co-sen-d', 357096],
    bennie_thompson: ['member-bennie-thompson-ms-02-d', 9550],
    beth_macy: ['candidate-candidates-1-144', 0],
    beth_van_duyne: ['member-beth-van-duyne-tx-24-r', 109034],
    betty_mccollum: ['member-betty-mccollum-mn-04-d', 59108],
    bill_foster: ['member-bill-foster-il-11-d', 424630],
    bill_huizenga: ['member-bill-huizenga-mi-04-r', 65621],
    blackburn: ['member-marsha-blackburn-tn-sen-r', 449382],
    blake_gendebien: ['candidate-candidates-1-116', 2300],
    blumenthal: ['member-richard-blumenthal-ct-sen-d', 326757],
    blunt_rochester: ['member-lisa-blunt-rochester-de-sen-d', 64626],
    bmoore: ['member-blake-moore-ut-01-r', 108710],
    bob_brooks: ['candidate-candidates-1-123', 69103],
    bob_harvie: ['candidate-candidates-1-118', 2500],
    bobby_pulido: ['candidate-candidates-1-51', 62663],
    bobby_scott: ['member-bobby-scott-va-03-d', 1500],
    boebert: ['member-lauren-boebert-co-04-r', 5810],
    bonnie_watson_coleman: ['member-bonnie-watson-coleman-nj-12-d', 103884],
    booker: ['member-cory-booker-nj-sen-d', 851721],
    boozman: ['member-john-boozman-ar-sen-r', 188516],
    bores_ny: ['candidate-candidates-1-109', 0],
    brad_finstad: ['member-brad-finstad-mn-01-r', 70810],
    brad_knott: ['member-brad-knott-nc-13-r', 17015],
    brad_lander: ['candidate-candidates-1-108', 34292],
    brad_schneider: ['member-brad-schneider-il-10-d', 1215721],
    brad_sherman: ['member-brad-sherman-ca-32-d', 1182741],
    brandon_gill: ['member-brandon-gill-tx-26-r', 48724],
    brendan_boyle: ['member-brendan-boyle-pa-02-d', 467758],
    brent_taylor: ['candidate-candidates-1-43', 10000],
    brian_babin: ['member-brian-babin-tx-36-r', 44571],
    brian_jack: ['member-brian-jack-ga-03-r', 319396],
    brian_mast: ['member-brian-mast-fl-21-r', 944551],
    brian_poindexter: ['candidate-candidates-1-117', 29320],
    brinker_harding: ['candidate-candidates-1-97', 5010],
    britt: ['member-katie-britt-al-sen-r', 106961],
    brittany_pettersen: ['member-brittany-pettersen-co-07-d', 148737],
    bruce_westerman: ['member-bruce-westerman-ar-04-r', 79150],
    bryan_steil: ['member-bryan-steil-wi-01-r', 165249],
    buddy_carter: ['member-buddy-carter-ga-01-r', 72447],
    c_franklin: ['member-scott-franklin-fl-18-r', 99331],
    cain_tx: ['candidate-candidates-1-126', 0],
    cait_conley: ['candidate-candidates-1-37', 84982],
    cantwell: ['member-maria-cantwell-wa-sen-d', 392039],
    capito: ['member-shelley-moore-capito-wv-sen-r', 576802],
    carlos_gimenez: ['member-carlos-a-gimenez-fl-28-r', 130670],
    carol_miller: ['member-carol-miller-wv-01-r', 56971],
    carrie_buck: ['candidate-candidates-1-106', 2000],
    casar: ['member-greg-casar-tx-35-d', 32366],
    casey_askar: ['candidate-candidates-1-67', 5200],
    cassidy: ['member-bill-cassidy-la-sen-r', 647091],
    charles_booker: ['candidate-endorsements-1-20', null],
    charles_chuck_edwards: ['member-chuck-edwards-nc-11-r', 87169],
    charlie_hatcher: ['candidate-candidates-1-127', 5000],
    chaz_molder: ['candidate-candidates-1-128', 2500],
    chellie_pingree: ['member-chellie-pingree-me-01-d', 63025],
    chip_roy: ['member-chip-roy-tx-21-r', 17000],
    chris_backemeyer: ['candidate-candidates-1-96', 500],
    chris_deluzio: ['member-chris-deluzio-pa-17-d', 354095],
    chris_gober: ['candidate-candidates-1-132', 15030],
    chris_murphy: ['member-chris-murphy-ct-sen-d', 133605],
    chris_pappas: ['member-chris-pappas-nh-01-d', 823630],
    chris_shea: ['candidate-candidates-1-61', 1000],
    chris_smith: ['member-chris-smith-nj-04-r', 245348],
    chris_stigall: ['candidate-candidates-1-89', 5000],
    chrissy_houlahan: ['member-chrissy-houlahan-pa-06-d', 114165],
    christian_menefee: ['member-christian-menefee-tx-18-d', 0],
    christina_bohannan: ['candidate-candidates-1-13', 386568],
    christina_hines: ['candidate-candidates-1-86', 2500],
    chuck_fleischmann: ['member-chuck-fleischmann-tn-03-r', 61502],
    chuck_hubbard: ['candidate-candidates-1-91', 0],
    chuy_garcia: ['member-jesus-chuy-garcia-il-04-d', 21150],
    claire_valdez: ['candidate-endorsements-1-32', null],
    claudia_tenney: ['member-claudia-tenney-ny-24-r', 147037],
    clay_fuller: ['member-clay-fuller-ga-14-r', 13500],
    clay_higgins: ['member-clay-higgins-la-03-r', 19546],
    cleo_fields: ['member-cleo-fields-la-06-d', 0],
    cliff_bentz: ['member-cliff-bentz-or-02-r', 10786],
    clyburn: ['member-jim-clyburn-sc-06-d', 173073],
    colin_allred: ['candidate-candidates-1-48', 701017],
    collins: ['member-susan-collins-me-sen-r', 4638619],
    comer: ['member-james-comer-ky-01-r', 54301],
    connie_chan: ['candidate-endorsements-1-4', null],
    coons: ['member-chris-coons-de-sen-d', 642254],
    cortez_masto: ['member-catherine-cortez-masto-nv-sen-d', 834493],
    cory_mills: ['member-cory-mills-fl-07-r', 36573],
    cotton: ['member-tom-cotton-ar-sen-r', 1238246],
    craig_goldman: ['member-craig-goldman-tx-12-r', 173606],
    crapo: ['member-mike-crapo-id-sen-r', 223977],
    crockett: ['member-jasmine-crockett-tx-30-d', 0],
    cruz: ['member-ted-cruz-tx-sen-r', 1617745],
    curtis: ['member-john-curtis-ut-sen-r', 67900],
    daines: ['member-steve-daines-mt-sen-r', 717245],
    dale_strong: ['member-dale-strong-al-05-r', 42590],
    dan_crenshaw: ['member-dan-crenshaw-tx-02-r', 355293],
    dan_goldman: ['member-dan-goldman-ny-10-d', 1027384],
    dan_newhouse: ['member-dan-newhouse-wa-04-r', 135870],
    dan_sullivan: ['member-dan-sullivan-ak-sen-r', 979412],
    daniel_biss: ['candidate-candidates-1-18', 364757],
    daniel_meuser: ['member-dan-meuser-pa-09-r', 61333],
    daniel_webster: ['member-daniel-webster-fl-11-r', 95623],
    danny_davis: ['member-danny-davis-il-07-d', 60360],
    danny_minton: ['candidate-endorsements-1-39', null],
    darializa_chevalier: ['candidate-endorsements-1-34', null],
    darin_lahood: ['member-darin-lahood-il-16-r', 148871],
    darline_graham: ['member-darline-graham-sc-sen-r', 13190],
    darrell_issa: ['member-darrell-issa-ca-48-r', 91526],
    darren_soto: ['member-darren-soto-fl-09-d', 588480],
    dave_min: ['member-dave-min-ca-47-d', 96386],
    david_flippo: ['candidate-candidates-1-107', 8550],
    david_joyce: ['member-dave-joyce-oh-14-r', 95921],
    david_kustoff: ['member-david-kustoff-tn-08-r', 255704],
    david_rouzer: ['member-david-rouzer-nc-07-r', 52586],
    david_schweikert: ['member-david-schweikert-az-01-r', 481021],
    david_taylor: ['member-david-taylor-oh-02-r', 51591],
    david_valadao: ['member-david-valadao-ca-22-r', 374465],
    deb_fischer: ['member-deb-fischer-ne-sen-r', 632220],
    debbie_dingell: ['member-debbie-dingell-mi-06-d', 29424],
    debbie_wasserman_schultz: ['member-debbie-wasserman-schultz-fl-25-d', 1954861],
    deborah_ross: ['member-deborah-ross-nc-02-d', 229584],
    delauro: ['member-rosa-delauro-ct-03-d', 186942],
    delbene: ['member-suzan-delbene-wa-01-d', 254120],
    delia_ramirez: ['member-delia-ramirez-il-03-d', 132172],
    denise_powell: ['candidate-candidates-1-32', 41211],
    derek_schmidt: ['member-derek-schmidt-ks-02-r', 48022],
    derek_tran: ['member-derek-tran-ca-45-d', 226788],
    derrick_van_orden: ['member-derrick-van-orden-wi-03-r', 206820],
    diana_degette: ['member-diana-degette-co-01-d', 1666167],
    diana_harshbarger: ['member-diana-harshbarger-tn-01-r', 64055],
    dina_titus: ['member-dina-titus-nv-01-d', 303995],
    don_bacon: ['member-don-bacon-ne-02-r', 1287408],
    don_davis: ['member-don-davis-nc-01-d', 9574515],
    don_leonard: ['candidate-endorsements-1-52', null],
    donald_beyer: ['member-don-beyer-va-08-d', 64389],
    donald_norcross: ['member-donald-norcross-nj-01-d', 353279],
    donalds: ['member-byron-donalds-fl-19-r', 77628],
    donavan_mckinney: ['candidate-endorsements-1-25', null],
    donna_miller: ['candidate-candidates-1-16', 4396393],
    doris_matsui: ['member-doris-matsui-ca-07-d', 321305],
    drew_cox: ['candidate-endorsements-1-19', null],
    duckworth: ['member-tammy-duckworth-il-sen-d', 562821],
    durbin: ['member-dick-durbin-il-sen-d', 638579],
    dusty_johnson: ['member-dusty-johnson-sd-at-large-r', 98014],
    dwight_evans: ['member-dwight-evans-pa-03-d', 38306],
    ed_case: ['member-ed-case-hi-01-d', 83859],
    elaine_luria: ['candidate-candidates-1-53', 2334883],
    eli_crane: ['member-eli-crane-az-02-r', 500],
    eliott_rodriguez: ['candidate-candidates-1-68', 1000],
    elizabeth_lee: ['candidate-endorsements-1-2', null],
    emanuel_cleaver: ['member-emanuel-cleaver-mo-05-d', 95782],
    emilia_sykes: ['member-emilia-sykes-oh-13-d', 421503],
    emily_randall: ['member-emily-randall-wa-06-d', 14480],
    emmer: ['member-tom-emmer-mn-06-r', 1010321],
    eric_burlison: ['member-eric-burlison-mo-07-r', 52281],
    eric_flores: ['candidate-candidates-1-49', 3531],
    eric_sorensen: ['member-eric-sorensen-il-17-d', 321200],
    eric_yonce: ['candidate-endorsements-1-47', null],
    erin_houchin: ['member-erin-houchin-in-09-r', 34486],
    ernst: ['member-joni-ernst-ia-sen-r', 593661],
    eugene_vindman: ['member-eugene-vindman-va-07-d', 13208],
    evan_hunt: ['candidate-endorsements-1-54', null],
    fetterman: ['member-john-fetterman-pa-sen-d', 487491],
    fine_il: ['candidate-candidates-1-80', 7614656],
    fitzpatrick: ['member-brian-fitzpatrick-pa-01-r', 1424975],
    foxx: ['member-virginia-foxx-nc-05-r', 316494],
    frank_lucas: ['member-frank-lucas-ok-03-r', 16539],
    frank_mrvan: ['member-frank-mrvan-in-01-d', 139840],
    fred_wellman: ['candidate-candidates-1-88', 15700],
    frederica_wilson: ['member-frederica-wilson-fl-24-d', 44385],
    frederick_haynes: ['candidate-endorsements-1-43', null],
    french_hill: ['member-french-hill-ar-02-r', 75197],
    gabe_amo: ['member-gabe-amo-ri-01-d', 112518],
    gabe_evans: ['member-gabe-evans-co-08-r', 755545],
    gabe_vasquez: ['member-gabe-vasquez-nm-02-d', 257076],
    gallego: ['member-ruben-gallego-az-sen-d', 141670],
    gallrein: ['candidate-candidates-1-20', 15559506],
    garbarino: ['member-andrew-garbarino-ny-02-r', 295217],
    gary_palmer: ['member-gary-palmer-al-06-r', 93035],
    gavin_newsom: ['candidate-presidential-2028-1-10', null],
    george_latimer: ['member-george-latimer-ny-16-d', 19191509],
    george_whitesides: ['member-george-whitesides-ca-27-d', 62643],
    gilbert_cisneros: ['member-gil-cisneros-ca-31-d', 164858],
    gillibrand: ['member-kirsten-gillibrand-ny-sen-d', 629057],
    glenn_grothman: ['member-glenn-grothman-wi-06-r', 112830],
    glenn_ivey: ['member-glenn-ivey-md-04-d', 7320423],
    glenn_thompson: ['member-glenn-g-t-thompson-pa-15-r', 26955],
    grace_meng: ['member-grace-meng-ny-06-d', 1099499],
    grassley: ['member-chuck-grassley-ia-sen-r', 330397],
    greg_landsman: ['member-greg-landsman-oh-01-d', 1216564],
    greg_stanton: ['member-greg-stanton-az-04-d', 324930],
    greg_stoker: ['candidate-endorsements-1-44', null],
    gregory_murphy: ['member-greg-murphy-nc-03-r', 104810],
    gretchen_whitmer: ['candidate-presidential-2028-1-16', null],
    gus_bilirakis: ['member-gus-bilirakis-fl-12-r', 129260],
    guthrie: ['member-brett-guthrie-ky-02-r', 42566],
    guy_reschenthaler: ['member-guy-reschenthaler-pa-14-r', 516142],
    gwen_moore: ['member-gwen-moore-wi-04-d', 51935],
    h_griffith: ['member-morgan-griffith-va-09-r', 56578],
    hagerty: ['member-bill-hagerty-tn-sen-r', 188925],
    hal_rogers: ['member-hal-rogers-ky-05-r', 58646],
    haley_stevens: ['member-haley-stevens-mi-11-d', 36305500],
    hank_johnson: ['member-hank-johnson-ga-04-d', 68435],
    harriet_hageman: ['member-harriet-hageman-wy-at-large-r', 29590],
    hawley: ['member-josh-hawley-mo-sen-r', 273535],
    heinrich: ['member-martin-heinrich-nm-sen-d', 289507],
    henry_cuellar: ['member-henry-cuellar-tx-28-d', 2469252],
    herbert_conaway: ['member-herb-conaway-nj-03-d', 26075],
    hickenlooper: ['member-john-hickenlooper-co-sen-d', 625613],
    hilda_solis: ['candidate-candidates-1-8', 3515],
    hillary_scholten: ['member-hillary-scholten-mi-03-d', 461311],
    hirono: ['member-mazie-hirono-hi-sen-d', 30848],
    hoeven: ['member-john-hoeven-nd-sen-r', 314804],
    houston_gaines: ['candidate-candidates-1-12', 24000],
    hudson: ['member-richard-hudson-nc-09-r', 292705],
    hyde_smith: ['member-cindy-hyde-smith-ms-sen-r', 280000],
    j_correa: ['member-lou-correa-ca-46-d', 79982],
    jace_yarbrough: ['candidate-candidates-1-135', 15000],
    jack_bergman: ['member-jack-bergman-mi-01-r', 63334],
    jahana_hayes: ['member-jahana-hayes-ct-05-d', 133647],
    jake_auchincloss: ['member-jake-auchincloss-ma-04-d', 1046859],
    jake_ellzey: ['member-jake-ellzey-tx-06-r', 216177],
    james_baird: ['member-jim-baird-in-04-r', 25859],
    james_gallagher: ['member-james-gallagher-ca-01-r', 0],
    james_marter: ['candidate-candidates-1-19', 700],
    james_talarico: ['candidate-candidates-1-45', 450],
    james_walkinshaw: ['member-james-walkinshaw-va-11-d', 9450],
    jan_schakowsky: ['member-jan-schakowsky-il-09-d', 376102],
    janelle_bynum: ['member-janelle-bynum-or-05-d', 1454765],
    janelle_stelson: ['candidate-candidates-1-40', 90609],
    jared_golden: ['member-jared-golden-me-02-d', 1071069],
    jared_huffman: ['member-jared-huffman-ca-02-d', 59962],
    jared_moskowitz: ['member-jared-moskowitz-fl-23-d', 1264884],
    jasmine_clark: ['candidate-candidates-1-71', 8730],
    jason_crow: ['member-jason-crow-co-06-d', 260809],
    jason_smith: ['member-jason-smith-mo-08-r', 110104],
    jay_obernolte: ['member-jay-obernolte-ca-23-r', 36435],
    jayapal: ['member-pramila-jayapal-wa-07-d', 136204],
    jb_pritzker: ['candidate-presidential-2028-1-13', null],
    jeff_crank: ['member-jeff-crank-co-05-r', 52565],
    jeff_hurd: ['member-jeff-hurd-co-03-r', 70702],
    jefferson_shreve: ['member-jefferson-shreve-in-06-r', 19594],
    jefferson_van_drew: ['member-jeff-van-drew-nj-02-r', 93952],
    jeffries: ['member-hakeem-jeffries-ny-08-d', 1500136],
    jennifer_kiggans: ['member-jen-kiggans-va-02-r', 110700],
    jennifer_mcclellan: ['member-jennifer-mcclellan-va-04-d', 96697],
    jeremy_moss: ['candidate-candidates-1-26', 59357],
    jerrad_christian: ['candidate-endorsements-1-35', null],
    jerry_moran: ['member-jerry-moran-ks-sen-r', 163949],
    jessica_steinmann: ['candidate-candidates-1-130', 29502],
    jill_tokuda: ['member-jill-tokuda-hi-02-d', 27000],
    jim_costa: ['member-jim-costa-ca-21-d', 346404],
    jim_himes: ['member-jim-himes-ct-04-d', 76408],
    jim_jordan: ['member-jim-jordan-oh-04-r', 312047],
    jim_justice: ['member-jim-justice-wv-sen-r', 9986],
    jim_mcgovern: ['member-jim-mcgovern-ma-02-d', 75592],
    jim_schwartzel: ['candidate-candidates-1-65', 5000],
    jimmy_gomez: ['member-jimmy-gomez-ca-34-d', 2713306],
    jimmy_panetta: ['member-jimmy-panetta-ca-19-d', 560304],
    jimmy_patronis: ['member-jimmy-patronis-fl-01-r', 52745],
    joanna_mendoza: ['candidate-candidates-1-4', 135995],
    joaquin_castro: ['member-joaquin-castro-tx-20-d', 30401],
    joe_courtney: ['member-joe-courtney-ct-02-d', 107877],
    joe_hathaway: ['candidate-candidates-1-103', 0],
    joe_mitchell: ['candidate-candidates-1-14', 2250],
    joe_strada: ['candidate-candidates-1-63', 5000],
    joe_wilson: ['member-joe-wilson-sc-02-r', 400829],
    john_carter: ['member-john-carter-tx-31-r', 59538],
    john_cavanaugh_ne: ['candidate-candidates-1-95', 3130],
    john_cornyn: ['member-john-cornyn-tx-sen-r', 1238302],
    john_cowan: ['candidate-candidates-1-70', 26300],
    john_duresky: ['candidate-endorsements-1-45', null],
    john_garamendi: ['member-john-garamendi-ca-08-d', 65867],
    john_james: ['member-john-james-mi-10-r', 268355],
    john_joyce: ['member-john-joyce-pa-13-r', 431],
    john_larson: ['member-john-larson-ct-01-d', 254668],
    john_mannion: ['member-john-mannion-ny-22-d', 123981],
    john_mcguire: ['member-john-mcguire-va-05-r', 68229],
    john_moolenaar: ['member-john-moolenaar-mi-02-r', 58512],
    john_rose: ['member-john-rose-tn-06-r', 52738],
    john_rutherford: ['member-john-rutherford-fl-05-r', 85294],
    john_sununu: ['candidate-candidates-1-34', 19500],
    johnny_garcia: ['candidate-candidates-1-50', 189202],
    johnny_garrett: ['candidate-candidates-1-129', 10000],
    johnny_olszewski: ['member-john-olszewski-md-02-d', 77328],
    jon_bonck: ['candidate-candidates-1-139', 5500],
    jon_husted: ['member-jon-husted-oh-sen-r', 686481],
    jon_ossoff: ['member-jon-ossoff-ga-sen-d', 999505],
    jonathan_jackson: ['member-jonathan-jackson-il-01-d', 20500],
    jonathan_nez: ['candidate-candidates-1-58', 42919],
    joseph_morelle: ['member-joe-morelle-ny-25-d', 253776],
    josh_brecheen: ['member-josh-brecheen-ok-02-r', 49402],
    josh_gottheimer: ['member-josh-gottheimer-nj-05-d', 2381833],
    josh_harder: ['member-josh-harder-ca-09-d', 422115],
    josh_riley: ['member-josh-riley-ny-19-d', 224013],
    josh_shapiro: ['candidate-presidential-2028-1-14', null],
    josh_turek: ['candidate-candidates-1-78', 124797],
    joyce_beatty: ['member-joyce-beatty-oh-03-d', 198045],
    juan_ciscomani: ['member-juan-ciscomani-az-06-r', 1394166],
    juan_vargas: ['member-juan-vargas-ca-52-d', 348180],
    judy_chu: ['member-judy-chu-ca-28-d', 29735],
    julia_brownley: ['member-julia-brownley-ca-26-d', 192080],
    julia_letlow: ['member-julia-letlow-la-05-r', 91896],
    juliana_stratton: ['candidate-candidates-1-15', 10675],
    julie_fedorchak: ['member-julie-fedorchak-nd-at-large-r', 45638],
    julie_johnson: ['member-julie-johnson-tx-32-d', 103485],
    justin_early: ['candidate-endorsements-1-55', null],
    justin_pearson: ['candidate-endorsements-1-38', null],
    justin_wagner: ['candidate-endorsements-1-37', null],
    kaine: ['member-tim-kaine-va-sen-d', 444106],
    karen_ortiz: ['candidate-endorsements-1-33', null],
    kat_cammack: ['member-kat-cammack-fl-03-r', 108333],
    kathy_castor: ['member-kathy-castor-fl-14-d', 108656],
    katy_stout: ['candidate-candidates-1-134', 1954],
    kclark: ['member-katherine-clark-ma-05-d', 935769],
    keith_self: ['member-keith-self-tx-03-r', 75518],
    kelly_morrison: ['member-kelly-morrison-mn-03-d', 0],
    ken_calvert: ['member-ken-calvert-ca-41-r', 1136210],
    ken_paxton: ['candidate-candidates-1-44', 6000],
    kennedy: ['member-mike-kennedy-ut-03-r', 15265],
    kennedy_john: ['member-john-kennedy-la-sen-r', 113680],
    kevin_cramer: ['member-kevin-cramer-nd-sen-r', 364123],
    kevin_hern: ['member-kevin-hern-ok-01-r', 174560],
    kevin_kiley: ['member-kevin-kiley-ca-03-i', 90538],
    kevin_mullin: ['member-kevin-mullin-ca-15-d', 736866],
    khanna: ['member-ro-khanna-ca-17-d', 170813],
    kim_schrier: ['member-kim-schrier-wa-08-d', 325278],
    klein_mn: ['candidate-candidates-1-140', 3000],
    klobuchar: ['member-amy-klobuchar-mn-sen-d', 443272],
    kristen_mcdonald_rivet: ['member-kristen-mcdonald-rivet-mi-08-d', 426208],
    kristi_burke: ['candidate-endorsements-1-53', null],
    kurt_alme: ['candidate-candidates-1-27', 106691],
    kweisi_mfume: ['member-kweisi-mfume-md-07-d', 186366],
    kyle_rable: ['candidate-endorsements-1-40', null],
    la_ford: ['candidate-candidates-1-82', 3550],
    lamonica_mciver: ['member-lamonica-mciver-nj-10-d', 0],
    lance_gooden: ['member-lance-gooden-tx-05-r', 53265],
    lankford: ['member-james-lankford-ok-sen-r', 310155],
    lateefah_simon: ['member-lateefah-simon-ca-12-d', 11700],
    laura_friedman: ['member-laura-friedman-ca-30-d', 45723],
    laura_gillen: ['member-laura-gillen-ny-04-d', 550628],
    laurel_lee: ['member-laurel-lee-fl-15-r', 51710],
    lauren_underwood: ['member-lauren-underwood-il-14-d', 10950],
    laurie_buckhout: ['candidate-candidates-1-30', 11199],
    lee: ['member-mike-lee-ut-sen-r', 289624],
    leela_gray: ['candidate-candidates-1-64', 0],
    linda_sanchez: ['member-linda-sanchez-ca-38-d', 134571],
    lindsay_james: ['candidate-candidates-1-72', 41505],
    lizzie_fletcher: ['member-lizzie-fletcher-tx-07-d', 205784],
    lloyd_doggett: ['member-lloyd-doggett-tx-37-d', 67374],
    lloyd_smucker: ['member-lloyd-smucker-pa-11-r', 93534],
    lois_frankel: ['member-lois-frankel-fl-22-d', 891409],
    lori_trahan: ['member-lori-trahan-ma-03-d', 53453],
    lucy_mcbath: ['member-lucy-mcbath-ga-06-d', 862556],
    lujan: ['member-ben-ray-lujan-nm-sen-d', 102267],
    lummis: ['member-cynthia-lummis-wy-sen-r', 14795],
    luna: ['member-anna-paulina-luna-fl-13-r', 41719],
    luz_rivas: ['member-luz-rivas-ca-29-d', 111886],
    madeleine_dean: ['member-madeleine-dean-pa-04-d', 72725],
    maggie_goodlander: ['member-maggie-goodlander-nh-02-d', 255897],
    maggie_hassan: ['member-maggie-hassan-nh-sen-d', 761112],
    mai_vang: ['candidate-endorsements-1-3', null],
    mallory_mcmorrow: ['candidate-candidates-1-87', 71797],
    maloy: ['member-celeste-maloy-ut-02-r', 86771],
    manny_rutinel: ['candidate-candidates-1-60', 18100],
    marc_veasey: ['member-marc-veasey-tx-33-d', 116097],
    marcy_kaptur: ['member-marcy-kaptur-oh-09-d', 258342],
    maria_salazar: ['member-maria-salazar-fl-27-r', 191492],
    mariannette_miller_meeks: ['member-marianette-miller-meeks-ia-01-r', 295585],
    marie_gluesenkamp_perez: ['member-marie-gluesenkamp-perez-wa-03-d', 527075],
    marilyn_strickland: ['member-marilyn-strickland-wa-10-d', 375383],
    mario_diaz_balart: ['member-mario-diaz-balart-fl-26-r', 1256808],
    mark_alford: ['member-mark-alford-mo-04-r', 80505],
    mark_amodei: ['member-mark-amodei-nv-02-r', 36207],
    mark_desaulnier: ['member-mark-desaulnier-ca-10-d', 27060],
    mark_harris: ['member-mark-harris-nc-08-r', 46318],
    mark_kelly: ['member-mark-kelly-az-sen-d', 556332],
    mark_lamb: ['candidate-candidates-1-3', 2000],
    mark_messmer: ['member-mark-messmer-in-08-r', 2852340],
    mark_pocan: ['member-mark-pocan-wi-02-d', 43570],
    mark_teixeira: ['candidate-candidates-1-47', 34705],
    markey: ['member-ed-markey-ma-sen-d', 73009],
    marlin_stutzman: ['member-marlin-stutzman-in-03-r', 48898],
    marni_wilpert: ['candidate-candidates-1-9', 2076814],
    marty_jackley: ['candidate-candidates-1-125', 25000],
    mary_miller: ['member-mary-miller-il-15-r', 11116],
    mary_peltola: ['candidate-candidates-1-1', 249523],
    mary_scanlon: ['member-mary-gay-scanlon-pa-05-d', 76911],
    massie: ['member-thomas-massie-ky-04-r', 0],
    matt_van_epps: ['member-matt-van-epps-tn-07-r', 21778],
    max_miller: ['member-max-miller-oh-07-r', 439543],
    maxine_dexter: ['member-maxine-dexter-or-03-d', 2212990],
    maxine_waters: ['member-maxine-waters-ca-43-d', 4000],
    maxwell_frost: ['member-maxwell-frost-fl-10-d', 2500],
    mcclain: ['member-lisa-mcclain-mi-09-r', 254890],
    mcconnell: ['member-mitch-mcconnell-ky-sen-r', 983146],
    mccormick: ['member-dave-mccormick-pa-sen-r', 173074],
    meeks: ['member-gregory-meeks-ny-05-d', 1178847],
    melanie_stansbury: ['member-melanie-stansbury-nm-01-d', 56661],
    melat_kiros: ['candidate-endorsements-1-9', null],
    melissa_bean: ['candidate-candidates-1-17', 4743560],
    melissa_hernandez: ['candidate-candidates-1-7', 6385454],
    merkley: ['member-jeff-merkley-or-sen-d', 255060],
    micah_lasher: ['candidate-candidates-1-36', 6358],
    michael_alfonso: ['candidate-candidates-1-146', 5000],
    michael_baumgartner: ['member-michael-baumgartner-wa-05-r', 86667],
    michael_cloud: ['member-michael-cloud-tx-27-r', 36023],
    michael_guest: ['member-michael-guest-ms-03-r', 40770],
    michael_mccaul: ['member-michael-mccaul-tx-10-r', 890606],
    michael_rulli: ['member-michael-rulli-oh-06-r', 58564],
    michael_turner: ['member-mike-turner-oh-10-r', 232589],
    michael_whatley: ['candidate-candidates-1-29', 31156],
    michelle_fischbach: ['member-michelle-fischbach-mn-07-r', 83595],
    mike_bost: ['member-mike-bost-il-12-r', 146456],
    mike_carey: ['member-mike-carey-oh-15-r', 96245],
    mike_collins: ['member-mike-collins-ga-10-r', 24546],
    mike_ezell: ['member-mike-ezell-ms-04-r', 51931],
    mike_flood: ['member-mike-flood-ne-01-r', 73971],
    mike_haridopolos: ['member-mike-haridopolos-fl-08-r', 62569],
    mike_johnson: ['member-mike-johnson-la-04-r', 1140006],
    mike_kelly: ['member-mike-kelly-pa-16-r', 65799],
    mike_klein: ['candidate-endorsements-1-46', null],
    mike_lawler: ['member-mike-lawler-ny-17-r', 1337656],
    mike_levin: ['member-mike-levin-ca-49-d', 535672],
    mike_mcguire: ['candidate-candidates-1-5', 8220],
    mike_quigley: ['member-mike-quigley-il-05-d', 91585],
    mike_rogers_al: ['member-mike-rogers-al-03-r', 1091420],
    mike_rounds: ['member-mike-rounds-sd-sen-r', 322671],
    mike_simpson: ['member-mike-simpson-id-02-r', 66973],
    mike_thompson: ['member-mike-thompson-ca-04-d', 1542855],
    missi_hesketh: ['candidate-endorsements-1-51', null],
    monica_de_la_cruz: ['member-monica-de-la-cruz-tx-15-r', 149043],
    moreno: ['member-bernie-moreno-oh-sen-r', 64612],
    morgan_luttrell: ['member-morgan-luttrell-tx-08-r', 31164],
    morgan_mcgarvey: ['member-morgan-mcgarvey-ky-03-d', 160890],
    murkowski: ['member-lisa-murkowski-ak-sen-r', 265262],
    murray: ['member-patty-murray-wa-sen-d', 508336],
    nadler: ['member-jerry-nadler-ny-12-d', 309889],
    nancy_mace: ['member-nancy-mace-sc-01-r', 107936],
    nancy_pelosi: ['member-nancy-pelosi-ca-11-d', 187544],
    nanette_barragan: ['member-nanette-barragan-ca-44-d', 94404],
    nathaniel_moran: ['member-nathaniel-moran-tx-01-r', 69985],
    neal: ['member-richard-neal-ma-01-d', 142196],
    neal_dunn: ['member-neal-dunn-fl-02-r', 63547],
    neguse: ['member-joe-neguse-co-02-d', 436119],
    nellie_pou: ['member-nellie-pou-nj-09-d', 37766],
    nicholas_begich: ['member-nick-begich-ak-at-large-r', 25524],
    nicholas_langworthy: ['member-nick-langworthy-ny-23-r', 101411],
    nicolas_lalota: ['member-nick-lalota-ny-01-r', 235503],
    nicole_locklin: ['candidate-endorsements-1-17', null],
    nicole_malliotakis: ['member-nicole-malliotakis-ny-11-r', 297532],
    nicole_nikki_budzinski: ['member-nikki-budzinski-il-13-d', 316889],
    nikema_williams: ['member-nikema-williams-ga-05-d', 135700],
    norma_torres: ['member-norma-torres-ca-35-d', 512751],
    nydia_velazquez: ['member-nydia-velazquez-ny-07-d', 79477],
    omar: ['member-ilhan-omar-mn-05-d', 0],
    owens: ['member-burgess-owens-ut-04-r', 76196],
    padilla: ['member-alex-padilla-ca-sen-d', 104055],
    paige_cognetti: ['candidate-candidates-1-39', 111570],
    pallone: ['member-frank-pallone-nj-06-d', 239940],
    pat_fallon: ['member-pat-fallon-tx-04-r', 105949],
    pat_harrigan: ['member-pat-harrigan-nc-10-r', 33319],
    patrick_ryan: ['member-pat-ryan-ny-18-d', 441770],
    patty_garcia: ['candidate-endorsements-1-50', null],
    paul_gosar: ['member-paul-gosar-az-09-r', 15750],
    paul_nolley: ['candidate-endorsements-1-18', null],
    paul_tonko: ['member-paul-tonko-ny-20-d', 59640],
    pete_sessions: ['member-pete-sessions-tx-17-r', 68327],
    pete_stauber: ['member-pete-stauber-mn-08-r', 67264],
    peters: ['member-gary-peters-mi-sen-d', 499911],
    pfluger: ['member-august-pfluger-tx-11-r', 219713],
    pia_dandiya: ['candidate-candidates-1-66', 2500],
    preston_il: ['candidate-candidates-1-73', 1650],
    raja_krishnamoorthi: ['member-raja-krishnamoorthi-il-08-d', 266094],
    ralph_alvarado: ['candidate-candidates-1-21', 70693],
    ralph_norman: ['member-ralph-norman-sc-05-r', 10200],
    rand_paul: ['member-rand-paul-ky-sen-r', 2000],
    randy_feenstra: ['member-randy-feenstra-ia-04-r', 106694],
    randy_villegas: ['candidate-endorsements-1-5', null],
    randy_weber: ['member-randy-weber-tx-14-r', 107077],
    raskin: ['member-jamie-raskin-md-08-d', 179927],
    raul_ruiz: ['member-raul-ruiz-ca-25-d', 221276],
    raymond_mckay: ['candidate-candidates-1-41', 57],
    rebecca_bennett: ['candidate-candidates-1-101', 313967],
    rebecca_cooke: ['candidate-candidates-1-54', 209336],
    reed: ['member-jack-reed-ri-sen-d', 538859],
    rfine: ['member-randy-fine-fl-06-r', 713493],
    rich_mccormick: ['member-rich-mccormick-ga-07-r', 116416],
    richard_pan: ['candidate-candidates-1-59', 26706],
    rick_allen: ['member-rick-allen-ga-12-r', 53633],
    rick_crawford: ['member-rick-crawford-ar-01-r', 25401],
    rick_larsen: ['member-rick-larsen-wa-02-d', 87161],
    rick_scott: ['member-rick-scott-fl-sen-r', 573767],
    ricketts: ['member-pete-ricketts-ne-sen-r', 457379],
    riley_moore: ['member-riley-moore-wv-02-r', 35530],
    risch: ['member-jim-risch-id-sen-r', 838484],
    rob_bresnahan: ['member-rob-bresnahan-pa-08-r', 117267],
    robb_ryerse: ['candidate-endorsements-1-1', null],
    robert_aderholt: ['member-robert-aderholt-al-04-r', 122830],
    robert_garcia: ['member-robert-garcia-ca-42-d', 107357],
    robert_latta: ['member-bob-latta-oh-05-r', 75401],
    robert_menendez: ['member-rob-menendez-nj-08-d', 721390],
    robert_onder: ['member-bob-onder-mo-03-r', 47779],
    robert_people: ['candidate-endorsements-1-48', null],
    robert_wittman: ['member-rob-wittman-va-01-r', 123433],
    robin_kelly: ['member-robin-kelly-il-02-d', 62992],
    roger_marshall: ['member-roger-marshall-ks-sen-r', 311100],
    roger_williams: ['member-roger-williams-tx-25-r', 39532],
    ron_desantis: ['candidate-presidential-2028-2-2', 56373],
    ron_estes: ['member-ron-estes-ks-04-r', 79192],
    ron_johnson: ['member-ron-johnson-wi-sen-r', 335142],
    ronny_jackson: ['member-ronny-jackson-tx-13-r', 90680],
    rosen: ['member-jacky-rosen-nv-sen-d', 2264274],
    roy_cooper: ['candidate-candidates-1-28', 177499],
    rudy_yakym: ['member-rudy-yakym-in-02-r', 232966],
    russ_fulcher: ['member-russ-fulcher-id-01-r', 37488],
    russell_fry: ['member-russell-fry-sc-07-r', 110358],
    ryan_mackenzie: ['member-ryan-mackenzie-pa-07-r', 121988],
    ryan_zinke: ['member-ryan-zinke-mt-01-r', 52326],
    salud_carbajal: ['member-salud-carbajal-ca-24-d', 50945],
    sam_forstag: ['candidate-candidates-1-90', 7980],
    sam_graves: ['member-sam-graves-mo-06-r', 81756],
    sam_liccardo: ['member-sam-liccardo-ca-16-d', 52780],
    sanders: ['member-bernie-sanders-vt-sen-i', 13763],
    sanford_bishop: ['member-sanford-bishop-ga-02-d', 86537],
    sara_jacobs: ['member-sara-jacobs-ca-51-d', 79581],
    sarah_elfreth: ['member-sarah-elfreth-md-03-d', 4207736],
    sarah_mcbride: ['member-sarah-mcbride-de-at-large-d', 76316],
    sarah_trone_garriott: ['candidate-candidates-1-74', 85976],
    scalise: ['member-steve-scalise-la-01-r', 1083775],
    schatz: ['member-brian-schatz-hi-sen-d', 213132],
    schiff: ['member-adam-schiff-ca-sen-d', 5611163],
    schmitt: ['member-eric-schmitt-mo-sen-r', 38079],
    schumer: ['member-chuck-schumer-ny-sen-d', 411980],
    scott_desjarlais: ['member-scott-desjarlais-tn-04-r', 44249],
    scott_fitzgerald: ['member-scott-fitzgerald-wi-05-r', 48427],
    scott_perry: ['member-scott-perry-pa-10-r', 157977],
    scott_peters: ['member-scott-peters-ca-50-d', 164079],
    sean_casten: ['member-sean-casten-il-06-d', 321969],
    seth_magaziner: ['member-seth-magaziner-ri-02-d', 111986],
    seth_moulton: ['member-seth-moulton-ma-06-d', 101532],
    shaheen: ['member-jeanne-shaheen-nh-sen-d', 533077],
    shannon_taylor: ['candidate-candidates-1-142', 39686],
    sharice_davids: ['member-sharice-davids-ks-03-d', 239995],
    sharif_street: ['candidate-candidates-1-119', 0],
    sheehy: ['member-tim-sheehy-mt-sen-r', 79253],
    sheri_biggs: ['member-sheri-biggs-sc-03-r', 15823],
    sherrod_brown: ['candidate-candidates-1-38', 1725843],
    shomari_figures: ['member-shomari-figures-al-02-d', 2062380],
    shontel_brown: ['member-shontel-brown-oh-11-d', 5091563],
    shri_thanedar: ['member-shri-thanedar-mi-13-d', 2965463],
    slotkin: ['member-elissa-slotkin-mi-sen-d', 517272],
    stefanik: ['member-elise-stefanik-ny-21-r', 683604],
    stefany_shaheen: ['candidate-candidates-1-98', 1214905],
    steny_hoyer: ['member-steny-hoyer-md-05-d', 949516],
    stephanie_bice: ['member-stephanie-bice-ok-05-r', 80732],
    stephen_lynch: ['member-stephen-lynch-ma-08-d', 2000],
    steve_cohen: ['member-steve-cohen-tn-09-d', 128998],
    steve_toth: ['candidate-candidates-1-46', 0],
    steve_womack: ['member-steve-womack-ar-03-r', 153043],
    steven_horsford: ['member-steven-horsford-nv-04-d', 214188],
    steven_shook: ['candidate-endorsements-1-41', null],
    suhas_subramanyam: ['member-suhas-subramanyam-va-10-d', 37743],
    summer_lee: ['member-summer-lee-pa-12-d', 96430],
    susie_lee: ['member-susie-lee-nv-03-d', 913410],
    suzanne_bonamici: ['member-suzanne-bonamici-or-01-d', 98734],
    sydney_kamlager_dove: ['member-sydney-kamlager-dove-ca-37-d', 154736],
    sylvia_garcia: ['member-sylvia-garcia-tx-29-d', 102262],
    takano: ['member-mark-takano-ca-39-d', 89802],
    tammy_baldwin: ['member-tammy-baldwin-wi-sen-d', 789706],
    tanya_lloyd: ['candidate-endorsements-1-42', null],
    ted_budd: ['member-ted-budd-nc-sen-r', 79136],
    ted_lieu: ['member-ted-lieu-ca-36-d', 979902],
    teresa_leger_fernandez: ['member-teresa-leger-fernandez-nm-03-d', 92398],
    terri_sewell: ['member-terri-sewell-al-07-d', 75552],
    tessa_hodge: ['candidate-endorsements-1-6', null],
    thomas_kean: ['member-tom-kean-nj-07-r', 868891],
    thomas_tiffany: ['member-tom-tiffany-wi-07-r', 53176],
    thune: ['member-john-thune-sd-sen-r', 312819],
    tillis: ['member-thom-tillis-nc-sen-r', 403886],
    tim_burchett: ['member-tim-burchett-tn-02-r', 50580],
    tim_moore: ['member-tim-moore-nc-14-r', 41087],
    tim_scott: ['member-tim-scott-sc-sen-r', 249459],
    tim_walz: ['candidate-presidential-2028-1-18', 13005],
    timothy_kennedy: ['member-tim-kennedy-ny-26-d', 156384],
    tina_smith: ['member-tina-smith-mn-sen-d', 113794],
    tlaib: ['member-rashida-tlaib-mi-12-d', 5971],
    todd_young: ['member-todd-young-in-sen-r', 232249],
    tom_barrett: ['member-tom-barrett-mi-07-r', 262898],
    tom_cole: ['member-tom-cole-ok-04-r', 553951],
    tom_mcclintock: ['member-tom-mcclintock-ca-05-r', 49542],
    tom_perriello: ['candidate-candidates-1-143', 79450],
    tom_sell: ['candidate-candidates-1-133', 20032],
    tom_suozzi: ['member-tom-suozzi-ny-03-d', 2488001],
    tommy_tuberville: ['member-tommy-tuberville-al-sen-r', 28674],
    tony_wied: ['member-tony-wied-wi-08-r', 12000],
    torres: ['member-ritchie-torres-ny-15-d', 2142350],
    tracey_mann: ['member-tracey-mann-ks-01-r', 102318],
    trent_kelly: ['member-trent-kelly-ms-01-r', 50031],
    troy_balderson: ['member-troy-balderson-oh-12-r', 85808],
    troy_carter: ['member-troy-carter-la-02-d', 53337],
    troy_downing: ['member-troy-downing-mt-02-r', 30414],
    troy_nehls: ['member-troy-nehls-tx-22-r', 17280],
    valerie_foushee: ['member-valerie-foushee-nc-04-d', 3487970],
    valerie_hoyle: ['member-val-hoyle-or-04-d', 71430],
    van_hollen: ['member-chris-van-hollen-md-sen-d', 228465],
    vern_buchanan: ['member-vern-buchanan-fl-16-r', 81481],
    veronica_escobar: ['member-veronica-escobar-tx-16-d', 54896],
    vicente_gonzalez: ['member-vicente-gonzalez-tx-34-d', 865024],
    victoria_spartz: ['member-victoria-spartz-in-05-r', 86091],
    vince_fong: ['member-vince-fong-ca-20-r', 46421],
    w_steube: ['member-greg-steube-fl-17-r', 102194],
    walberg: ['member-tim-walberg-mi-05-r', 162836],
    warner: ['member-mark-warner-va-sen-d', 809223],
    warnock: ['member-raphael-warnock-ga-sen-d', 859202],
    warren: ['member-elizabeth-warren-ma-sen-d', 30454],
    warren_davidson: ['member-warren-davidson-oh-08-r', 3300],
    welch: ['member-peter-welch-vt-sen-d', 137981],
    wes_climer: ['candidate-candidates-1-124', 25000],
    wes_moore: ['candidate-presidential-2028-1-9', null],
    wesley_bell: ['member-wesley-bell-mo-01-d', 19459826],
    wesley_hunt: ['member-wesley-hunt-tx-38-r', 139862],
    whitehouse: ['member-sheldon-whitehouse-ri-sen-d', 408094],
    wicker: ['member-roger-wicker-ms-sen-r', 533926],
    wiener_ca: ['candidate-candidates-1-6', 107748],
    william_keating: ['member-bill-keating-ma-09-d', 111325],
    william_lawrence: ['candidate-endorsements-1-24', null],
    william_timmons: ['member-william-timmons-sc-04-r', 85441],
    wyden: ['member-ron-wyden-or-sen-d', 414693],
    yassamin_ansari: ['member-yassamin-ansari-az-03-d', 1161274],
    young_kim: ['member-young-kim-ca-40-r', 563766],
    yvette_clarke: ['member-yvette-clarke-ny-09-d', 133360],
    zach_nunn: ['member-zach-nunn-ia-03-r', 168804],
    zoe_lofgren: ['member-zoe-lofgren-ca-18-d', 49413]
  };
  // END AIPAC_TRACKER

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function isAffiliated(name) {
    var n = String(name || '');
    for (var i = 0; i < AFFILIATED.length; i++) if (AFFILIATED[i].test(n)) return true;
    return false;
  }

  // "H.R. 23", "HR23", "h.r.23" → "hr23". The archive item carries its bill
  // as `number`; both sides are reduced the same way before comparing.
  function normMeasure(m) {
    return String(m || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  }
  function rowKey(r) {
    return [r.chamber, r.congress, r.session, r.rollNumber].join('|');
  }
  // The vote on a row's roll call that is on the AIPAC-aligned side.
  function alignedVote(row) {
    var rd = READINGS[row.reading];
    var other = row.credits === 'yea' ? 'nay' : 'yea';
    return rd && rd.credited === 'not_aligned' ? other : row.credits;
  }

  function scorecardDefects(rows) {
    var out = [];
    var seen = {};
    (rows || []).forEach(function (r, i) {
      var at = 'row ' + i;
      if (!r || typeof r !== 'object') { out.push(at + ': not an object'); return; }
      if (r.chamber !== 'house' && r.chamber !== 'senate') out.push(at + ': chamber must be house or senate');
      if (String(r.congress) !== CONGRESS) out.push(at + ': not the current Congress');
      if (r.session !== 1 && r.session !== 2) out.push(at + ': session must be 1 or 2');
      if (!(r.rollNumber > 0) || Math.floor(r.rollNumber) !== r.rollNumber) out.push(at + ': no roll number');
      if (!normMeasure(r.measure)) out.push(at + ': no bill number');
      if (!READINGS[r.reading]) out.push(at + ': unknown reading ' + r.reading);
      var k = r.reading + '|' + rowKey(r);
      if (seen[k]) out.push(at + ': duplicate roll call ' + k);
      seen[k] = true;
      if (r.credits !== 'yea' && r.credits !== 'nay') out.push(at + ': credits must be yea or nay');
      if (!/^https:\/\//.test(String(r.source || ''))) out.push(at + ': no https source');
    });
    return out;
  }

  // ── RECEIPTS ───────────────────────────────────────────────────────────────
  function filingFor(pid) {
    var F = W.PDXFinance;
    if (F && typeof F.filing === 'function') {
      try { var r = F.filing(pid); if (r) return r; } catch (e) {}
    }
    var get = W._pdxFinanceFiling;
    if (typeof get === 'function') {
      try { return get(pid) || null; } catch (e) {}
    }
    return null;
  }

  function sourceName(url) {
    return /opensecrets\.org/i.test(String(url || '')) ? 'OpenSecrets' : 'FEC';
  }

  function receiptsRead(pid) {
    var rec = filingFor(pid);
    if (!rec) return null;
    var hits = (rec.topDonors || []).filter(function (d) { return d && isAffiliated(d.name); });
    if (!hits.length) return null;
    var cycle = rec.funding && rec.funding.cycle ? String(rec.funding.cycle) : '';
    var url = rec.source || (rec.funding && rec.funding.source) || '';
    return {
      state: CURRENT_CYCLES.indexOf(cycle) >= 0 ? 'backed' : 'mixed',
      source: sourceName(url)
    };
  }

  // ── SCORECARD ──────────────────────────────────────────────────────────────
  function stateFor(share) {
    return share >= BACKED_SHARE ? 'backed' : share <= NOT_ALIGNED_SHARE ? 'notaligned' : 'mixed';
  }

  // One read per publisher with at least MIN_SCORED matching formal acts.
  function scorecardReads(pid) {
    if (!SCORECARD.length) return [];
    var VR = W.PDXVotingRecord;
    var items = VR && typeof VR.memberRecords === 'function' ? VR.memberRecords(pid) : null;
    if (!items || !items.length) return [];
    var out = [];
    Object.keys(READINGS).forEach(function (key) {
      var want = {};
      SCORECARD.forEach(function (r) { if (r.reading === key) want[rowKey(r)] = r; });
      var scored = 0, matched = 0;
      items.forEach(function (it) {
        if (!it || it.kind !== 'vote' || String(it.congress) !== CONGRESS) return;
        var row = want[rowKey(it)];
        if (!row || (it.position !== 'yea' && it.position !== 'nay')) return;
        // Same roll call AND same bill, or it is not the act the reading scored.
        if (normMeasure(it.number) !== normMeasure(row.measure)) return;
        scored++;
        if (it.position === alignedVote(row)) matched++;
      });
      if (scored >= MIN_SCORED) out.push({ state: stateFor(matched / scored), source: READINGS[key].label, reading: key });
    });
    return out;
  }

  // The whole read: a state and the sources behind it. No figure leaves here.
  function pacRead(pid) {
    var row = Object.prototype.hasOwnProperty.call(AIPAC_PAC, pid) ? AIPAC_PAC[pid] : null;
    if (!row) return null;
    var keys = PAC_KEYS.filter(function (k) {
      var cyc = row[k], net = 0;
      if (!cyc) return false;
      for (var c in cyc) if (CURRENT_CYCLES.indexOf(c) >= 0) net += cyc[c];
      return net > 0;
    });
    return keys.length ? { state: 'backed', source: pacSource(keys) } : null;
  }

  function read(pid) {
    var reads = [];
    try { var p = pacRead(pid); if (p) reads.push(p); } catch (e) {}
    try { var m = receiptsRead(pid); if (m) reads.push(m); } catch (e) {}
    try { reads = reads.concat(scorecardReads(pid)); } catch (e) {}
    if (!reads.length) return { state: 'empty', sources: [] };
    var backed = reads.filter(function (r) { return r.state === 'backed'; });
    if (backed.length) return { state: 'backed', sources: backed.map(function (r) { return r.source; }) };
    // "Not AIPAC-aligned" only when every read on file says so: AIPAC money
    // in an earlier cycle beside a not-aligned voting record is Mixed.
    var notAligned = reads.every(function (r) { return r.state === 'notaligned'; });
    return {
      state: notAligned ? 'notaligned' : 'mixed',
      sources: reads.map(function (r) { return r.source; })
    };
  }

  // ── THE CHIP ───────────────────────────────────────────────────────────────
  var STATE_TEXT = { backed: 'AIPAC-backed', mixed: 'Mixed', notaligned: 'Not AIPAC-aligned', empty: 'No AIPAC file on hand' };

  function readingFor(label) {
    for (var k in READINGS) if (READINGS[k].label === label) return READINGS[k];
    return null;
  }
  function readingNames() {
    return Object.keys(READINGS).map(function (k) { return READINGS[k].name; }).join(' or ');
  }

  function label(r) {
    if (r.state === 'empty') {
      return 'AIPAC relationship: No AIPAC file on hand. No AIPAC or AIPAC-affiliated PAC ' +
        'receipts in the OpenSecrets or FEC data on file, and fewer than three ' + readingNames() +
        ' scored votes mapped to this archive. This is not a finding that there is no relationship.';
    }
    var src = r.sources.join(' and ');
    var votes = r.sources.map(readingFor).filter(Boolean);
    var money = r.sources.length > votes.length;
    var why = r.state === 'backed'
      ? (money ? (r.sources.some(isPacSource)
          ? 'money from AIPAC PAC, NORPAC or Pro-Israel America PAC in the current cycle'
          : 'AIPAC or AIPAC-affiliated PAC money in the current cycle') : '') +
        (money && votes.length ? ', or ' : '') +
        (votes.length ? 'votes mostly against the side the publisher credits' : '')
      : r.state === 'notaligned'
        ? 'votes almost all on the side the publisher credits'
        : (money ? 'AIPAC-affiliated money outside the current cycle' : '') +
          (money && votes.length ? ', or ' : '') +
          (votes.length ? 'votes split across the side the publisher credits' : '');
    var by = votes.map(function (rd) {
      return ' The vote positions are ' + rd.longName + '\u2019s, not AIPAC\u2019s: it credits ' +
        'votes it counts for Palestinian rights, and this site reads the other side as AIPAC-aligned.';
    }).join('');
    if (r.sources.some(isPacSource)) {
      by += ' The money is direct contributions reported to the FEC in the current cycle by ' +
        'AIPAC PAC, NORPAC or Pro-Israel America PAC, as named in the source: political action ' +
        'committees, not lobbying by AIPAC itself, and not individual donations they passed along.';
    }
    return 'AIPAC relationship: ' + STATE_TEXT[r.state] + '. Source: ' + src + '. ' +
      'Based on ' + why + '.' + by + ' Not a score and not a dollar figure.';
  }

  function segments(r) {
    if (r.state === 'empty') return [STATE_TEXT.empty];
    if (r.state === 'backed' || r.state === 'notaligned') return [STATE_TEXT[r.state]].concat(r.sources);
    return ['AIPAC', STATE_TEXT.mixed].concat(r.sources);
  }

  // Receipts open the money section; a scorecard-only read opens the voting
  // record it was built from.
  function targetFor(r) {
    return r.sources.length && r.sources.every(readingFor) ? 'pdxsec-voting' : 'pdxsec-funding';
  }

  function open(id) {
    try {
      if (typeof W._pdxNavJump === 'function') { W._pdxNavJump(id); return false; }
      if (typeof W._pdxRevealTarget === 'function') W._pdxRevealTarget(id);
      var el = W.document && W.document.getElementById(id);
      if (el && el.scrollIntoView) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (e) {}
    return false;
  }

  // The empty state's short explanation, toggled under the chip. The sentence
  // is the chip's own accessible name less its lead-in, so the wording and the
  // attribution are the ones it already publishes; nothing is navigated.
  function explain(btn) {
    try {
      if (!btn || !btn.parentNode) return false;
      var doc = W.document;
      var next = btn.nextSibling;
      if (next && next.className === 'pdx-aipac-why') {
        next.parentNode.removeChild(next);
        btn.setAttribute('aria-expanded', 'false');
        return false;
      }
      var txt = String(btn.getAttribute('aria-label') || '').replace(/^AIPAC relationship: No AIPAC file on hand\.\s*/, '');
      var note = doc.createElement('span');
      note.className = 'pdx-aipac-why';
      note.setAttribute('role', 'note');
      note.style.cssText = 'display:block;flex-basis:100%;margin:0.3rem 0 0.1rem;padding:0.4rem 0.6rem;' +
        'font-size:0.72rem;line-height:1.45;color:#cbd9ec;background:rgba(15,25,45,0.85);' +
        'border:1px solid rgba(159,180,212,0.25);border-radius:0.5rem;max-width:34rem;';
      note.textContent = txt;
      btn.parentNode.insertBefore(note, btn.nextSibling);
      btn.setAttribute('aria-expanded', 'true');
    } catch (e) {}
    return false;
  }

  // Same token as the two 💰 pills (finance-lane.css): .pdx-mchip, the gold
  // glyph, the separators. Its own data attributes, so the row still carries
  // exactly two money LANES and nothing that counts those pills counts this one.
  function chipHtml(pid) {
    try {
      var r = read(pid);
      var segs = segments(r);
      var inner = '';
      for (var i = 0; i < segs.length; i++) {
        if (i) inner += '<span class="pdx-mchip-sep" aria-hidden="true">·</span>';
        inner += '<span class="pdx-mchip-hi">' + esc(segs[i]) + '</span>';
      }
      return '<button type="button" class="pdx-mchip" data-pdx-aipac="' + esc(pid || '') + '"' +
        ' data-pdx-aipac-state="' + r.state + '"' +
        (r.state === 'empty'
          // Nothing on file means no section to send the reader to: the money
          // section would open on someone else's subject. The chip explains itself
          // in place instead, in the words its accessible name already carries.
          ? ' aria-expanded="false" onclick="event.stopPropagation();if(window.PDXAipac)window.PDXAipac.explain(this);"'
          : ' onclick="event.stopPropagation();if(window.PDXAipac)window.PDXAipac.open(\'' + targetFor(r) + '\');"') +
        ' aria-label="' + esc(label(r)) + '">' +
          '<span class="pdx-mchip-ico" aria-hidden="true">💰</span>' + inner +
        '</button>';
    } catch (e) { return ''; }
  }

  // Host + repaint OUT OF THE EMPTY STATE ONLY: the scorecard side can only
  // answer once the voting record has landed, so a chip built before that is
  // allowed to change its mind once — never a chip already telling the truth.
  var _seq = 0;
  function repaint(pid) {
    var doc = W.document;
    if (!doc || !doc.querySelectorAll) return;
    try {
      var hosts = doc.querySelectorAll('[data-pdx-aipac-host]');
      for (var i = 0; i < hosts.length; i++) {
        var h = hosts[i];
        if (h.getAttribute('data-pdx-aipac-pid') !== pid) continue;
        var cur = h.firstChild && h.firstChild.getAttribute ? h.firstChild.getAttribute('data-pdx-aipac-state') : null;
        if (cur !== 'empty' || read(pid).state === 'empty') continue;
        h.innerHTML = chipHtml(pid);
      }
    } catch (e) {}
  }

  function chipMount(pid) {
    try {
      _seq++;
      var uid = ('aipac-' + String(pid || 'none') + '-' + _seq).replace(/[^A-Za-z0-9_-]/g, '');
      var inner = chipHtml(pid);
      if (W.setTimeout) W.setTimeout(function () { repaint(String(pid || '')); }, 0);
      return '<span class="pdx-mchip-host" data-pdx-aipac-host="' + esc(uid) + '"' +
        ' data-pdx-aipac-pid="' + esc(pid || '') + '">' + inner + '</span>';
    } catch (e) { return ''; }
  }

  // ── THE AIPAC TRACKER CHIP ────────────────────────────────────────────────
  function trackerRow(pid) {
    var id = String(pid || '');
    var own = Object.prototype.hasOwnProperty;
    if (own.call(AIPAC_TRACKER, id)) return AIPAC_TRACKER[id];
    // A retired key and its canonical roster id name the same person.
    var alias = W.PDX_PROFILE_ALIAS || {};
    if (own.call(alias, id) && own.call(AIPAC_TRACKER, alias[id])) return AIPAC_TRACKER[alias[id]];
    for (var k in alias) {
      if (own.call(alias, k) && alias[k] === id && own.call(AIPAC_TRACKER, k)) return AIPAC_TRACKER[k];
    }
    return null;
  }

  function dollars(n) {
    return '$' + String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  // { state: 'accepted'|'none'|'nodata', amount, url, page }
  //   page — true when the url is the person's own tracker page.
  function trackerRead(pid) {
    var row = trackerRow(pid);
    var slug = row && /^[a-z0-9-]+$/.test(String(row[0] || '')) ? row[0] : '';
    var amt = row && typeof row[1] === 'number' && isFinite(row[1]) ? row[1] : null;
    var state = amt == null ? 'nodata' : amt > 0 ? 'accepted' : 'none';
    return {
      state: state,
      amount: state === 'accepted' ? amt : null,
      url: slug ? TRACKER_HOME + '/tracker/people/' + slug : TRACKER_SEARCH,
      page: !!slug
    };
  }

  function trackerLine(r) {
    return r.state === 'accepted' ? 'Accepted ' + dollars(r.amount) + ' (AIPAC Tracker)'
      : r.state === 'none' ? 'Has not accepted funds (AIPAC Tracker)'
      : 'No data on AIPAC Tracker';
  }

  function trackerLabel(r) {
    var asOf = TRACKER_AS_OF ? ' as of ' + TRACKER_AS_OF : '';
    var what = r.state === 'accepted'
      ? 'AIPAC Tracker lists an Israel Lobby Total of ' + dollars(r.amount) + ' for this person' + asOf + '.'
      : r.state === 'none'
        ? 'AIPAC Tracker lists an Israel Lobby Total of $0 for this person' + asOf + '.'
        : r.page
          ? 'AIPAC Tracker has a page for this person but shows no Israel Lobby Total' + asOf + '.'
          : 'No AIPAC Tracker page is known for this person' + asOf + '.';
    var whose = r.state === 'nodata' && !r.page ? ' '
      : ' This information is AIPAC Tracker\u2019s, not PolitiDex\u2019s. ';
    return what + whose +
      (r.page ? 'Opens this person\u2019s page on AIPAC Tracker' : 'Opens AIPAC Tracker\u2019s search') +
      ', an outside site, in a new tab.';
  }

  // Text only: no glyph, no logo. The label is the link; the line beside it is
  // the tracker's finding, in its own words where it has a figure.
  function trackerHtml(pid) {
    try {
      var r = trackerRead(pid);
      return '<div class="pdx-atk" data-pdx-atk="' + esc(pid || '') + '" data-pdx-atk-state="' + r.state + '"' +
          ' data-pdx-atk-page="' + (r.page ? 'person' : 'search') + '">' +
        '<a class="pdx-atk-chip" href="' + esc(r.url) + '" target="_blank" rel="noopener noreferrer"' +
          ' aria-label="' + esc(trackerLabel(r)) + '">AIPAC Tracker</a>' +
        '<span class="pdx-atk-line">' + esc(trackerLine(r)) + '</span>' +
      '</div>';
    } catch (e) { return ''; }
  }

  if (typeof W.addEventListener === 'function') {
    W.addEventListener('pdx-record-noted', function (e) {
      var d = (e && e.detail) || {};
      if (d.pid) repaint(String(d.pid));
      if (d.canon && d.canon !== d.pid) repaint(String(d.canon));
    });
  }

  W.PDXAipac = {
    read: read,
    chipHtml: chipHtml,
    chipMount: chipMount,
    trackerRead: trackerRead,
    trackerHtml: trackerHtml,
    TRACKER: AIPAC_TRACKER,
    TRACKER_AS_OF: TRACKER_AS_OF,
    open: open,
    explain: explain,
    isAffiliated: isAffiliated,
    scorecardDefects: scorecardDefects,
    SCORECARD: SCORECARD,
    READINGS: READINGS,
    AIPAC_PAC: AIPAC_PAC,
    PACS: PACS,
    pacSource: pacSource,
    CUTOFFS: { backed: BACKED_SHARE, notAligned: NOT_ALIGNED_SHARE, minScored: MIN_SCORED },
    CONGRESS: CONGRESS,
    scored: false,
    NEVER_FEEDS: ['directionMatch', 'wordVsAction', 'formalPatternTier',
                  'publicationFloor', 'formalActCounts', 'ballotSort',
                  'yourMatch', 'anyCrossPersonRanking', 'alignment', 'door2Picks']
  };
})();
