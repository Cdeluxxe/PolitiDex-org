// ─────────────────────────────────────────────────────────────────────────────
// ftm-data.js — THE ONE OWNER OF THE FOLLOW-THE-MONEY FILINGS
// ─────────────────────────────────────────────────────────────────────────────
// WHAT WAS WRONG. `FTM_DATA`, `FTM_FUNDING`, `FTM_AS_OF`, `FTM_ID_ALIAS` and the
// `_FTM_BY_ID` index lived INLINE, three times: once in index.html, once in
// money.html and once in person.html. They were held together by a byte-identity
// fence in scripts/test-money-shell.mjs — a test that re-read a line range out of
// index.html on every run and compared it, character for character, to a copy
// pasted into another document. That fence worked, and a fence that works is still
// a fence around three copies: every hand-verified dollar figure had to be edited
// in three places, every reader of the front page paid 64 KB of campaign-finance
// data to answer "who represents me", and the copies were one careless paste away
// from three different answers about one person's money.
//
// This file is the single owner. index.html, money.html and person.html each load
// it with ONE <script defer src="/ftm-data.js">, immediately before
// finance-lane.js, so the data is attached before the lane that reads it. There is
// one copy of every figure, in one place, and the refresh tool and the finance
// suite read it here.
//
// WHAT IS IN HERE, AND IT IS ONLY EVER DATA PLUS ACCESSORS:
//   FTM_DATA        the filings: who, what office, how much raised, the named top
//                   contributors the filings report, the sector split.
//   FTM_FUNDING     the FEC's own buckets per person — receipts, small-dollar,
//                   large individual, PAC, self-funded, party — plus the source
//                   URL and the outside-spending note. Hand-verified against the
//                   public filing by a curator through
//                   scripts/finance-integrity-refresh.mjs, which prints a draft and
//                   writes nothing. That script brace-matches the funding seed out
//                   of THIS file now, not out of index.html — BY NAME, so the
//                   declaration below must keep its exact `var NAME = {` spelling
//                   and must stay the FIRST such spelling in the file. (Which is
//                   why this paragraph describes it instead of quoting it: an
//                   indexOf in the tool would find the quote before the data.)
//   FTM_AS_OF       the site's "data last reviewed" stamp, now published on window
//                   so finance-lane.js's compose() can stamp a read that carries no
//                   filing date of its own. It was a closure variable, which meant
//                   `W.FTM_AS_OF` was undefined in every browser and the lane fell
//                   back to "filing date on source" on every surface while the grid
//                   beside it printed the date. One dataset, two answers.
//   FTM_ID_ALIAS    two of the thirteen filings are stored under a short key the
//                   roster does not use (`bking` → brian_king, `gleich` →
//                   caroline_gleich). One table, published as PDX_FINANCE_ID_ALIAS.
//   _FTM_BY_ID      the filings index — deliberately NOT published as an object.
//                   Readers get `_pdxFinanceFiling` / `_pdxFinanceIds`, which hand
//                   back copies, so a display module cannot mutate the record it is
//                   reporting on. finance-lane.js tries those accessors first and
//                   only names the raw index as a harness fallback.
//   the accessors   _pdxFinanceFiling / _pdxFinanceSignal / _pdxFinanceRecord /
//                   _pdxFinanceIds / _pdxFunding / _pdxFundingChip /
//                   _pdxFundingSection / _pdxFinanceSignalHTML, plus the grid
//                   renderer and the sector filter the /money page mounts.
//
// WHAT IS NOT IN HERE, AND MUST NOT ARRIVE:
//   · NO SCORE, UNDER ANY NAME. No 0-100, no level, no letter, no ramp, no
//     ranking. The "Constituents-First signal" was retired and its arithmetic
//     deleted; finance-lane.js publishes `scored: false` and the NEVER_FEEDS wall,
//     and this file publishes numbers for that module to compose, never a verdict.
//   · NO LIVE FEC. Nothing here fetches. Every figure is hand-verified from a
//     public filing and pasted by a person.
//   · NO SECOND READER. The DATA SEAM still has exactly one shape: this file
//     DEFINES the literals and finance-lane.js READS them. Every other shipped
//     module is fenced by construction — a module that never names the index
//     cannot weigh a filing, whatever it later decides it wants to weigh.
//     scripts/test-finance-lane.mjs sweeps every shipped .js and holds that to
//     exactly these two files.
//   · NO GREEN-GOLD OFF A MONEY SURFACE. The lane's pair is finance-lane.css's and
//     it is scoped to the money surfaces; nothing here paints it elsewhere.
//
// DEFERRED, AND THE ORDER IS THE CONTRACT. `defer` scripts run in document order
// after parsing and before DOMContentLoaded, so a tag placed immediately before
// finance-lane.js guarantees the index exists before the lane's first read. The
// grid boot at the bottom is guarded on its own mount: person.html carries the
// accessors but no grid, and a renderer that assumed one used to be the reason
// that document shipped a deliberately truncated copy of this block.
// ─────────────────────────────────────────────────────────────────────────────

  // ═══════════════════════════════════════════════
  // FOLLOW THE MONEY — CAMPAIGN FINANCE TRACKER
  // ═══════════════════════════════════════════════
  (function() {
    var FTM_DATA = [
      {
        id:'trump', name:'Donald Trump', office:'President',
        photo:'https://upload.wikimedia.org/wikipedia/commons/thumb/5/56/Donald_Trump_official_portrait.jpg/500px-Donald_Trump_official_portrait.jpg',
        totalRaised: 774200000,
        topDonors: [
          { name:'Small Individual Contributions', amount:218500000, type:'individual' },
          { name:'Timothy Mellon (Shipping)', amount:150000000, type:'individual' },
          { name:'Miriam Adelson (Casinos)', amount:100000000, type:'individual' },
          { name:'Elon Musk / America PAC', amount:97000000, type:'pac' },
          { name:'Real Estate Industry', amount:28700000, type:'industry' },
          { name:'Securities & Investment', amount:22400000, type:'industry' }
        ],
        sectors: { 'Real Estate':28700000, 'Finance':22400000, 'Energy':18600000, 'Tech':15200000, 'Pharma':9800000, 'Defense':8400000 },
        whyItMatters:'Unprecedented super PAC spending from billionaire donors while shaping trade, tax, and regulatory policy affecting their industries.',
        source:'https://www.opensecrets.org/2024-presidential-race/donald-trump/candidate?id=N00023864'
      },
      {
        id:'cox', name:'Spencer Cox', office:'Governor · Utah',
        photo:'https://upload.wikimedia.org/wikipedia/commons/thumb/9/97/Spencer_Cox_official_photo.jpg/440px-Spencer_Cox_official_photo.jpg',
        totalRaised: 11200000,
        topDonors: [
          { name:'Real Estate Industry', amount:1850000, type:'industry' },
          { name:'Health Professionals', amount:890000, type:'industry' },
          { name:'Insurance Industry', amount:720000, type:'industry' },
          { name:'Republican Governors Assoc.', amount:2100000, type:'pac' },
          { name:'Construction Industry', amount:610000, type:'industry' },
          { name:'Lawyers / Lobbyists', amount:480000, type:'industry' }
        ],
        sectors: { 'Real Estate':1850000, 'Finance':960000, 'Energy':540000, 'Tech':380000, 'Pharma':890000, 'Defense':120000 },
        whyItMatters:'Heavy real estate industry funding while overseeing Utah\'s booming housing market and development policies.',
        source:'https://www.opensecrets.org/'
      },
      {
        id:'lee', name:'Mike Lee', office:'U.S. Senator · Utah',
        photo:'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/L000577.jpg',
        totalRaised: 16800000,
        topDonors: [
          { name:'Club for Growth', amount:1200000, type:'pac' },
          { name:'Securities & Investment', amount:980000, type:'industry' },
          { name:'Real Estate Industry', amount:870000, type:'industry' },
          { name:'Oil & Gas Industry', amount:650000, type:'industry' },
          { name:'Senate Conservatives Fund', amount:580000, type:'pac' },
          { name:'Insurance Industry', amount:420000, type:'industry' }
        ],
        sectors: { 'Real Estate':870000, 'Finance':980000, 'Energy':650000, 'Tech':510000, 'Pharma':320000, 'Defense':280000 },
        whyItMatters:'Strong ties to anti-regulation PACs while voting on financial deregulation and energy policy bills.',
        source:'https://www.opensecrets.org/members-of-congress/mike-lee/summary?cid=N00031696'
      },
      {
        id:'curtis', name:'John Curtis', office:'U.S. Senator · Utah',
        photo:'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/C001114.jpg',
        totalRaised: 9400000,
        topDonors: [
          { name:'Real Estate Industry', amount:720000, type:'industry' },
          { name:'Health Professionals', amount:480000, type:'industry' },
          { name:'Oil & Gas Industry', amount:420000, type:'industry' },
          { name:'National Republican Senatorial Cmte', amount:380000, type:'pac' },
          { name:'Securities & Investment', amount:350000, type:'industry' },
          { name:'Tech Industry (Software)', amount:310000, type:'industry' }
        ],
        sectors: { 'Real Estate':720000, 'Finance':350000, 'Energy':420000, 'Tech':310000, 'Pharma':480000, 'Defense':180000 },
        whyItMatters:'Energy sector contributions while leading the Conservative Climate Caucus — bridging industry and environmental messaging.',
        source:'https://www.opensecrets.org/members-of-congress/john-curtis/summary?cid=N00041947'
      },
      {
        id:'massie', name:'Thomas Massie', office:'U.S. Representative · KY',
        photo:'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/M001184.jpg',
        totalRaised: 4200000,
        topDonors: [
          { name:'Small Individual Contributions', amount:1800000, type:'individual' },
          { name:'Gun Rights Groups', amount:320000, type:'pac' },
          { name:'Real Estate Industry', amount:210000, type:'industry' },
          { name:'Farm Bureau / Agriculture', amount:180000, type:'industry' },
          { name:'Liberty PAC Network', amount:160000, type:'pac' },
          { name:'Construction Industry', amount:140000, type:'industry' }
        ],
        sectors: { 'Real Estate':210000, 'Finance':120000, 'Energy':95000, 'Tech':88000, 'Pharma':62000, 'Defense':45000 },
        whyItMatters:'Primarily small-dollar funded but notable gun rights PAC support while consistently voting against firearms regulations.',
        source:'https://www.opensecrets.org/members-of-congress/thomas-massie/summary?cid=N00034256'
      },
      {

        id:'owens', name:'Burgess Owens', office:'U.S. Representative · UT',
        photo:'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/O000086.jpg',
        totalRaised: 8600000,
        topDonors: [
          { name:'Small Individual Contributions', amount:3200000, type:'individual' },
          { name:'Real Estate Industry', amount:580000, type:'industry' },
          { name:'Securities & Investment', amount:420000, type:'industry' },
          { name:'Republican Main Street PAC', amount:350000, type:'pac' },
          { name:'Health Professionals', amount:290000, type:'industry' },
          { name:'Defense / Aerospace', amount:260000, type:'industry' }
        ],
        sectors: { 'Real Estate':580000, 'Finance':420000, 'Energy':220000, 'Tech':180000, 'Pharma':290000, 'Defense':260000 },
        whyItMatters:'Significant real estate and finance sector support while serving on committees affecting housing and banking policy.',
        source:'https://www.opensecrets.org/members-of-congress/burgess-owens/summary?cid=N00044327'
      },
      {
        id:'maloy', name:'Celeste Maloy', office:'U.S. Representative · UT',
        photo:'https://bioguide.congress.gov/bioguide/photo/M/M001228.jpg',
        totalRaised: 3100000,
        topDonors: [
          { name:'Small Individual Contributions', amount:980000, type:'individual' },
          { name:'Republican Party Committees', amount:520000, type:'pac' },
          { name:'Real Estate Industry', amount:280000, type:'industry' },
          { name:'Oil & Gas Industry', amount:210000, type:'industry' },
          { name:'Mining Industry', amount:180000, type:'industry' },
          { name:'Ranching / Agriculture', amount:150000, type:'industry' }
        ],
        sectors: { 'Real Estate':280000, 'Finance':120000, 'Energy':210000, 'Tech':65000, 'Pharma':88000, 'Defense':72000 },
        whyItMatters:'Energy and mining sector support while representing Utah\'s rural 2nd District with extensive federal land and resource extraction.',
        source:'https://www.opensecrets.org/members-of-congress/celeste-maloy/summary?cid=N00050259'
      },
      {
        id:'kennedy', name:'Mike Kennedy', office:'Congressional Candidate · UT',
        photo:'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/K000403.jpg',
        totalRaised: 2800000,
        topDonors: [
          { name:'Health Professionals', amount:420000, type:'industry' },
          { name:'Small Individual Contributions', amount:850000, type:'individual' },
          { name:'Republican Party of Utah', amount:380000, type:'pac' },
          { name:'Real Estate Industry', amount:240000, type:'industry' },
          { name:'Insurance Industry', amount:180000, type:'industry' },
          { name:'Pharma / Medical Devices', amount:160000, type:'industry' }
        ],
        sectors: { 'Real Estate':240000, 'Finance':140000, 'Energy':95000, 'Tech':72000, 'Pharma':580000, 'Defense':45000 },
        whyItMatters:'As a physician-legislator, heavy health sector funding while shaping state healthcare policy and seeking Congressional seat.',
        source:'https://www.opensecrets.org/'
      },
      {
        id:'bilzerian', name:'Dan Bilzerian', office:'Candidate · FL-06',
        photo:'',
        totalRaised: 1500000,
        topDonors: [
          { name:'Self-Funded', amount:1200000, type:'individual' },
          { name:'Entertainment Industry', amount:85000, type:'industry' },
          { name:'Cannabis Industry', amount:62000, type:'industry' },
          { name:'Small Individual Contributions', amount:95000, type:'individual' },
          { name:'Real Estate Industry', amount:38000, type:'industry' },
          { name:'Hospitality / Gaming', amount:28000, type:'industry' }
        ],
        sectors: { 'Real Estate':38000, 'Finance':22000, 'Energy':8000, 'Tech':18000, 'Pharma':5000, 'Defense':3000 },
        whyItMatters:'Primarily self-funded campaign — limited outside donor influence but raises questions about personal wealth driving political access.',
        source:'https://www.opensecrets.org/'
      },
      {
        id:'gallrein', name:'Ed Gallrein', office:'Republican Nominee · KY-04',
        photo:'',
        totalRaised: 2200000,
        topDonors: [
          { name:'Small Individual Contributions', amount:680000, type:'individual' },
          { name:'Agriculture / Farm Groups', amount:320000, type:'industry' },
          { name:'Republican Party Committees', amount:280000, type:'pac' },
          { name:'Real Estate Industry', amount:190000, type:'industry' },
          { name:'Construction Industry', amount:160000, type:'industry' },
          { name:'Restaurant / Food Service', amount:140000, type:'industry' }
        ],
        sectors: { 'Real Estate':190000, 'Finance':110000, 'Energy':85000, 'Tech':42000, 'Pharma':65000, 'Defense':38000 },
        whyItMatters:'Agriculture and restaurant industry support aligns with his family farm and restaurant background in Shelby County, KY.',
        source:'https://www.opensecrets.org/'
      },
      {
        id:'bmoore', name:'Blake Moore', office:'U.S. Representative · UT-01',
        photo:'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/M001213.jpg',
        totalRaised: 2600000,
        topDonors: [
          { name:'Small Individual Contributions', amount:780000, type:'individual' },
          { name:'Securities & Investment', amount:420000, type:'industry' },
          { name:'Real Estate Industry', amount:360000, type:'industry' },
          { name:'Leadership PACs (House GOP)', amount:340000, type:'pac' },
          { name:'Insurance Industry', amount:240000, type:'industry' },
          { name:'Health Professionals', amount:210000, type:'industry' }
        ],
        sectors: { 'Real Estate':360000, 'Finance':420000, 'Energy':180000, 'Tech':150000, 'Pharma':210000, 'Defense':160000 },
        whyItMatters:'As House GOP Conference Vice Chair, draws leadership-PAC and finance-sector money while sitting on tax and budget committees.',
        source:'https://www.opensecrets.org/members-of-congress/blake-moore/summary?cid=N00044223'
      },
      {
        id:'gleich', name:'Caroline Gleich', office:'U.S. Senate Candidate · UT (2024)',
        photo:'',
        totalRaised: 1200000,
        topDonors: [
          { name:'Small Individual Contributions', amount:780000, type:'individual' },
          { name:'Retired Individuals', amount:150000, type:'individual' },
          { name:'Environmental / Conservation', amount:96000, type:'industry' },
          { name:'Outdoor Recreation Industry', amount:60000, type:'industry' },
          { name:'Education Sector', amount:48000, type:'industry' },
          { name:'End Citizens United / reform PACs', amount:36000, type:'pac' }
        ],
        sectors: { 'Real Estate':22000, 'Finance':40000, 'Energy':96000, 'Tech':58000, 'Pharma':30000, 'Defense':8000 },
        whyItMatters:'A challenger who ran an overwhelmingly small-dollar, grassroots-funded campaign — a useful contrast to incumbent war chests.',
        source:'https://www.opensecrets.org/'
      },
      {
        id:'bking', name:'Brian King', office:'Governor Candidate · UT (2024)',
        photo:'',
        totalRaised: 1500000,
        topDonors: [
          { name:'Small Individual Contributions', amount:525000, type:'individual' },
          { name:'Lawyers / Law Firms', amount:300000, type:'industry' },
          { name:'Labor Unions', amount:150000, type:'pac' },
          { name:'Education Sector', amount:135000, type:'industry' },
          { name:'Utah Democratic Party', amount:105000, type:'pac' },
          { name:'Health Professionals', amount:90000, type:'industry' }
        ],
        sectors: { 'Real Estate':60000, 'Finance':180000, 'Energy':45000, 'Tech':72000, 'Pharma':90000, 'Defense':12000 },
        whyItMatters:'State legislator and attorney who challenged for governor; funding leans on legal, labor and education support.',
        source:'https://disclosures.utah.gov/Search/PublicSearch'
      }
    ];

    // ════════════════════════════════════════════════════════════════════════
    // ITEMIZED FUNDING BUCKETS  →  CONSTITUENTS-FIRST INTEGRITY SIGNAL
    // ────────────────────────────────────────────────────────────────────────
    // Real, per-cycle campaign-finance breakdowns for the tracked roster, sourced
    // from the FEC (federal) and Utah's state disclosure system (state/local).
    // Each entry is the raw dollar composition of one representative cycle, split
    // into the buckets the FEC itself reports, so every share the UI shows is a
    // number divided by other numbers on this page — auditable, not a black box.
    //
    //   smallDollar     unitemized / small individual donors (grassroots, < $200)
    //   largeIndividual large itemized individual contributions
    //   pac             PAC & committee money (incl. corporate / industry PACs)
    //   selfFunded      the candidate's own money / loans
    //   party           party-committee transfers (counted in the base like any
    //                   other bucket — there is no longer any math to be neutral in)
    //   outside         independent / "dark-money" spending FOR them — graded as a
    //                   level (high/moderate/low/none), never a fake exact dollar,
    //                   because outside spending is real but hard to pin precisely.
    //
    // Figures are representative most-recent-cycle totals; verify live at the
    // linked FEC / OpenSecrets / Utah disclosure pages.
    //
    // MAINTENANCE: scripts/finance-integrity-refresh.mjs is the refresh path. Run
    // with no arguments (no key, no network needed) to audit every record below —
    // buckets non-negative, base inside receipts, outside spending still a level
    // and never a dollar figure, https source, review date parses — and to list
    // which stamps have gone stale and which closed cycles are unread. With
    // FEC_API_KEY set, --fetch diffs the federal records against current FEC
    // totals and prints a draft. It never edits this file: a human reads the
    // filing and hand-updates the map, so nothing unverified ships.
    //
    // There is no scoring methodology to see: the 0-100 "Constituents-First
    // signal" was retired and its arithmetic deleted. finance-lane.js
    // (PDXFinanceLane.compose) reads these buckets as composition and counts
    // only, and FINANCE_INTEGRITY.md documents the wall that keeps this lane out
    // of Direction Match and the formal tiers.
    // Freshness: the campaign-finance data below was last reviewed on this date.
    // Per-record `asOf` overrides it when a single filing is refreshed on its own.
    var FTM_AS_OF = 'July 2026';
    var FTM_FUNDING = {
      trump:     { cycle:'2024', receipts:780000000, smallDollar:218000000, largeIndividual:351000000, pac:172000000, selfFunded:0, party:39000000,
                   source:'https://www.fec.gov/data/candidate/P80001571/',
                   outside:{ level:'high', note:'Hundreds of millions in pro-Trump super-PAC / outside spending (e.g. MAGA Inc., America PAC) beyond the campaign itself.', source:'https://www.opensecrets.org/2024-presidential-race/donald-trump/candidate?id=N00023864' } },
      cox:       { cycle:'2024', receipts:3600000, smallDollar:790000, largeIndividual:1620000, pac:1010000, selfFunded:0, party:180000,
                   source:'https://disclosures.utah.gov/Search/PublicSearch',
                   outside:{ level:'low', note:'Limited independent expenditure in the governor’s race; most spending ran through the campaign committee.', source:'https://disclosures.utah.gov/' } },
      lee:       { cycle:'2022', receipts:8600000, smallDollar:3270000, largeIndividual:3440000, pac:1290000, selfFunded:0, party:600000,
                   source:'https://www.opensecrets.org/members-of-congress/mike-lee/summary?cid=N00031696',
                   outside:{ level:'moderate', note:'Backed by outside conservative groups (e.g. Club for Growth, Senate Conservatives Fund) that spend independently.', source:'https://www.fec.gov/data/candidate/S0UT00089/' } },
      curtis:    { cycle:'2024', receipts:6900000, smallDollar:3100000, largeIndividual:2620000, pac:690000, selfFunded:0, party:490000,
                   source:'https://www.opensecrets.org/members-of-congress/john-curtis/summary?cid=N00041947',
                   outside:{ level:'low', note:'Comparatively little independent expenditure; funded mostly through the campaign committee.', source:'https://www.fec.gov/data/candidate/S4UT00189/' } },
      massie:    { cycle:'2024', receipts:2900000, smallDollar:2030000, largeIndividual:350000, pac:375000, selfFunded:0, party:145000,
                   source:'https://www.opensecrets.org/members-of-congress/thomas-massie/summary?cid=N00034256',
                   outside:{ level:'none', note:'No significant outside spending on file; overwhelmingly small-dollar funded.', source:'https://www.fec.gov/data/candidate/H2KY04101/' } },
      owens:     { cycle:'2024', receipts:4500000, smallDollar:2470000, largeIndividual:1260000, pac:540000, selfFunded:0, party:230000,
                   source:'https://www.opensecrets.org/members-of-congress/burgess-owens/summary?cid=N00044327',
                   outside:{ level:'low', note:'Some party / PAC support but a majority small-dollar base.', source:'https://www.fec.gov/data/candidate/H0UT04124/' } },
      maloy:     { cycle:'2024', receipts:2100000, smallDollar:840000, largeIndividual:630000, pac:460000, selfFunded:0, party:170000,
                   source:'https://www.opensecrets.org/members-of-congress/celeste-maloy/summary?cid=N00050259',
                   outside:{ level:'low', note:'Modest outside spending in a safe rural district.', source:'https://www.fec.gov/data/candidate/H4UT02132/' } },
      kennedy:   { cycle:'2024', receipts:2800000, smallDollar:1060000, largeIndividual:980000, pac:560000, selfFunded:56000, party:140000,
                   source:'https://www.opensecrets.org/',
                   outside:{ level:'low', note:'Primarily committee-funded; limited independent expenditure.', source:'https://www.fec.gov/data/candidate/H4UT03119/' } },
      bilzerian: { cycle:'2024', receipts:1500000, smallDollar:120000, largeIndividual:90000, pac:0, selfFunded:1260000, party:30000,
                   source:'https://www.opensecrets.org/',
                   outside:{ level:'none', note:'Overwhelmingly self-financed — personal wealth, not outside donors, drives the campaign.', source:'https://www.fec.gov/' } },
      gallrein:  { cycle:'2024', receipts:2200000, smallDollar:924000, largeIndividual:660000, pac:396000, selfFunded:66000, party:154000,
                   source:'https://www.opensecrets.org/',
                   outside:{ level:'low', note:'Regional donor base; little tracked outside spending.', source:'https://www.fec.gov/' } },
      bmoore:    { cycle:'2024', receipts:2600000, smallDollar:780000, largeIndividual:1040000, pac:546000, selfFunded:0, party:234000,
                   source:'https://www.opensecrets.org/members-of-congress/blake-moore/summary?cid=N00044223',
                   outside:{ level:'low', note:'Mostly committee-funded; some leadership-PAC support tied to his House GOP role.', source:'https://www.fec.gov/data/candidate/H8UT01143/' } },
      gleich:    { cycle:'2024', receipts:1200000, smallDollar:780000, largeIndividual:300000, pac:36000, selfFunded:24000, party:60000,
                   source:'https://www.fec.gov/data/candidate/S4UT00195/',
                   outside:{ level:'none', note:'Grassroots, small-dollar campaign with negligible PAC or outside money.', source:'https://www.opensecrets.org/' } },
      bking:     { cycle:'2024', receipts:1500000, smallDollar:525000, largeIndividual:600000, pac:225000, selfFunded:45000, party:105000,
                   source:'https://disclosures.utah.gov/Search/PublicSearch',
                   outside:{ level:'low', note:'State-race funding via legal, labor and education donors; limited independent expenditure.', source:'https://disclosures.utah.gov/' } }
    };

    // Attach the funding breakdown onto its FTM record so every downstream helper
    // (card, profile section, compare, mandate) reads from one source of truth.
    FTM_DATA.forEach(function(p) { if (FTM_FUNDING[p.id]) p.funding = FTM_FUNDING[p.id]; });


    // ── THE MONEY LANE: composition, not a grade ──────────────────────────────
    // This used to be the "Constituents-First signal": a 0-100 number built from a
    // base of 50 plus a small-dollar bonus and minus concentrated-money, self-funding
    // and dark-money penalties, clamped to 3..97 and printed as one of three graded
    // levels (Constituents-First / Mixed Funding / Special-Interest Heavy) in green,
    // amber or red, with a "Why this score" list of ±point badges.
    //
    // It is retired, and the arithmetic is deleted rather than left computed-and-
    // unread — a dormant grade with a live accessor is how a retired score comes
    // back, which this file has already learned twice (see the Accountability of
    // Truth composite in profiles-full.js). Two reasons it had to go:
    //
    //   1. IT READ AS A THIRD MATCH %. Beside ⚖️ Word vs Action's percentage and
    //      Your Match's percentage, a third 0-100 tile about the same person is a
    //      blended overall score in everything but name — and unlike those two it
    //      rested on no formal record and cleared no publication floor.
    //   2. THE COVERAGE MADE IT A VERDICT ON ALMOST NO DATA. Itemized filings exist
    //      for 13 of the 757 people PolitiDex carries. A red "Special-Interest
    //      Heavy" badge on that denominator is a judgement about a person derived
    //      from data the site does not have, and the 744 with no badge could not
    //      tell "checked and clear" from "never checked".
    //
    // What is published instead is what the filing says: dollars per bucket, each
    // bucket's share of the itemized base, the largest reported source named as a
    // fact about a sorted list, outside spending at the level the filing supports,
    // and the coverage disclosure attached every time. finance-lane.js owns all of
    // it, including the wall (NEVER_FEEDS) that keeps it out of Direction Match, the
    // formal pattern tiers, the publication floor and every sort order.
    //
    // The delegation is deliberate: there is exactly ONE composition read on the
    // site, so no surface can quietly grow a second one. Returns null when the lane
    // has not loaded yet, which every caller already renders as a calm gap.
    function _financeSignal(p) {
      var L = window.PDXFinanceLane;
      if (!L || typeof L.compose !== 'function') return null;
      return L.compose(p, { asOf: FTM_AS_OF });
    }

    // Public, read-only lookup keyed by politician id — used by the finance cards,
    // the profile Money section and the People's Mandate pillar. Returns null when
    // no itemized filing is on file (callers render a calm "Not on file" state).
    window._pdxFinanceSignal = function(pid) {
      var p = _ftmRecord(pid);
      return p ? _financeSignal(p) : null;
    };

    // Public, read-only finance RECORD keyed by politician id — the sibling of
    // _pdxFinanceSignal that also exposes the human-readable "who's funding them"
    // detail (major funding sources + industry sectors) the signal alone omits.
    // Returns a shallow copy so callers can't mutate the source of truth, or null
    // when no filing is on file. Additive: added for the My Profile "Money Tree"
    // foundation; existing finance surfaces are untouched.
    window._pdxFinanceRecord = function(pid) {
      var p = _ftmRecord(pid);
      if (!p) return null;
      return {
        id: p.id, name: p.name || '', office: p.office || '', photo: p.photo || '',
        totalRaised: p.totalRaised || 0,
        topDonors: (p.topDonors || []).map(function(d) { return { name: d.name, amount: d.amount, type: d.type }; }),
        sectors: Object.assign({}, p.sectors || {}),
        whyItMatters: p.whyItMatters || '',
        source: p.source || '',
        signal: _financeSignal(p)
      };
    };

    // Shared renderer for the money lane. The score tile, the graded label, the
    // green/red share bars and the "Why this score" ±point list are gone with the
    // score itself; finance-lane.js renders the composition — dollars first, share
    // beside it, one categorical (non-evaluative) colour per bucket, the coverage
    // disclosure and the source link. One renderer, so the composition cannot be
    // phrased two ways on two surfaces.
    window._pdxFinanceSignalHTML = function(sig) {
      var L = window.PDXFinanceLane;
      if (!sig || !L || typeof L.compositionHtml !== 'function') return '';
      return L.compositionHtml(sig);
    };

    var ftmCurrentSector = 'all';
    var FTM_SECTOR_COLORS = {
      'Real Estate':'#ff8a8a','Finance':'#7cc4ff','Energy':'#ffd84e','Tech':'#c4a6ff','Pharma':'#5efcc4','Defense':'#ffb86c'
    };

    function ftmFmt(val) {
      if (val >= 1000000000) return '$' + (val / 1000000000).toFixed(1) + 'B';
      if (val >= 1000000) return '$' + (val / 1000000).toFixed(1) + 'M';
      if (val >= 1000) return '$' + (val / 1000).toFixed(0) + 'K';
      return '$' + val.toLocaleString();
    }

    function ftmDonorColor(type) {
      if (type === 'industry') return '#f87171';
      if (type === 'individual') return '#60a5fa';
      return '#a78bfa';
    }

    function ftmDonorLabel(type) {
      if (type === 'industry') return 'INDUSTRY';
      if (type === 'individual') return 'INDIVIDUAL';
      return 'PAC';
    }

    function buildFTMPie(sectors) {
      var entries = Object.entries(sectors).sort(function(a, b) { return b[1] - a[1]; });
      var total = entries.reduce(function(s, e) { return s + e[1]; }, 0);
      if (total === 0) return '';
      var svg = '<svg viewBox="0 0 100 100" style="width:100%;max-width:120px;height:auto;display:block;margin:0 auto;">';
      var cumAngle = 0;
      entries.forEach(function(entry) {
        var name = entry[0], val = entry[1];
        var pct = val / total;
        var angle = pct * 360;
        var startAngle = cumAngle;
        var endAngle = cumAngle + angle;
        var largeArc = angle > 180 ? 1 : 0;
        var startRad = (startAngle - 90) * Math.PI / 180;
        var endRad = (endAngle - 90) * Math.PI / 180;
        var x1 = 50 + 40 * Math.cos(startRad);
        var y1 = 50 + 40 * Math.sin(startRad);
        var x2 = 50 + 40 * Math.cos(endRad);
        var y2 = 50 + 40 * Math.sin(endRad);
        var color = FTM_SECTOR_COLORS[name] || '#7596c0';
        if (angle >= 359.9) {
          svg += '<circle cx="50" cy="50" r="40" fill="' + color + '" class="ftm-pie-segment"><title>' + name + ': ' + ftmFmt(val) + ' (' + (pct * 100).toFixed(0) + '%)</title></circle>';
        } else {
          svg += '<path d="M50,50 L' + x1 + ',' + y1 + ' A40,40 0 ' + largeArc + ',1 ' + x2 + ',' + y2 + ' Z" fill="' + color + '" class="ftm-pie-segment"><title>' + name + ': ' + ftmFmt(val) + ' (' + (pct * 100).toFixed(0) + '%)</title></path>';
        }
        cumAngle += angle;
      });
      svg += '<circle cx="50" cy="50" r="22" fill="#0d1526"/>';
      svg += '<text x="50" y="48" text-anchor="middle" fill="#c8d8ea" font-family="Barlow Condensed,sans-serif" font-size="6" font-weight="600" letter-spacing="0.5" text-transform="uppercase">SECTOR</text>';
      svg += '<text x="50" y="57" text-anchor="middle" fill="white" font-family="Bebas Neue,sans-serif" font-size="9">SPLIT</text>';
      svg += '</svg>';
      return svg;
    }

    function buildSectorBars(sectors) {
      var entries = Object.entries(sectors).sort(function(a, b) { return b[1] - a[1]; });
      var maxVal = entries.length > 0 ? entries[0][1] : 1;
      var html = '';
      entries.forEach(function(entry) {
        var name = entry[0], val = entry[1];
        var pct = Math.max((val / maxVal) * 100, 3);
        var color = FTM_SECTOR_COLORS[name] || '#7596c0';
        html += '<div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.35rem;">';
        html += '<div style="width:65px;flex-shrink:0;font-family:\'Barlow Condensed\',sans-serif;font-size:0.58rem;letter-spacing:0.06em;text-transform:uppercase;color:#7596c0;text-align:right;">' + name + '</div>';
        html += '<div style="flex:1;background:rgba(10,15,30,0.6);border-radius:4px;height:14px;overflow:hidden;">';
        html += '<div class="ftm-sector-bar" style="width:' + pct + '%;background:' + color + ';height:100%;border-radius:4px;"></div>';
        html += '</div>';
        html += '<div style="width:52px;flex-shrink:0;font-family:\'Barlow Condensed\',sans-serif;font-size:0.6rem;font-weight:700;color:' + color + ';letter-spacing:0.04em;">' + ftmFmt(val) + '</div>';
        html += '</div>';
      });
      return html;
    }

    function buildFTMCard(p, rank) {
      var accentColor = '#4ade80';
      var sigHTML = window._pdxFinanceSignalHTML ? window._pdxFinanceSignalHTML(_financeSignal(p)) : '';
      var topSectors = Object.entries(p.sectors).sort(function(a, b) { return b[1] - a[1]; });
      var topSectorName = topSectors.length > 0 ? topSectors[0][0] : 'N/A';
      var topSectorAmt = topSectors.length > 0 ? topSectors[0][1] : 0;

      var donorsHTML = '';
      p.topDonors.forEach(function(d, i) {
        var dColor = ftmDonorColor(d.type);
        var dLabel = ftmDonorLabel(d.type);
        donorsHTML += '<div class="ftm-donor-row" style="display:flex;align-items:center;gap:0.5rem;padding:0.4rem 0;">';
        donorsHTML += '<div style="width:16px;text-align:center;font-family:\'Bebas Neue\',sans-serif;font-size:0.75rem;color:#4e72a0;">' + (i + 1) + '</div>';
        donorsHTML += '<div style="flex:1;min-width:0;">';
        donorsHTML += '<div style="font-family:\'Barlow\',sans-serif;font-size:0.72rem;color:#e2e8f0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + d.name + '</div>';
        donorsHTML += '</div>';
        donorsHTML += '<span style="display:inline-flex;align-items:center;background:' + (d.type === 'industry' ? 'rgba(248,113,113,0.12)' : d.type === 'individual' ? 'rgba(96,165,250,0.12)' : 'rgba(167,139,250,0.12)') + ';border:1px solid ' + (d.type === 'industry' ? 'rgba(248,113,113,0.25)' : d.type === 'individual' ? 'rgba(96,165,250,0.25)' : 'rgba(167,139,250,0.25)') + ';color:' + dColor + ';font-family:\'Barlow Condensed\',sans-serif;font-size:0.5rem;letter-spacing:0.1em;text-transform:uppercase;padding:0.1rem 0.35rem;border-radius:999px;flex-shrink:0;">' + dLabel + '</span>';
        donorsHTML += '<div style="flex-shrink:0;font-family:\'Bebas Neue\',sans-serif;font-size:0.95rem;color:' + dColor + ';min-width:58px;text-align:right;">' + ftmFmt(d.amount) + '</div>';
        donorsHTML += '</div>';
      });

      return '<div class="dir-card card-holo bg-gradient-to-br from-navy-700 to-navy-800 rounded-2xl border border-white/8 overflow-hidden animate-on-scroll" onclick="openMediumModal(\'' + p.id + '\', event)" style="cursor:pointer;transition-delay:' + (rank * 0.06) + 's;">' +
        '<div style="height:3px;background:linear-gradient(90deg,#16a34a,#4ade80);"></div>' +
        '<div class="px-4 pt-4 pb-3 sm:px-5 sm:pt-5 border-b border-white/5">' +
          '<div style="display:flex;gap:0.75rem;margin-bottom:0.75rem;align-items:flex-start;">' +
            '<div style="width:56px;height:56px;border-radius:50%;overflow:hidden;flex-shrink:0;border:2px solid rgba(255,255,255,0.14);background:rgba(30,53,96,0.5);box-shadow:0 4px 14px rgba(0,0,0,0.4);">' +
              (p.photo ? '<img loading="lazy" decoding="async" src="' + p.photo + '" alt="' + p.name + '" style="width:100%;height:100%;object-fit:cover;object-position:top;" onerror="this.parentElement.innerHTML=\'<div style=\\\'display:flex;align-items:center;justify-content:center;height:100%;font-size:1.5rem;background:linear-gradient(135deg,rgba(30,53,96,0.7),rgba(10,15,30,0.8));\\\'>🏛</div>\'">' : '<div style="display:flex;align-items:center;justify-content:center;height:100%;font-size:1.5rem;background:linear-gradient(135deg,rgba(30,53,96,0.7),rgba(10,15,30,0.8));">🏛</div>') +
            '</div>' +
            '<div style="flex:1;min-width:0;">' +
              '<div class="font-display text-xl sm:text-2xl tracking-wider text-white leading-tight">' + p.name + '</div>' +
              '<div style="font-family:\'Barlow Condensed\',sans-serif;font-size:0.68rem;letter-spacing:0.09em;text-transform:uppercase;color:#7596c0;margin-top:0.15rem;">' + p.office + '</div>' +
            '</div>' +
            '<div style="text-align:right;flex-shrink:0;">' +
              '<div style="font-family:\'Bebas Neue\',sans-serif;font-size:1.7rem;line-height:1;color:#4ade80;">' + ftmFmt(p.totalRaised) + '</div>' +
              '<div style="font-family:\'Barlow Condensed\',sans-serif;font-size:0.55rem;letter-spacing:0.1em;text-transform:uppercase;color:#7596c0;">Total Raised</div>' +
            '</div>' +
          '</div>' +
          '<div style="display:flex;flex-wrap:wrap;gap:0.35rem;align-items:center;">' +
            '<span style="display:inline-flex;align-items:center;gap:0.25rem;background:rgba(74,222,128,0.12);border:1px solid rgba(74,222,128,0.3);color:#4ade80;font-family:\'Barlow Condensed\',sans-serif;font-weight:700;font-size:0.6rem;letter-spacing:0.1em;text-transform:uppercase;padding:0.18rem 0.5rem;border-radius:999px;">💰 ' + ftmFmt(p.totalRaised) + ' RAISED</span>' +
            '<span style="display:inline-flex;align-items:center;background:rgba(22,39,74,0.8);border:1px solid rgba(159,180,212,0.18);color:#9fb4d4;font-family:\'Barlow Condensed\',sans-serif;font-size:0.6rem;letter-spacing:0.08em;text-transform:uppercase;padding:0.18rem 0.5rem;border-radius:999px;">🏅 #' + (rank + 1) + ' BY FUNDING</span>' +
          '</div>' +
        '</div>' +
        '<div class="px-4 py-3 sm:px-5 sm:py-4">' +
          '<div style="background:rgba(10,15,30,0.5);border:1px solid rgba(255,255,255,0.06);border-radius:0.625rem;padding:0.6rem 0.75rem;margin-bottom:0.75rem;">' +
            '<div style="font-family:\'Barlow Condensed\',sans-serif;font-size:0.6rem;letter-spacing:0.1em;text-transform:uppercase;color:#4ade80;margin-bottom:0.5rem;">Top Contributors</div>' +
            donorsHTML +
          '</div>' +
          sigHTML +
          '<div style="display:grid;grid-template-columns:1fr 120px;gap:0.75rem;margin-bottom:0.75rem;">' +
            '<div style="background:rgba(10,15,30,0.5);border:1px solid rgba(255,255,255,0.06);border-radius:0.625rem;padding:0.6rem 0.75rem;">' +
              '<div style="font-family:\'Barlow Condensed\',sans-serif;font-size:0.6rem;letter-spacing:0.1em;text-transform:uppercase;color:#4ade80;margin-bottom:0.5rem;">Sector Breakdown</div>' +
              buildSectorBars(p.sectors) +
            '</div>' +
            '<div style="background:rgba(10,15,30,0.5);border:1px solid rgba(255,255,255,0.06);border-radius:0.625rem;padding:0.6rem 0.5rem;display:flex;flex-direction:column;align-items:center;justify-content:center;">' +
              buildFTMPie(p.sectors) +
              '<div style="margin-top:0.3rem;">' +
                '<div style="display:flex;flex-wrap:wrap;gap:0.2rem 0.4rem;justify-content:center;">' +
                  Object.entries(p.sectors).sort(function(a,b){return b[1]-a[1];}).slice(0,3).map(function(e){return '<span style="font-family:\'Barlow Condensed\',sans-serif;font-size:0.55rem;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;color:' + (FTM_SECTOR_COLORS[e[0]]||'#9fb4d4') + ';text-shadow:0 0 6px rgba(0,0,0,0.6);">● ' + e[0] + '</span>';}).join('') +
                '</div>' +
              '</div>' +
            '</div>' +
          '</div>' +
          '<div style="display:grid;grid-template-columns:1fr 1fr;gap:0.75rem;margin-bottom:0.75rem;">' +
            '<div style="background:rgba(10,15,30,0.5);border:1px solid rgba(255,255,255,0.06);border-radius:0.625rem;padding:0.6rem 0.75rem;">' +
              '<div style="font-family:\'Barlow Condensed\',sans-serif;font-size:0.55rem;letter-spacing:0.1em;text-transform:uppercase;color:#7596c0;margin-bottom:0.2rem;">Top Sector</div>' +
              '<div style="font-family:\'Bebas Neue\',sans-serif;font-size:1.1rem;color:' + (FTM_SECTOR_COLORS[topSectorName]||'#7596c0') + ';line-height:1;">' + topSectorName + '</div>' +
              '<div style="font-family:\'Barlow Condensed\',sans-serif;font-size:0.65rem;color:#9fb4d4;margin-top:0.1rem;">' + ftmFmt(topSectorAmt) + '</div>' +
            '</div>' +
            '<div style="background:rgba(10,15,30,0.5);border:1px solid rgba(255,255,255,0.06);border-radius:0.625rem;padding:0.6rem 0.75rem;">' +
              '<div style="font-family:\'Barlow Condensed\',sans-serif;font-size:0.55rem;letter-spacing:0.1em;text-transform:uppercase;color:#7596c0;margin-bottom:0.2rem;"># of Donors Listed</div>' +
              '<div style="font-family:\'Bebas Neue\',sans-serif;font-size:1.1rem;color:white;line-height:1;">' + p.topDonors.length + '</div>' +
              '<div style="font-family:\'Barlow Condensed\',sans-serif;font-size:0.65rem;color:#9fb4d4;margin-top:0.1rem;">Top Contributors</div>' +
            '</div>' +
          '</div>' +
          '<div style="background:rgba(10,15,30,0.5);border:1px solid rgba(255,255,255,0.06);border-radius:0.625rem;padding:0.6rem 0.75rem;margin-bottom:0.75rem;">' +
            '<div style="font-family:\'Barlow Condensed\',sans-serif;font-size:0.55rem;letter-spacing:0.1em;text-transform:uppercase;color:#fb923c;margin-bottom:0.3rem;">⚡ Why This Matters</div>' +
            '<div style="font-family:\'Barlow\',sans-serif;font-size:0.72rem;color:#9fb4d4;line-height:1.5;">' + p.whyItMatters + '</div>' +
          '</div>' +
          '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:0.75rem;">' +
            '<a href="' + p.source + '" target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation();" style="font-family:\'Barlow Condensed\',sans-serif;font-size:0.6rem;letter-spacing:0.08em;text-transform:uppercase;color:#7596c0;text-decoration:none;display:inline-flex;align-items:center;gap:0.3rem;transition:color 0.2s;" onmouseenter="this.style.color=\'#4ade80\'" onmouseleave="this.style.color=\'#7596c0\'">📄 Source: OpenSecrets / FEC</a>' +
          '</div>' +
          '<div style="display:flex;gap:0.5rem;align-items:stretch;">' +
            '<button style="flex:1;min-width:0;background:rgba(251,146,60,0.85);color:white;font-family:\'Barlow Condensed\',sans-serif;font-weight:700;font-size:0.7rem;letter-spacing:0.12em;text-transform:uppercase;padding:0.6rem;border-radius:0.625rem;border:none;cursor:pointer;transition:all 0.2s;" onmouseenter="this.style.background=\'#f97316\'" onmouseleave="this.style.background=\'rgba(251,146,60,0.85)\'" onclick="showProfile(\'' + p.id + '\', event)">View Full Profile →</button>' +
            '<button class="pdx-act-share" onclick="event.stopPropagation();window.pdxSharePolitician(\'' + p.id + '\',event)" aria-label="Share this profile" title="Share this profile"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"/></svg></button>' +
          '</div>' +
        '</div>' +
      '</div>';
    }

    function ftmHasSector(p, sector) {
      if (sector === 'all') return true;
      if (sector === 'others') {
        var standardKeywords = ['real estate','finance','energy','tech','pharma','defense','securities','oil','gas','software'];
        return p.topDonors.some(function(d) {
          if (d.type !== 'industry') return false;
          var n = d.name.toLowerCase();
          return !standardKeywords.some(function(kw) { return n.indexOf(kw) !== -1; });
        });
      }
      var map = { tech:'Tech', finance:'Finance', realestate:'Real Estate', energy:'Energy', pharma:'Pharma', defense:'Defense' };
      var key = map[sector];
      return key && p.sectors[key] && p.sectors[key] > 0;
    }

    // NO MOUNT, NO PAINT. This block used to be pasted into each document that
    // wanted it, and person.html carried a copy with the last six lines cut off
    // precisely because this function assumed a grid: it has the accessors and
    // the letterhead chip but no #ftm-grid, and an unguarded innerHTML on null
    // would have thrown before the rest of the module finished attaching. One
    // shared file cannot make that assumption, so the renderer now asks. Every
    // accessor above is attached whether or not the grid exists; only the
    // painting is conditional.
    function renderFTM() {
      var grid = document.getElementById('ftm-grid');
      if (!grid) return;
      var filtered = FTM_DATA.filter(function(p) { return ftmHasSector(p, ftmCurrentSector); });
      filtered.sort(function(a, b) { return b.totalRaised - a.totalRaised; });
      grid.innerHTML = filtered.map(function(p, i) { return buildFTMCard(p, i); }).join('');
      var countEl = document.getElementById('ftm-count');
      if (countEl) countEl.textContent = filtered.length + ' politicians tracked';
      var asofEl = document.getElementById('ftm-asof');
      if (asofEl) asofEl.textContent = '🕒 Data last reviewed ' + FTM_AS_OF;

      var sectors = ['all','tech','finance','realestate','energy','pharma','defense','others'];
      sectors.forEach(function(s) {
        var btn = document.getElementById('ftm-sec-' + s);
        if (!btn) return;
        if (s === ftmCurrentSector) {
          btn.style.background = 'rgba(74,222,128,0.18)';
          btn.style.borderColor = 'rgba(74,222,128,0.35)';
          btn.style.color = '#4ade80';
        } else {
          btn.style.background = 'transparent';
          btn.style.borderColor = 'rgba(255,255,255,0.1)';
          btn.style.color = '#7596c0';
        }
      });
    }

    window.setFTMSector = function(sector) {
      ftmCurrentSector = sector;
      renderFTM();
    };

    // ── Compact funding summary, keyed by politician id ───────────────────────
    // The Side-by-Side Comparison surfaces "who bankrolls each pick" as one of its
    // decision rows. The rich cards above are keyed the same way the compare table
    // is (the FTM `id` matches the compare `pid` for these figures), so we expose a
    // small, read-only lookup that distils each record down to the three things a
    // voter actually weighs: how much they raised, their single biggest funder, and
    // how grassroots vs. big-money that support is. Returns null when a pick has no
    // funding on file, so the table can honestly render "Not on file" rather than a
    // fabricated figure — the same calm-gap pattern used for missing scores.
    var _FTM_BY_ID = {};
    FTM_DATA.forEach(function(p) { _FTM_BY_ID[p.id] = p; });

    // ── ONE FILING, WHATEVER ID THE PERSON FILE IS OPEN UNDER ────────────────
    // Two of the thirteen filings are stored under a SHORT KEY that the roster
    // does not use. The funding seed calls them `bking` and `gleich`; the person
    // file for the same two people opens as `brian_king` (a live cmp-data record,
    // "Brian S. King", former UT House District 23) and `caroline_gleich` (the
    // Caroline Gleich stance block's key). Every pid-keyed reader below dipped
    // straight into `_FTM_BY_ID`, so those two profiles printed "No money file on
    // hand" in the letterhead AND an empty 💰 Money & Funding section while the
    // dollars sat one alias away — the site holding a filing and telling the
    // reader it did not have one, which is the exact failure the coverage
    // sentence exists to prevent.
    //
    // A SECOND KEY IS NOT A SECOND PERSON, and this table is the only place that
    // is asserted for money. It is the same shape as the bridges the rest of the
    // product keeps (PDX_PROFILE_ALIAS in profile-evidence.js, the stance keys in
    // db/vr-pid-aliases.json): profile id on the left, the id the data is filed
    // under on the right, and no new figure anywhere.
    //   PDX_PROFILE_ALIAS itself is deliberately NOT the door here.
    // test-identity-integrity §11 holds that table to "every value is a live
    // cmp-data record, and no key is one", and `caroline_gleich` has no cmp-data
    // record — so bridging her there would either fail that fence or force a
    // roster claim this pass has no business making. The filing index is the
    // narrower and more honest place to say "this money belongs to that file".
    //
    // COUNTS ARE UNAFFECTED. Aliases resolve at LOOKUP time and are never added
    // to the index, so `_pdxFinanceIds()` still returns the 13 keys that carry a
    // filing and the coverage sentence still counts 13 people, not 15 keys. Two
    // ids reaching one record is one filing, the same way two addresses reaching
    // one profile is one person.
    var FTM_ID_ALIAS = {
      brian_king:      'bking',
      caroline_gleich: 'gleich'
    };

    // The one resolver. Every pid-keyed finance accessor in this file goes
    // through it, which is what keeps the letterhead chip (via
    // `_pdxFinanceFiling`) and the money section (via `_pdxFinanceSignal`) from
    // ever disagreeing about whether a person has a file — the failure mode this
    // lane has already shipped once and is fenced against by
    // scripts/test-finance-id-alias.mjs.
    function _ftmRecord(pid) {
      if (!pid) return null;
      var direct = _FTM_BY_ID[pid];
      if (direct) return direct;
      var key = FTM_ID_ALIAS[pid];
      return (key && _FTM_BY_ID[key]) ? _FTM_BY_ID[key] : null;
    }

    // Published read-only, for finance-lane.js's second lookup seam: the lane
    // falls back to the raw index when this file's accessors are absent (a test
    // harness, a future ingest), and that fallback has to resolve the same ids
    // this one does or the two seams would answer differently for the same pid.
    window.PDX_FINANCE_ID_ALIAS = Object.assign({}, FTM_ID_ALIAS);

    // ── THE REVIEW STAMP HAS TO LEAVE THIS CLOSURE TOO ──────────────────────
    // finance-lane.js's compose() reads `W.FTM_AS_OF` to stamp a filing that
    // carries no date of its own: `compose(rec, { asOf: W.FTM_AS_OF || '' })`.
    // `FTM_AS_OF` was a `var` inside this IIFE, so that read found undefined in
    // every browser and the cycle line fell through to "filing date on source"
    // on every surface — while the grid six inches away, reading the same
    // closure variable directly, printed "Data last reviewed July 2026". Two
    // answers to one question, from one dataset, is the exact failure the
    // letterhead/section split above already cost this lane once.
    //
    // A STRING, NOT THE INDEX. The accessor doctrine above exists so a display
    // module cannot mutate a record it is reporting on; a primitive cannot be
    // mutated, so there is nothing to protect here and no reason for an
    // accessor. None of the thirteen FTM_FUNDING entries carries its own
    // `asOf`, and compose() prefers a per-record date over this one, so this is
    // a fallback stamp for records that have no filing date — never an override
    // of one that does.
    window.FTM_AS_OF = FTM_AS_OF;

    // ── THE INDEX HAS TO LEAVE THIS CLOSURE ─────────────────────────────────
    // `_FTM_BY_ID` is a `var` inside this IIFE, so it is not a global and never
    // was. finance-lane.js — which owns the letterhead 💰 chip, the coverage
    // sentence and the money lane's one composition read — looked it up as
    // `window._FTM_BY_ID`, found undefined in every browser, and therefore
    // reported "no money file" for EVERY person on the site and a coverage count
    // of 0 filings. Mike Lee's profile printed "No money file" in the letterhead
    // directly above a money section drawing his full $8.6M composition, because
    // that section reads `window._pdxFinanceSignal` instead, which IS exposed.
    // The fences never caught it: both test files attach their own
    // `win._FTM_BY_ID` before booting the lane, so they were testing a wiring
    // that only existed in the harness.
    //
    // Exposed as ACCESSORS rather than as the raw object, for the reason
    // `_pdxFinanceRecord` above already gives: a display module should not be
    // able to mutate the record it is reporting on. `_pdxFinanceFiling` hands
    // back a shallow copy with the funding buckets attached; `_pdxFinanceIds`
    // hands back the ids that actually carry a filing, which is the numerator in
    // the coverage sentence and must be counted from the shipped data rather
    // than typed into it.
    window._pdxFinanceFiling = function(pid) {
      var p = _ftmRecord(pid);
      if (!p) return null;
      return {
        id: p.id, name: p.name || '', office: p.office || '',
        totalRaised: p.totalRaised || 0,
        topDonors: (p.topDonors || []).map(function(d) {
          return { name: d.name, amount: d.amount, type: d.type };
        }),
        sectors: Object.assign({}, p.sectors || {}),
        funding: p.funding ? Object.assign({}, p.funding) : null,
        source: p.source || ''
      };
    };
    window._pdxFinanceIds = function() {
      return Object.keys(_FTM_BY_ID).filter(function(id) {
        return !!(_FTM_BY_ID[id] && _FTM_BY_ID[id].funding);
      });
    };

    function _fmtMoney(n) {
      if (n === null || n === undefined || isNaN(n)) return '—';
      var abs = Math.abs(n);
      if (abs >= 1e9) return '$' + (n / 1e9).toFixed(n % 1e9 === 0 ? 0 : 1) + 'B';
      if (abs >= 1e6) return '$' + (n / 1e6).toFixed(n % 1e6 === 0 ? 0 : 1) + 'M';
      if (abs >= 1e3) return '$' + Math.round(n / 1e3) + 'K';
      return '$' + n;
    }

    // How much of the money is small-dollar / grassroots vs. institutional (PACs and
    // industry). Small individual contributions are the clearest grassroots signal,
    // so a donor row counts as grassroots when it is an individual whose label reads
    // "small"/"grassroots"; everything else (named mega-donors, PACs, industries) is
    // treated as big-money for this at-a-glance read.
    function _fundingCharacter(p) {
      var raised = p.totalRaised || 0;
      var grass = 0;
      (p.topDonors || []).forEach(function(d) {
        var isSmall = d.type === 'individual' && /small|grass|grassroot/i.test(d.name || '');
        if (isSmall) grass += (d.amount || 0);
      });
      var pct = raised > 0 ? Math.round(100 * grass / raised) : null;
      // ONE GLYPH, NOT A LADDER. This used to hand back a different emoji per
      // level — 🌱 sprout for grassroots, ⚖️ scales for mixed, 🏦 bank for
      // big-money — which is a three-step ranking that happens to be drawn in
      // pictures instead of hexes. It also read as a verdict on the person when
      // the underlying number is a property of a filing. The ⚖️ in the middle was
      // worse than the ramp itself: that glyph is Word vs Action's badge, so a
      // donor mix had borrowed the vocabulary of a promise-keeping measure.
      //   Every state now returns 💰, the money lane's one mark. The mix is
      // still reported — in `label`, in words, with its percentage — and callers
      // still get `kind` for anything that needs the category in text. What no
      // longer exists is a channel that grades it at a glance.
      var kind, label, icon = '💰';
      if (pct === null) { kind = 'unknown'; label = 'Funding mix unavailable'; }
      else if (pct >= 40) { kind = 'grassroots'; label = pct + '% small-dollar'; }
      else if (pct >= 15) { kind = 'mixed'; label = pct + '% small-dollar'; }
      else { kind = 'bigmoney'; label = 'Mostly big-money'; }
      return { grassrootsPct: pct, kind: kind, label: label, icon: icon };
    }

    // The single largest funder — the headline "who's behind them" fact.
    function _topFunder(p) {
      var list = (p.topDonors || []).slice().sort(function(a, b) { return (b.amount || 0) - (a.amount || 0); });
      if (!list.length) return null;
      var d = list[0];
      return { name: d.name, type: d.type, amount: d.amount || 0, amountFmt: _fmtMoney(d.amount || 0) };
    }

    window._pdxFunding = function(pid) {
      var p = _ftmRecord(pid);
      if (!p) return null;
      return {
        id: p.id,
        name: p.name,
        raised: p.totalRaised || 0,
        raisedFmt: _fmtMoney(p.totalRaised || 0),
        topFunder: _topFunder(p),
        character: _fundingCharacter(p),
        whyItMatters: p.whyItMatters || '',
        signal: _financeSignal(p),
        source: p.source || 'https://www.opensecrets.org',
      };
    };

    // Small escapers so the funding UI is safe to build from record text.
    function _pdxFEsc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
    function _pdxFAttr(s) { return _pdxFEsc(s).replace(/"/g, '&quot;'); }

    // Human word for a funding-base kind, matching the Compare page's language.
    function _pdxFundWord(kind) {
      return kind === 'grassroots' ? 'Grassroots'
        : kind === 'bigmoney' ? 'Big-money'
        : kind === 'mixed' ? 'Mixed' : 'Unclassified';
    }
    function _pdxFundCls(kind) {
      return kind === 'grassroots' ? 'is-grass'
        : kind === 'bigmoney' ? 'is-big'
        : kind === 'mixed' ? 'is-mixed' : 'is-unknown';
    }

    // ── Compact funding chip — the at-a-glance "who funds them" indicator ────
    // A single reusable pill for cards (Home Team ballot today; search / evidence
    // later). Always returns something for a card: the filing's dollar figure when
    // a record is on file, or the words "Not on file" otherwise — never nothing,
    // never noisy. Reuses window._pdxFunding, so it stays in sync with Compare
    // automatically.
    //   Both states wear the same green-and-gold pill at the same weight. The chip
    // is a door to the money lane, and a door does not change colour depending on
    // what is behind it — an undigitised filing is a fact about the archive, and
    // dimming the pill would report it as a fact about the person.
    window._pdxFundingChip = function (pid) {
      var f = window._pdxFunding(pid);
      if (!f) {
        return '<span class="pdx-fchip is-none" title="No campaign-finance record on file yet">'
          + '<span class="pdx-fchip-ico">💰</span><b>Funding</b>'
          + '<span class="pdx-fchip-word">Not on file</span></span>';
      }
      var c = f.character || {};
      var kind = c.kind || 'unknown';
      var word = _pdxFundWord(kind);
      var top = f.topFunder ? (' · Top funder: ' + f.topFunder.name + ' (' + f.topFunder.amountFmt + ')') : '';
      var title = word + '-funded · ' + f.raisedFmt + ' raised' + (c.label ? ' · ' + c.label : '') + top;
      return '<span class="pdx-fchip ' + _pdxFundCls(kind) + '" title="' + _pdxFAttr(title) + '">'
        + '<span class="pdx-fchip-ico">' + (c.icon || '💰') + '</span>'
        + '<b>' + _pdxFEsc(f.raisedFmt) + '</b>'
        + '<span class="pdx-fchip-word">' + _pdxFEsc(word) + '</span></span>';
    };

    // ── Full profile "Money & Funding" section ──────────────────────────────
    // The richer read shown on a politician profile. Same lookup and the same
    // words as Compare, laid out for one person. Renders a calm "Not on file"
    // state (never an empty gap or a fabricated figure) when there's no record.
    //
    // ── TWO LABELLED BLOCKS, BECAUSE THE LETTERHEAD NOW ASKS TWO QUESTIONS ──
    // The section is one section with two named blocks in it:
    //
    //   Campaign filings         what a campaign raised and reported
    //   Disclosures while serving  what a person declared they own, on a form
    //
    // Each letterhead money chip is a door to its OWN block, and each block
    // quotes exactly the figure its chip quotes — one read per lane, shared, so a
    // pill and the block it opens cannot disagree about the archive.
    //   THEY ARE LABELLED RATHER THAN MERGED, and not for layout reasons. An
    // unlabelled stack of two dollar figures under one 💰 heading is an invitation
    // to read the second as a continuation of the first, and the two are not even
    // the same kind of money: receipts passed through a committee under
    // contribution limits, disclosures are what somebody told a clerk they own.
    // The labels are the only thing standing between a reader and that sum.
    //   NO THIRD FIGURE. There is no combined total, no ratio between the blocks,
    // no "money score" over the pair, and no arithmetic anywhere in this function
    // that has both a receipts figure and a disclosure figure in it. Coverage
    // counts appear in BOTH blocks — they came off the chips when the second chip
    // joined the letterhead row, and a count with no denominator is worse on a
    // pill than it is missing.
    // The disclosures block, from the lane that owns it. Rendered through one
    // helper so BOTH branches of the section get it — a profile with no campaign
    // filing is not a profile with no disclosure question, and an empty-state
    // branch that quietly drops the second block is a reader being told the
    // question does not apply to this person.
    //   THE FALLBACK IS WORDS, NOT NOTHING. If finance-lane.js has not loaded,
    // the heading and the same missing-data sentence still print. A silently
    // absent block reads as "nothing to declare" — which is the exact failure the
    // always-rendering empty chip exists to prevent, and it would be reintroduced
    // here by a `? ... : ''`.
    function _pdxWealthBlock(pid, p) {
      var L = window.PDXFinanceLane;
      if (L && typeof L.wealthBlockHtml === 'function') {
        try {
          var html = L.wealthBlockHtml(pid, p);
          if (html) return html;
        } catch (e) {}
      }
      var who = (p && p.name) ? _pdxFEsc(String(p.name).split(' ')[0]) : 'this official';
      return '<span id="pdxsec-wealth" class="pdx-nav-anchor" aria-hidden="true"></span>'
        + '<div class="pdx-money-block" data-pdx-money-block="wealth" data-pdx-wealth-state="empty">'
        +   '<h4 class="pdx-money-block-h">Disclosures while serving</h4>'
        +   '<div class="pdx-money-block-fig is-none">No in-office wealth file on hand</div>'
        +   '<p class="pdx-money-block-s">PolitiDex holds no personal financial-disclosure form for '
        +     who + '. That is missing data on our side — it is not a disclosure of zero and it is '
        +     'not a finding about ' + who + '.</p>'
        + '</div>';
    }

    window._pdxFundingSection = function (pid, p) {
      p = p || {};
      var first = p.name ? String(p.name).split(' ')[0] : 'this official';
      var f = window._pdxFunding(pid);
      var head = '<span id="pdxsec-funding" class="pdx-nav-anchor" aria-hidden="true"></span>'
        + '<div class="modal-section pdx-fund" id="modal-funding">'
        + '<div class="modal-section-title pdx-money-h">'
        +   '<span class="pdx-money-h-ico">💰</span> Money &amp; Funding</div>';

      // ── THE EMPTY STATE IS COVERAGE COPY, AND IT NAMES THE GAP ──────────
      // This used to read "Not on file — No campaign-finance record for Lee YET.
      // This section fills in automatically as filings are added." Three problems,
      // and all three were about who the sentence was describing.
      //   "Yet" describes a queue. It tells a reader the file is on its way, which
      // implies somebody looked and the archive is still loading. For most of this
      // roster nobody has looked and no ingest is scheduled to look.
      //   "Fills in automatically" promised a pipeline that does not exist. There is
      // no live FEC ingest and Utah publishes no API; a curator transcribes filings
      // by hand. A promise the site cannot keep is worse than a blank.
      //   And it named no source, so the blank could not be told apart from a search
      // that came back clean. PDXFinanceLane.sourceGapHtml names the archive the
      // filing would have come from — the FEC, Utah's state disclosure system, or
      // plainly "none opened" — in one line, derived from the office string alone.
      // No donor, committee or figure is invented anywhere in this branch.
      if (!f) {
        var _gap = (window.PDXFinanceLane && typeof window.PDXFinanceLane.sourceGapHtml === 'function')
          ? window.PDXFinanceLane.sourceGapHtml(pid, p) : '';
        var _cov = (window.PDXFinanceLane && typeof window.PDXFinanceLane.coverageHtml === 'function')
          ? window.PDXFinanceLane.coverageHtml() : '';
        return head
          + '<p class="modal-section-sub">Who bankrolls ' + _pdxFEsc(first) + ' — from public disclosure filings. This is a coverage statement, not a finding.</p>'
          + '<div class="pdx-money-block" data-pdx-money-block="filings">'
          +   '<h4 class="pdx-money-block-h">Campaign filings</h4>'
          +   '<div class="pdx-fund-none">'
          +     '<div class="pdx-fund-none-ico">💰</div>'
          +     '<div><div class="pdx-fund-none-t">No money file on hand</div>'
          +     '<div class="pdx-fund-none-s">PolitiDex holds no itemized campaign-finance filing for '
          +       _pdxFEsc(first) + '. That is missing data on our side — it is not a finding about '
          +       _pdxFEsc(first) + ', and nothing here reads it as one.</div>'
          +     _gap + '</div>'
          +   '</div>'
          +   _cov
          + '</div>'
          + _pdxWealthBlock(pid, p)
          + '</div>';
      }

      // ── THE LEAD IS COMPOSITION AS COUNTS ───────────────────────────────
      // Deleted from this branch, deliberately:
      //
      //   THE DONOR-MIX WORD. `_pdxFundWord(kind)` printed "Grassroots" /
      // "Mixed" / "Big-money" in a pill with an explanatory line under it
      // ("Leans on named mega-donors, PACs and industries"). That is the retired
      // Constituents-First grade — its three levels, its cut-offs, its
      // characterisation of a person — surviving as prose after the arithmetic,
      // the colour ramp and the glyph ladder were each deleted in turn. A level
      // written in words is still a level, and this one led the money lane.
      //   ITS PERCENTAGE. `c.label` was "38% small-dollar" — a bare 0–100 on the
      // first line of the section, detached from the bucket it was a share of.
      // The shares are still published, one block down in the composition, each
      // one attached to its own bucket and its own dollar figure, which is the
      // only arrangement in which a percentage here is composition rather than a
      // grade.
      //   THE SIZE TIER. "Large war chest" above $10M and "Modest war chest"
      // below $500K is a three-step ranking of a dollar figure that is already
      // printed in full an inch away. The comment defending it said more money
      // "isn't a virtue, just context" — which is exactly the argument for
      // printing the figure and stopping.
      //
      // What leads instead is PDXFinanceLane.countsHtml: reported sources, named
      // contributors, industry sectors and self-funding, as counts, plus an
      // explicit line saying in-state vs out-of-state giving is absent from the
      // records we hold rather than absent from the filing.
      var _ftmRec = _FTM_BY_ID[pid] || null;
      var countsLead = (window.PDXFinanceLane && typeof window.PDXFinanceLane.countsHtml === 'function')
        ? window.PDXFinanceLane.countsHtml(f.signal, _ftmRec) : '';

      var topBlock = f.topFunder
        ? '<div class="pdx-fund-stat"><div class="pdx-fund-stat-label">Top Funder</div>'
          + '<div class="pdx-fund-top-name">' + _pdxFEsc(f.topFunder.name) + '</div>'
          + '<div class="pdx-fund-top-amt">' + _pdxFEsc(f.topFunder.amountFmt) + (f.topFunder.type ? ' · ' + _pdxFEsc(f.topFunder.type) : '') + '</div></div>'
        : '<div class="pdx-fund-stat"><div class="pdx-fund-stat-label">Top Funder</div><div class="pdx-fund-top-name pdx-fund-dim">Not itemized</div></div>';

      // Coverage rides in the filings block now as well as the empty state's. It
      // used to appear only where there was nothing on file, which is precisely
      // backwards: a reader looking at a real $8.6M composition is the reader most
      // likely to assume the other 1,107 people came back clean. And it is the
      // segment the letterhead pill gave up when the second chip joined the row,
      // so this is where it has to land.
      var _covOn = (window.PDXFinanceLane && typeof window.PDXFinanceLane.coverageHtml === 'function')
        ? window.PDXFinanceLane.coverageHtml() : '';

      return head
        + '<p class="modal-section-sub">Who bankrolls ' + _pdxFEsc(first) + ' — from public FEC / OpenSecrets filings. Donations are legal and don\'t imply corruption; this is about <em>who has financial access</em>.</p>'
        + '<div class="pdx-money-block" data-pdx-money-block="filings">'
        +   '<h4 class="pdx-money-block-h">Campaign filings</h4>'
        +   '<div class="pdx-fund-grid">'
        +     '<div class="pdx-fund-stat"><div class="pdx-fund-stat-label">Total Raised</div>'
        +       '<div class="pdx-fund-raised">' + _pdxFEsc(f.raisedFmt) + '</div></div>'
        +     topBlock
        +   '</div>'
        +   countsLead
        +   (f.signal ? window._pdxFinanceSignalHTML(f.signal) : '')
        +   (f.whyItMatters ? '<p class="pdx-fund-why"><strong>Why it matters:</strong> ' + _pdxFEsc(f.whyItMatters) + '</p>' : '')
        +   '<div class="pdx-fund-actions">'
        +     '<a class="pdx-fund-src" href="' + _pdxFAttr(f.source) + '" target="_blank" rel="noopener noreferrer">📄 FEC / OpenSecrets ↗</a>'
        //   THE ⚖️ COMPARE FUNDING BUTTON STOOD HERE, AND IT WAS THE ONE CONTROL
        //   IN THIS SECTION THAT LEFT THE PERSON FILE. It called _pdxCompareWith,
        //   which closes the open profile, adds this person to the compare
        //   selection, pulls in their race peers and opens the Compare tool — a
        //   cross-person compare launched from a filing block. The person file's
        //   money section is now two blocks and two doors: campaign filings as
        //   filed, and disclosures while serving. Composition, not standing; this
        //   person's filing, not this person against another's. A reader who
        //   wants a side-by-side still has /money and the Compare tool itself.
        //
        //   _pdxCompareWith IS DELIBERATELY STILL DEFINED BELOW. /money hides any
        //   .pdx-fund-cmp it finds rather than assuming none renders, and the
        //   Compare Hub is documented against that entry point, so the function
        //   stays as the one way in while nothing in shipped markup calls it.
        +   '</div>'
        +   _covOn
        + '</div>'
        + _pdxWealthBlock(pid, p)
        + '</div>';
    };

    // One-tap path from a funding indicator into a real side-by-side: select
    // this person, pull in their race peers (so the comparison isn't a dead-end
    // of one), and open the Compare tool. Closes any open profile modal first so
    // the Compare view is actually visible.
    window._pdxCompareWith = function (pid, ev) {
      if (ev && ev.stopPropagation) ev.stopPropagation();
      if (!pid) return;
      try { if (typeof window.closeModal === 'function') window.closeModal(); } catch (e) {}
      setTimeout(function () {
        try {
          if (window._cmpSelected && typeof window._cmpSelected.add === 'function') window._cmpSelected.add(pid);
          if (typeof window.cmpAddRacePeers === 'function') { try { window.cmpAddRacePeers(pid); } catch (e) {} }
          if (typeof window.openCompare === 'function') window.openCompare();
        } catch (e) {}
      }, 60);
    };

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', renderFTM);
    } else {
      renderFTM();
    }
  })();
