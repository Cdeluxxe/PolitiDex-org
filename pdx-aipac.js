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

  // ── AIPAC PAC'S OWN REPORTED CONTRIBUTIONS ─────────────────────────────────
  // The money side for the whole federal roster, not only the thirteen people
  // the money lane carries a filing for. Generated from FEC's bulk file of
  // committee-to-candidate contributions by scripts/gen-aipac-pac.mjs: AIPAC
  // PAC (FEC C00797670), type 24K, its OWN contributions and refunds only —
  // earmarked individual donations it passed along are excluded — netted per
  // person over the current cycles. A person appears here only when that net
  // is above zero. These are contributions from AIPAC's political action
  // committee, reported to the FEC; they are not lobbying by AIPAC itself, and
  // the chip says so. No figure below is ever printed.
  var AIPAC_PAC_COMMITTEE = 'C00797670';
  var AIPAC_PAC_SOURCE = 'Reported AIPAC PAC contributions (FEC)';
  // BEGIN AIPAC_PAC (generated by scripts/gen-aipac-pac.mjs — do not edit by hand)
  // Per roster person: the FEC candidate id the contributions were filed
  // against, and AIPAC PAC's net direct contributions per cycle, as reported.
  // Held for provenance and for the on-file test only; the chip prints none of it.
  // 351 people with a net above zero across 2024 + 2026.
  var AIPAC_PAC = {
    aaron_bean: { fec: 'H2FL04211', cycles: { '2024': 10000, '2026': 10000 } },
    abraham_hamadeh: { fec: 'H4AZ08108', cycles: { '2026': 5000 } },
    adam_gray: { fec: 'H2CA13115', cycles: { '2026': 5000 } },
    adam_smith: { fec: 'H6WA09025', cycles: { '2024': 10000, '2026': 5000 } },
    addison_mcdowell: { fec: 'H4NC06177', cycles: { '2024': 10000, '2026': 10000 } },
    adrian_smith: { fec: 'H6NE03115', cycles: { '2024': 10000, '2026': 5000 } },
    adriano_espaillat: { fec: 'H2NY13096', cycles: { '2024': 10000, '2026': 5000 } },
    aguilar: { fec: 'H2CA31125', cycles: { '2024': 5000, '2026': 5000 } },
    andrea_salinas: { fec: 'H2OR06066', cycles: { '2024': 5000 } },
    andrew_ogles: { fec: 'H2TN05446', cycles: { '2024': 10000, '2026': 5000 } },
    andy_barr: { fec: 'H0KY06104', cycles: { '2024': 5000 } },
    andy_harris: { fec: 'H8MD01094', cycles: { '2024': 10000, '2026': 5000 } },
    angie_craig: { fec: 'H6MN02131', cycles: { '2024': 5000, '2026': 5000 } },
    angus_king: { fec: 'S2ME00109', cycles: { '2024': 5000 } },
    ann_wagner: { fec: 'H2MO02102', cycles: { '2024': 10000, '2026': 5000 } },
    april_mcclain_delaney: { fec: 'H4MD06340', cycles: { '2024': 10000 } },
    arrington: { fec: 'H6TX19099', cycles: { '2024': 10000 } },
    ashley_hinson: { fec: 'H0IA01174', cycles: { '2024': 10000, '2026': 0 } },
    ashley_moody: { fec: 'S6FL00640', cycles: { '2026': 5000 } },
    austin_scott: { fec: 'H0GA08099', cycles: { '2024': 10000, '2026': 4000 } },
    barrasso: { fec: 'S6WY00068', cycles: { '2024': 5000 } },
    barry_loudermilk: { fec: 'H4GA11061', cycles: { '2024': 10000 } },
    barry_moore: { fec: 'H8AL02171', cycles: { '2024': 5000 } },
    ben_cline: { fec: 'H8VA06104', cycles: { '2024': 10000, '2026': 5000 } },
    beth_van_duyne: { fec: 'H0TX24209', cycles: { '2024': 10000, '2026': 5000 } },
    bill_huizenga: { fec: 'H0MI02094', cycles: { '2024': 5000, '2026': 5000 } },
    blackburn: { fec: 'S8TN00337', cycles: { '2024': 10000 } },
    bmoore: { fec: 'H0UT01205', cycles: { '2024': 5000, '2026': 5000 } },
    booker: { fec: 'S4NJ00185', cycles: { '2026': 5000 } },
    brad_finstad: { fec: 'H2MN01223', cycles: { '2024': 10000, '2026': 10000 } },
    brad_knott: { fec: 'H4NC13116', cycles: { '2024': 10000, '2026': 5000 } },
    brad_schneider: { fec: 'H2IL10068', cycles: { '2024': 10000, '2026': 5000 } },
    brad_sherman: { fec: 'H6CA24113', cycles: { '2024': 10000, '2026': 5000 } },
    brandon_gill: { fec: 'H4TX26149', cycles: { '2024': 10000, '2026': 5000 } },
    brendan_boyle: { fec: 'H4PA13199', cycles: { '2024': 10000, '2026': 10000 } },
    brian_babin: { fec: 'H6TX02079', cycles: { '2024': 10000, '2026': 5000 } },
    brian_jack: { fec: 'H4GA03126', cycles: { '2024': 15000, '2026': 15000 } },
    brian_mast: { fec: 'H6FL18097', cycles: { '2024': 10000, '2026': 5000 } },
    brittany_pettersen: { fec: 'H8CO07045', cycles: { '2024': 10000, '2026': 5000 } },
    bruce_westerman: { fec: 'H4AR04048', cycles: { '2024': 10000, '2026': 10000 } },
    bryan_steil: { fec: 'H8WI01156', cycles: { '2024': 10000, '2026': 5000 } },
    buddy_carter: { fec: 'H4GA01039', cycles: { '2024': 10000 } },
    c_franklin: { fec: 'H0FL15104', cycles: { '2024': 5000, '2026': 5000 } },
    capito: { fec: 'S4WV00159', cycles: { '2026': 5000 } },
    carlos_gimenez: { fec: 'H0FL26036', cycles: { '2024': 10000, '2026': 5000 } },
    carol_miller: { fec: 'H8WV03097', cycles: { '2024': 10000, '2026': 5000 } },
    cassidy: { fec: 'S4LA00107', cycles: { '2026': 5000 } },
    charles_chuck_edwards: { fec: 'H2NC14050', cycles: { '2024': 10000, '2026': 10000 } },
    chris_deluzio: { fec: 'H2PA17103', cycles: { '2024': 1000 } },
    chris_pappas: { fec: 'H8NH01210', cycles: { '2024': 10000, '2026': 10000 } },
    chris_smith: { fec: 'H8NJ04014', cycles: { '2024': 10000, '2026': 10000 } },
    chrissy_houlahan: { fec: 'H8PA06087', cycles: { '2024': 10000, '2026': -5000 } },
    chuck_fleischmann: { fec: 'H0TN03254', cycles: { '2024': 10000, '2026': 5000 } },
    claudia_tenney: { fec: 'H4NY22051', cycles: { '2024': 10000, '2026': 5000 } },
    clay_higgins: { fec: 'H6LA03148', cycles: { '2024': 5000 } },
    cliff_bentz: { fec: 'H0OR02127', cycles: { '2024': 10000, '2026': -5000 } },
    clyburn: { fec: 'H2SC02042', cycles: { '2024': 5000 } },
    collins: { fec: 'S6ME00159', cycles: { '2026': 10000 } },
    comer: { fec: 'H6KY01110', cycles: { '2024': 10000, '2026': 0 } },
    coons: { fec: 'S0DE00092', cycles: { '2026': 10000 } },
    cotton: { fec: 'S4AR00103', cycles: { '2026': 10000 } },
    craig_goldman: { fec: 'H4TX12065', cycles: { '2024': 5000, '2026': 5000 } },
    cruz: { fec: 'S2TX00312', cycles: { '2024': 10000 } },
    curtis: { fec: 'H8UT03238', cycles: { '2024': 10000 } },
    daines: { fec: 'S2MT00096', cycles: { '2026': 10000 } },
    dale_strong: { fec: 'H2AL05102', cycles: { '2024': 5000, '2026': 5000 } },
    dan_crenshaw: { fec: 'H8TX02166', cycles: { '2024': 10000, '2026': 10000 } },
    dan_goldman: { fec: 'H2NY10308', cycles: { '2024': 10000, '2026': 0 } },
    dan_newhouse: { fec: 'H4WA04104', cycles: { '2024': 6500 } },
    dan_sullivan: { fec: 'S4AK00214', cycles: { '2026': 5000 } },
    daniel_meuser: { fec: 'H8PA10147', cycles: { '2024': 5000, '2026': 10000 } },
    daniel_webster: { fec: 'H0FL08208', cycles: { '2024': 10000, '2026': 5000 } },
    darin_lahood: { fec: 'H6IL18088', cycles: { '2024': 10000, '2026': 5000 } },
    darrell_issa: { fec: 'H0CA48024', cycles: { '2024': 10000, '2026': 5000 } },
    darren_soto: { fec: 'H6FL09179', cycles: { '2024': 10000, '2026': 15000 } },
    david_joyce: { fec: 'H2OH14064', cycles: { '2024': 5000, '2026': 5000 } },
    david_kustoff: { fec: 'H2TN07103', cycles: { '2024': 10000, '2026': 5000 } },
    david_rouzer: { fec: 'H2NC07096', cycles: { '2024': 5000, '2026': 5000 } },
    david_schweikert: { fec: 'H4AZ06045', cycles: { '2024': 10000 } },
    david_taylor: { fec: 'H4OH02248', cycles: { '2024': 10000, '2026': 5000 } },
    david_valadao: { fec: 'H2CA20094', cycles: { '2024': 5000, '2026': 10000 } },
    deb_fischer: { fec: 'S2NE00094', cycles: { '2024': 10000 } },
    debbie_wasserman_schultz: { fec: 'H4FL20023', cycles: { '2024': 10000, '2026': 10000 } },
    deborah_ross: { fec: 'H0NC02125', cycles: { '2024': 5000 } },
    delauro: { fec: 'H0CT03072', cycles: { '2024': 5000 } },
    delbene: { fec: 'H0WA08046', cycles: { '2024': 10000, '2026': 0 } },
    derek_schmidt: { fec: 'H4KS02164', cycles: { '2024': 10000, '2026': 10000 } },
    derrick_van_orden: { fec: 'H0WI03175', cycles: { '2024': 10000, '2026': 6000 } },
    diana_harshbarger: { fec: 'H0TN01118', cycles: { '2024': 10000, '2026': 5000 } },
    dina_titus: { fec: 'H8NV03036', cycles: { '2024': 10000, '2026': 5000 } },
    don_bacon: { fec: 'H6NE02125', cycles: { '2024': 10000 } },
    don_davis: { fec: 'H2NC02287', cycles: { '2024': 10000, '2026': 10000 } },
    donald_norcross: { fec: 'H4NJ01084', cycles: { '2024': 5000, '2026': 5000 } },
    donalds: { fec: 'H2FL14186', cycles: { '2024': 10000 } },
    doris_matsui: { fec: 'H6CA05195', cycles: { '2024': 10000 } },
    dusty_johnson: { fec: 'H8SD01055', cycles: { '2024': 10000 } },
    ed_case: { fec: 'H2HI02128', cycles: { '2024': 10000 } },
    emanuel_cleaver: { fec: 'H4MO05234', cycles: { '2024': 10000 } },
    emilia_sykes: { fec: 'H2OH13264', cycles: { '2024': 15000, '2026': 10000 } },
    emmer: { fec: 'H4MN06087', cycles: { '2024': 10000, '2026': 10000 } },
    eric_burlison: { fec: 'H2MO07143', cycles: { '2024': 5000, '2026': 5000 } },
    eric_sorensen: { fec: 'H2IL17147', cycles: { '2024': 5000, '2026': 5000 } },
    erin_houchin: { fec: 'H6IN09143', cycles: { '2026': 5000 } },
    fitzpatrick: { fec: 'H6PA08277', cycles: { '2024': 10000, '2026': 5000 } },
    foxx: { fec: 'H4NC05146', cycles: { '2024': 10000, '2026': 5000 } },
    frank_lucas: { fec: 'H4OK06056', cycles: { '2024': 10000, '2026': 5000 } },
    frank_mrvan: { fec: 'H0IN01150', cycles: { '2024': 10000, '2026': 10000 } },
    frederica_wilson: { fec: 'H0FL17068', cycles: { '2024': 5000 } },
    french_hill: { fec: 'H4AR02141', cycles: { '2024': 10000, '2026': 5000 } },
    gabe_amo: { fec: 'H4RI01265', cycles: { '2024': 15000, '2026': 1000 } },
    gabe_evans: { fec: 'H4CO08034', cycles: { '2026': 5000 } },
    garbarino: { fec: 'H0NY02234', cycles: { '2024': 10000, '2026': 10000 } },
    gary_palmer: { fec: 'H4AL06098', cycles: { '2024': 5000, '2026': 5000 } },
    george_latimer: { fec: 'H4NY16087', cycles: { '2024': 10000, '2026': 5000 } },
    gilbert_cisneros: { fec: 'H4CA31170', cycles: { '2026': 5000 } },
    gillibrand: { fec: 'S0NY00410', cycles: { '2024': 10000 } },
    glenn_grothman: { fec: 'H4WI06048', cycles: { '2024': 10000, '2026': 5000 } },
    glenn_ivey: { fec: 'H2MD04315', cycles: { '2026': 5000 } },
    glenn_thompson: { fec: 'H8PA05071', cycles: { '2024': 5000, '2026': 5000 } },
    grace_meng: { fec: 'H2NY06116', cycles: { '2024': 10000, '2026': 5000 } },
    graham: { fec: 'S0SC00149', cycles: { '2026': 5000 } },
    greg_landsman: { fec: 'H2OH01194', cycles: { '2024': 10000, '2026': 10000 } },
    greg_stanton: { fec: 'H8AZ09040', cycles: { '2024': 10000 } },
    gregory_murphy: { fec: 'H0NC03172', cycles: { '2024': 5000, '2026': 10000 } },
    gus_bilirakis: { fec: 'H6FL09070', cycles: { '2024': 10000, '2026': 10000 } },
    guthrie: { fec: 'H8KY02031', cycles: { '2024': 10000, '2026': 0 } },
    guy_reschenthaler: { fec: 'H8PA18199', cycles: { '2024': 10000, '2026': 10000 } },
    h_griffith: { fec: 'H0VA09055', cycles: { '2024': 10000, '2026': 5000 } },
    hagerty: { fec: 'S0TN00169', cycles: { '2026': 5000 } },
    hal_rogers: { fec: 'H0KY05015', cycles: { '2024': 10000, '2026': 5000 } },
    haley_stevens: { fec: 'H8MI11254', cycles: { '2024': 10000, '2026': 5000 } },
    harriet_hageman: { fec: 'H2WY00166', cycles: { '2024': 10000 } },
    hawley: { fec: 'S8MO00160', cycles: { '2024': 10000 } },
    henry_cuellar: { fec: 'H2TX23082', cycles: { '2024': 5000, '2026': 10000 } },
    herbert_conaway: { fec: 'H4NJ03080', cycles: { '2024': 5000 } },
    hillary_scholten: { fec: 'H0MI03316', cycles: { '2024': 5000, '2026': 6500 } },
    hudson: { fec: 'H2NC08185', cycles: { '2024': 10000, '2026': 5000 } },
    hyde_smith: { fec: 'S8MS00261', cycles: { '2026': 10000 } },
    j_correa: { fec: 'H6CA46116', cycles: { '2024': 0, '2026': 5000 } },
    jack_bergman: { fec: 'H6MI01226', cycles: { '2024': 10000, '2026': 5000 } },
    jake_auchincloss: { fec: 'H0MA04192', cycles: { '2024': 10000, '2026': 10000 } },
    jake_ellzey: { fec: 'H8TX06266', cycles: { '2024': 10000, '2026': 10000 } },
    james_baird: { fec: 'H8IN04199', cycles: { '2024': 5000, '2026': 5000 } },
    jared_golden: { fec: 'H8ME02185', cycles: { '2024': 5000, '2026': 5000 } },
    jared_moskowitz: { fec: 'H2FL22171', cycles: { '2024': 10000, '2026': 10000 } },
    jason_crow: { fec: 'H8CO06229', cycles: { '2024': 500 } },
    jason_smith: { fec: 'H4MO08162', cycles: { '2024': 10000, '2026': 5000 } },
    jay_obernolte: { fec: 'H0CA08135', cycles: { '2024': 5000, '2026': 5000 } },
    jeff_hurd: { fec: 'H4CO03357', cycles: { '2026': 5000 } },
    jefferson_shreve: { fec: 'H4IN06185', cycles: { '2024': 5000, '2026': 5000 } },
    jefferson_van_drew: { fec: 'H8NJ02166', cycles: { '2024': 10000, '2026': 10000 } },
    jeffries: { fec: 'H2NY10092', cycles: { '2024': 7500 } },
    jennifer_kiggans: { fec: 'H2VA02064', cycles: { '2024': 5000, '2026': 6000 } },
    jennifer_mcclellan: { fec: 'H4VA04066', cycles: { '2024': 10000 } },
    jim_costa: { fec: 'H4CA20082', cycles: { '2024': 15000, '2026': 10000 } },
    jim_himes: { fec: 'H8CT04172', cycles: { '2024': 500 } },
    jim_jordan: { fec: 'H6OH04082', cycles: { '2024': 5000, '2026': 15000 } },
    jimmy_gomez: { fec: 'H8CA34266', cycles: { '2024': 10000, '2026': 5000 } },
    jimmy_panetta: { fec: 'H6CA20152', cycles: { '2024': 10000, '2026': 5000 } },
    jimmy_patronis: { fec: 'H6FL01390', cycles: { '2026': 15000 } },
    joe_courtney: { fec: 'H2CT02112', cycles: { '2024': 6000 } },
    joe_wilson: { fec: 'H2SC02059', cycles: { '2024': 5000, '2026': 10000 } },
    john_carter: { fec: 'H2TX31044', cycles: { '2024': 5000, '2026': 5000 } },
    john_cornyn: { fec: 'S2TX00106', cycles: { '2026': 5000 } },
    john_james: { fec: 'H2MI10150', cycles: { '2024': 10000 } },
    john_larson: { fec: 'H8CT01046', cycles: { '2024': 5000, '2026': 10000 } },
    john_moolenaar: { fec: 'H4MI04126', cycles: { '2024': 10000, '2026': 6000 } },
    john_rose: { fec: 'H8TN06094', cycles: { '2024': 10000 } },
    john_rutherford: { fec: 'H6FL04105', cycles: { '2024': 10000, '2026': 6000 } },
    johnny_olszewski: { fec: 'H4MD02232', cycles: { '2024': 10000, '2026': 5000 } },
    jon_husted: { fec: 'S6OH00304', cycles: { '2026': 5000 } },
    joseph_morelle: { fec: 'H8NY25105', cycles: { '2024': 10000, '2026': 5000 } },
    josh_brecheen: { fec: 'H2OK02315', cycles: { '2024': 10000, '2026': 0 } },
    josh_gottheimer: { fec: 'H6NJ05171', cycles: { '2024': 10000, '2026': 5000 } },
    josh_harder: { fec: 'H8CA10126', cycles: { '2024': 5000, '2026': 5000 } },
    joyce_beatty: { fec: 'H2OH03125', cycles: { '2024': 5000, '2026': 5000 } },
    juan_ciscomani: { fec: 'H2AZ02360', cycles: { '2024': 10000, '2026': 5000 } },
    juan_vargas: { fec: 'H2CA50026', cycles: { '2024': 10000, '2026': 10000 } },
    julia_brownley: { fec: 'H2CA00120', cycles: { '2024': 10000 } },
    julia_letlow: { fec: 'H2LA05126', cycles: { '2024': 10000 } },
    julie_fedorchak: { fec: 'H4ND00061', cycles: { '2024': 5000, '2026': 10000 } },
    julie_johnson: { fec: 'H4TX32089', cycles: { '2024': 5000 } },
    kat_cammack: { fec: 'H0FL03175', cycles: { '2024': 10000, '2026': 0 } },
    kathy_castor: { fec: 'H6FL11126', cycles: { '2024': 10000, '2026': 5000 } },
    kclark: { fec: 'H4MA05084', cycles: { '2024': 5000, '2026': 10000 } },
    keith_self: { fec: 'H2TX03290', cycles: { '2026': 5000 } },
    ken_calvert: { fec: 'H2CA37023', cycles: { '2024': 10000, '2026': 5000 } },
    kennedy: { fec: 'H4UT03260', cycles: { '2024': 10000 } },
    kevin_cramer: { fec: 'S8ND00120', cycles: { '2024': 10000 } },
    kevin_hern: { fec: 'H8OK01157', cycles: { '2024': 10000, '2026': 10000 } },
    kevin_kiley: { fec: 'H2CA03157', cycles: { '2024': 5000, '2026': 5000 } },
    kevin_mullin: { fec: 'H2CA14162', cycles: { '2024': 5000 } },
    kim_schrier: { fec: 'H8WA08189', cycles: { '2024': 10000, '2026': 5000 } },
    klobuchar: { fec: 'S6MN00267', cycles: { '2024': 15000 } },
    kweisi_mfume: { fec: 'H6MD07020', cycles: { '2024': 10000, '2026': 10000 } },
    lance_gooden: { fec: 'H8TX05144', cycles: { '2024': 10000, '2026': 5000 } },
    laura_friedman: { fec: 'H4CA30149', cycles: { '2024': 5000, '2026': 5000 } },
    laura_gillen: { fec: 'H4NY04158', cycles: { '2026': 5000 } },
    laurel_lee: { fec: 'H2FL15241', cycles: { '2024': 10000, '2026': 5000 } },
    linda_sanchez: { fec: 'H2CA39078', cycles: { '2024': 9000 } },
    lizzie_fletcher: { fec: 'H8TX07140', cycles: { '2024': 10000, '2026': 5000 } },
    lloyd_smucker: { fec: 'H6PA16320', cycles: { '2024': 10000, '2026': 10000 } },
    lois_frankel: { fec: 'H2FL14053', cycles: { '2024': 10000, '2026': 5250 } },
    lucy_mcbath: { fec: 'H8GA06393', cycles: { '2024': 10000, '2026': 5000 } },
    luna: { fec: 'H0FL13158', cycles: { '2024': 10000 } },
    luz_rivas: { fec: 'H4CA29141', cycles: { '2024': 5000, '2026': 10000 } },
    maggie_goodlander: { fec: 'H4NH02399', cycles: { '2024': 10000, '2026': 5000 } },
    maloy: { fec: 'H4UT02296', cycles: { '2024': 15000, '2026': 5000 } },
    marc_veasey: { fec: 'H2TX33073', cycles: { '2024': 10000, '2026': 0 } },
    maria_salazar: { fec: 'H8FL27185', cycles: { '2024': 10000, '2026': 5000 } },
    mariannette_miller_meeks: { fec: 'H8IA02043', cycles: { '2024': 10000, '2026': 6000 } },
    marie_gluesenkamp_perez: { fec: 'H2WA03217', cycles: { '2024': 10000, '2026': 10000 } },
    marilyn_strickland: { fec: 'H0WA10034', cycles: { '2024': 10000, '2026': 10000 } },
    mario_diaz_balart: { fec: 'H2FL25018', cycles: { '2024': 10000, '2026': 5000 } },
    mark_alford: { fec: 'H2MO04207', cycles: { '2024': 5000, '2026': 10000 } },
    mark_amodei: { fec: 'H2NV02395', cycles: { '2024': 10000 } },
    mark_harris: { fec: 'H6NC09200', cycles: { '2024': 10000, '2026': 5000 } },
    mark_messmer: { fec: 'H4IN08249', cycles: { '2024': 5000, '2026': 5000 } },
    max_miller: { fec: 'H2OH16051', cycles: { '2024': 5000, '2026': 5000 } },
    mcclain: { fec: 'H0MI10287', cycles: { '2024': 10000, '2026': 5000 } },
    meeks: { fec: 'H8NY06048', cycles: { '2024': 10000, '2026': 10000 } },
    michael_baumgartner: { fec: 'H4WA05234', cycles: { '2024': 10000, '2026': 10000 } },
    michael_cloud: { fec: 'H8TX27049', cycles: { '2024': 10000 } },
    michael_guest: { fec: 'H8MS03125', cycles: { '2024': 10000, '2026': 5000 } },
    michael_mccaul: { fec: 'H4TX10093', cycles: { '2024': 15000 } },
    michael_rulli: { fec: 'H4OH06165', cycles: { '2024': 15000, '2026': 5000 } },
    michael_turner: { fec: 'H2OH03067', cycles: { '2024': 5000, '2026': 5000 } },
    michelle_fischbach: { fec: 'H0MN07091', cycles: { '2024': 10000, '2026': 5000 } },
    mike_bost: { fec: 'H4IL12060', cycles: { '2024': 5000, '2026': 10000 } },
    mike_carey: { fec: 'H2OH15228', cycles: { '2024': 10000, '2026': 10000 } },
    mike_collins: { fec: 'H4GA10071', cycles: { '2026': 5000 } },
    mike_ezell: { fec: 'H2MS04258', cycles: { '2024': 5000, '2026': 5000 } },
    mike_flood: { fec: 'H2NE01118', cycles: { '2024': 10000, '2026': 10000 } },
    mike_haridopolos: { fec: 'H4FL08168', cycles: { '2024': 10000, '2026': 5000 } },
    mike_johnson: { fec: 'H6LA04138', cycles: { '2024': 10000, '2026': 5000 } },
    mike_kelly: { fec: 'H0PA03271', cycles: { '2024': 5000, '2026': 5000 } },
    mike_lawler: { fec: 'H2NY17162', cycles: { '2024': 10000, '2026': 10000 } },
    mike_levin: { fec: 'H8CA49058', cycles: { '2024': 10000, '2026': 5000 } },
    mike_rogers_al: { fec: 'H2AL03032', cycles: { '2026': 5000 } },
    mike_rounds: { fec: 'S4SD00049', cycles: { '2026': 5000 } },
    mike_simpson: { fec: 'H8ID02064', cycles: { '2024': 10000, '2026': 5000 } },
    mike_waltz: { fec: 'H8FL06148', cycles: { '2024': 10000 } },
    monica_de_la_cruz: { fec: 'H0TX15124', cycles: { '2024': 10000, '2026': 10000 } },
    morgan_luttrell: { fec: 'H2TX08182', cycles: { '2024': 10000 } },
    morgan_mcgarvey: { fec: 'H2KY03206', cycles: { '2024': 5000 } },
    mullin: { fec: 'S2OK00186', cycles: { '2026': 5000 } },
    nancy_mace: { fec: 'H0SC01394', cycles: { '2024': 10000 } },
    nancy_pelosi: { fec: 'H8CA05035', cycles: { '2024': 5000 } },
    nanette_barragan: { fec: 'H6CA44103', cycles: { '2024': 5000 } },
    nathaniel_moran: { fec: 'H2TX01112', cycles: { '2024': 10000, '2026': 5000 } },
    neal: { fec: 'H8MA02041', cycles: { '2024': 10000 } },
    neal_dunn: { fec: 'H6FL02208', cycles: { '2024': 10000, '2026': 5000 } },
    neguse: { fec: 'H8CO02160', cycles: { '2024': 10000, '2026': 10000 } },
    nellie_pou: { fec: 'H4NJ09194', cycles: { '2024': 5000 } },
    nicholas_langworthy: { fec: 'H2NY23228', cycles: { '2024': 10000, '2026': 5000 } },
    nicolas_lalota: { fec: 'H2NY01190', cycles: { '2024': 10000, '2026': 10000 } },
    nicole_malliotakis: { fec: 'H0NY11078', cycles: { '2024': 5000, '2026': 10000 } },
    nicole_nikki_budzinski: { fec: 'H2IL13153', cycles: { '2024': 5000 } },
    nikema_williams: { fec: 'H0GA05301', cycles: { '2024': 10000, '2026': 5000 } },
    norma_torres: { fec: 'H4CA35031', cycles: { '2024': 10000, '2026': 5000 } },
    owens: { fec: 'H0UT04076', cycles: { '2024': 5000 } },
    pallone: { fec: 'H8NJ03073', cycles: { '2024': 10000, '2026': 5000 } },
    pat_fallon: { fec: 'H0TX04219', cycles: { '2024': 10000, '2026': 5000 } },
    pat_harrigan: { fec: 'H2NC13243', cycles: { '2024': 10000, '2026': 5000 } },
    pete_sessions: { fec: 'H2TX03126', cycles: { '2024': 10000, '2026': 5000 } },
    pete_stauber: { fec: 'H8MN08043', cycles: { '2024': 5000, '2026': 5000 } },
    pfluger: { fec: 'H0TX11230', cycles: { '2024': 10000, '2026': 10000 } },
    raja_krishnamoorthi: { fec: 'H6IL08147', cycles: { '2024': 5000 } },
    randy_feenstra: { fec: 'H0IA04145', cycles: { '2024': 10000 } },
    randy_weber: { fec: 'H2TX14149', cycles: { '2024': 10000, '2026': 10000 } },
    raul_ruiz: { fec: 'H2CA36439', cycles: { '2024': 10000, '2026': 5000 } },
    reed: { fec: 'S6RI00163', cycles: { '2026': 5000 } },
    rfine: { fec: 'H6FL06258', cycles: { '2026': 10000 } },
    rich_mccormick: { fec: 'H0GA07273', cycles: { '2024': 5000, '2026': 5000 } },
    rick_allen: { fec: 'H2GA12121', cycles: { '2024': 10000, '2026': 5000 } },
    rick_crawford: { fec: 'H0AR01083', cycles: { '2024': 10000, '2026': 5000 } },
    rick_larsen: { fec: 'H0WA02080', cycles: { '2024': 10000, '2026': 5000 } },
    rick_scott: { fec: 'S8FL00273', cycles: { '2024': 15000 } },
    riley_moore: { fec: 'H4WV02205', cycles: { '2024': 10000 } },
    risch: { fec: 'S8ID00092', cycles: { '2026': 5000 } },
    rob_bresnahan: { fec: 'H4PA08124', cycles: { '2026': 10000 } },
    robert_aderholt: { fec: 'H6AL04098', cycles: { '2024': 5000, '2026': 5000 } },
    robert_latta: { fec: 'H8OH05036', cycles: { '2024': 5000, '2026': 5000 } },
    robert_menendez: { fec: 'H2NJ08232', cycles: { '2024': 5000, '2026': 5000 } },
    robert_onder: { fec: 'H4MO03221', cycles: { '2024': 5000, '2026': 5000 } },
    robert_wittman: { fec: 'H8VA01147', cycles: { '2024': 10000, '2026': 6000 } },
    roger_marshall: { fec: 'S0KS00315', cycles: { '2026': 5000 } },
    roger_williams: { fec: 'H2TX33040', cycles: { '2024': 10000, '2026': 5000 } },
    ron_estes: { fec: 'H8KS04112', cycles: { '2024': 10000, '2026': 5000 } },
    ronny_jackson: { fec: 'H0TX13228', cycles: { '2024': 20000, '2026': 5000 } },
    rosen: { fec: 'S8NV00156', cycles: { '2024': 5000 } },
    rudy_yakym: { fec: 'H2IN02295', cycles: { '2024': 10000, '2026': 10000 } },
    russ_fulcher: { fec: 'H8ID01124', cycles: { '2024': 10000, '2026': 5000 } },
    russell_fry: { fec: 'H2SC07280', cycles: { '2024': 10000, '2026': 5000 } },
    ryan_mackenzie: { fec: 'H8PA15195', cycles: { '2026': 10000 } },
    sam_graves: { fec: 'H0MO06073', cycles: { '2024': 10000, '2026': 5000 } },
    sanford_bishop: { fec: 'H2GA02031', cycles: { '2024': 10000 } },
    sarah_elfreth: { fec: 'H4MD03156', cycles: { '2024': 5000, '2026': 0 } },
    sarah_mcbride: { fec: 'H4DE00045', cycles: { '2024': 10000 } },
    scalise: { fec: 'H0LA01087', cycles: { '2024': 10000, '2026': 5000 } },
    schiff: { fec: 'H0CA27085', cycles: { '2024': 5000 } },
    scott_desjarlais: { fec: 'H0TN04195', cycles: { '2026': 5000 } },
    scott_fitzgerald: { fec: 'H0WI05113', cycles: { '2024': 10000, '2026': 5000 } },
    scott_perry: { fec: 'H2PA04135', cycles: { '2024': 5000, '2026': 5000 } },
    seth_magaziner: { fec: 'H2RI02184', cycles: { '2024': 10000 } },
    seth_moulton: { fec: 'H4MA06090', cycles: { '2024': 10000, '2026': 0 } },
    sharice_davids: { fec: 'H8KS03155', cycles: { '2024': 10000 } },
    sheri_biggs: { fec: 'H4SC01313', cycles: { '2024': 10000, '2026': 5000 } },
    shomari_figures: { fec: 'H4AL02170', cycles: { '2024': 5000 } },
    shontel_brown: { fec: 'H2OH11169', cycles: { '2024': 10000, '2026': 5000 } },
    shri_thanedar: { fec: 'H2MI13204', cycles: { '2024': 10000, '2026': 5000 } },
    stefanik: { fec: 'H4NY21079', cycles: { '2024': 5000, '2026': 5000 } },
    steny_hoyer: { fec: 'H2MD05155', cycles: { '2024': 10000 } },
    stephanie_bice: { fec: 'H0OK05205', cycles: { '2024': 10000, '2026': 5000 } },
    steve_womack: { fec: 'H0AR03055', cycles: { '2024': 15000, '2026': 5000 } },
    steven_horsford: { fec: 'H2NV04011', cycles: { '2024': 10000, '2026': 5000 } },
    susie_lee: { fec: 'H6NV04020', cycles: { '2026': 10000 } },
    suzanne_bonamici: { fec: 'H2OR01133', cycles: { '2024': 1000 } },
    sylvia_garcia: { fec: 'H8TX29052', cycles: { '2024': 10000, '2026': -5000 } },
    ted_lieu: { fec: 'H4CA33119', cycles: { '2024': 10000, '2026': 10000 } },
    terri_sewell: { fec: 'H0AL07086', cycles: { '2024': 10000 } },
    thomas_kean: { fec: 'H0NJ07261', cycles: { '2024': 10000, '2026': 10000 } },
    tim_burchett: { fec: 'H8TN02119', cycles: { '2024': 5000, '2026': 5000 } },
    tim_moore: { fec: 'H4NC14015', cycles: { '2024': 5000, '2026': 5000 } },
    timothy_kennedy: { fec: 'H4NY26078', cycles: { '2024': 10000, '2026': 5000 } },
    tom_cole: { fec: 'H2OK04055', cycles: { '2024': 5000, '2026': 5000 } },
    tom_mcclintock: { fec: 'H8CA04152', cycles: { '2024': 10000, '2026': 5000 } },
    tom_suozzi: { fec: 'H6NY03247', cycles: { '2024': 10000, '2026': 10000 } },
    tony_wied: { fec: 'H4WI08119', cycles: { '2024': 10000 } },
    torres: { fec: 'H0NY15160', cycles: { '2024': 10500, '2026': 10000 } },
    tracey_mann: { fec: 'H0KS01123', cycles: { '2024': 10000, '2026': 10000 } },
    trent_kelly: { fec: 'H6MS01131', cycles: { '2024': 5000, '2026': 5000 } },
    troy_balderson: { fec: 'H8OH12180', cycles: { '2024': 5000, '2026': 5000 } },
    troy_carter: { fec: 'H2LA02149', cycles: { '2024': 5000 } },
    troy_downing: { fec: 'H4MT02098', cycles: { '2024': 10000, '2026': 5000 } },
    troy_nehls: { fec: 'H0TX22302', cycles: { '2024': 5000 } },
    vern_buchanan: { fec: 'H6FL13148', cycles: { '2024': 10000 } },
    vicente_gonzalez: { fec: 'H6TX15162', cycles: { '2024': 10000, '2026': 10000 } },
    victoria_spartz: { fec: 'H0IN05326', cycles: { '2024': 10000, '2026': 0 } },
    vince_fong: { fec: 'H4CA20181', cycles: { '2024': 10000, '2026': 10000 } },
    w_steube: { fec: 'H8FL17053', cycles: { '2024': 10000, '2026': 5000 } },
    walberg: { fec: 'H4MI07103', cycles: { '2024': 10000, '2026': 5000 } },
    warner: { fec: 'S6VA00093', cycles: { '2026': 5000 } },
    wesley_hunt: { fec: 'H0TX07170', cycles: { '2024': 5000 } },
    whitehouse: { fec: 'S6RI00221', cycles: { '2024': 15000 } },
    wicker: { fec: 'S8MS00196', cycles: { '2024': 5000 } },
    william_keating: { fec: 'H0MA10082', cycles: { '2024': 10000 } },
    william_timmons: { fec: 'H8SC04250', cycles: { '2024': 10000, '2026': 5000 } },
    young_kim: { fec: 'H8CA39240', cycles: { '2024': 10000, '2026': 5000 } },
    yvette_clarke: { fec: 'H4NY11138', cycles: { '2026': 5000 } },
    zach_nunn: { fec: 'H2IA03119', cycles: { '2024': 10000, '2026': 5000 } }
  };
  // END AIPAC_PAC

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
    var net = 0;
    for (var c in row.cycles) if (CURRENT_CYCLES.indexOf(c) >= 0) net += row.cycles[c];
    return net > 0 ? { state: 'backed', source: AIPAC_PAC_SOURCE } : null;
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
      ? (money ? 'AIPAC or AIPAC-affiliated PAC money in the current cycle' : '') +
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
    if (r.sources.indexOf(AIPAC_PAC_SOURCE) >= 0) {
      by += ' The money is direct contributions AIPAC\u2019s political action committee reported ' +
        'to the FEC in the current cycle, not lobbying by AIPAC itself, and not individual ' +
        'donations it passed along.';
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
        ' onclick="event.stopPropagation();if(window.PDXAipac)window.PDXAipac.open(\'' + targetFor(r) + '\');"' +
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
    open: open,
    isAffiliated: isAffiliated,
    scorecardDefects: scorecardDefects,
    SCORECARD: SCORECARD,
    READINGS: READINGS,
    AIPAC_PAC: AIPAC_PAC,
    AIPAC_PAC_SOURCE: AIPAC_PAC_SOURCE,
    CUTOFFS: { backed: BACKED_SHARE, notAligned: NOT_ALIGNED_SHARE, minScored: MIN_SCORED },
    CONGRESS: CONGRESS,
    scored: false,
    NEVER_FEEDS: ['directionMatch', 'wordVsAction', 'formalPatternTier',
                  'publicationFloor', 'formalActCounts', 'ballotSort',
                  'yourMatch', 'anyCrossPersonRanking', 'alignment', 'door2Picks']
  };
})();
