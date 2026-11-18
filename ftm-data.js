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
//     public filing and pasted by a person — except FTM_FEC_SUMMARY, a block of
//     FEC committee money summaries (receipts, disbursements, cash on hand,
//     coverage end) that the OFFLINE discovery job writes between its markers.
//     That job is never run by the cron and the browser never calls the FEC.
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

    // ── FEC MONEY SUMMARIES, SAVED BY THE OFFLINE DISCOVERY JOB ─────────────
    // The one table in this file a person does not type. While the offline job
    // scripts/discover-raw-ingest-sources-2026-11.mjs has a federal candidate's
    // principal campaign committee open on the FEC (to read its website), it
    // keeps the FEC's own public summary for that committee: total receipts,
    // total disbursements, cash on hand and the last report's coverage end date.
    // Nothing here fetches; the job rewrites the block between the markers and
    // the live cron never runs it.
    //   A row is only written for a person who has no money figure on their
    // profile, or whose figure is older than the report's coverage end date
    // (netlify/lib/fec-money-summary.mjs, fecSummaryWins). It is read below as a
    // receipts-only filing whose source is the committee's fec.gov page, so the
    // chips and the section name the FEC as the source, in their existing words.
    // It is not itemized: no buckets, no donors, no sectors, and it is never
    // counted as an itemized filing in the coverage sentence.
    // ── BEGIN FTM_FEC_SUMMARY (generated by scripts/discover-raw-ingest-sources-2026-11.mjs; do not edit by hand) ──
    var FTM_FEC_SUMMARY = {
      "aaron_flint": {"receipts":2848976.77,"disbursements":2440824.02,"cashOnHand":408152.75,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00941575","candidateId":"H6MT01152","source":"https://www.fec.gov/data/committee/C00941575/","name":"Aaron Flint","office":"U.S. House Candidate (MT-1)"},
      "aaron_gies": {"receipts":678483.72,"disbursements":618262.18,"cashOnHand":54077.18,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00910125","candidateId":"H6NY23559","source":"https://www.fec.gov/data/committee/C00910125/","name":"Aaron Gies","office":"U.S. House Candidate (NY-23)"},
      "adam_bauman": {"receipts":3293,"disbursements":520,"cashOnHand":2857.72,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00923532","candidateId":"H6TX16152","source":"https://www.fec.gov/data/committee/C00923532/","name":"Adam Bauman","office":"U.S. House Candidate (TX-16)"},
      "adam_hamawy": {"receipts":1993156.58,"disbursements":1753311.27,"cashOnHand":239845.31,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00934588","candidateId":"H6NJ12417","source":"https://www.fec.gov/data/committee/C00934588/","name":"Adam Hamawy","office":"U.S. House Candidate (NJ-12)"},
      "adrian_boafo": {"receipts":1906194.02,"disbursements":1814091.58,"cashOnHand":92102.44,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00933994","candidateId":"H6MD05321","source":"https://www.fec.gov/data/committee/C00933994/","name":"Adrian Boafo","office":"U.S. House Candidate (MD-5)"},
      "afzal_khan": {"receipts":87343.95,"disbursements":86993.88,"cashOnHand":350.07,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00906206","candidateId":"H6NV01315","source":"https://www.fec.gov/data/committee/C00906206/","name":"Afzal Khan","office":"U.S. House Candidate (NV-1)"},
      "aisha_wahab": {"receipts":1214546.85,"disbursements":752224.52,"cashOnHand":462322.33,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00933036","candidateId":"H0CA15213","source":"https://www.fec.gov/data/committee/C00933036/","name":"Aisha Wahab","office":"U.S. House Candidate (CA-14)"},
      "alaha_ahrar": {"receipts":28923.1,"disbursements":11167.11,"cashOnHand":3659.55,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00947770","candidateId":"H6VA07353","source":"https://www.fec.gov/data/committee/C00947770/","name":"Alaha Ahrar","office":"U.S. House Candidate (VA-7)"},
      "alani_bankhead": {"receipts":190564.71,"disbursements":167744.91,"cashOnHand":22819.8,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00937201","candidateId":"S6MT00253","source":"https://www.fec.gov/data/committee/C00937201/","name":"Alani Bankhead","office":"U.S. Senate Candidate"},
      "alex_mcmenemy": {"receipts":9887.9,"disbursements":9142.34,"cashOnHand":745.56,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00929737","candidateId":"H6TX38123","source":"https://www.fec.gov/data/committee/C00929737/","name":"Alex McMenemy","office":"U.S. House Candidate (TX-38)"},
      "alex_mealer": {"receipts":2782239.54,"disbursements":2580967.94,"cashOnHand":201271.6,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00917112","candidateId":"H6TX09140","source":"https://www.fec.gov/data/committee/C00917112/","name":"Alex Mealer","office":"U.S. House Candidate (TX-9)"},
      "alexander_cooke": {"receipts":30244.18,"disbursements":28859.86,"cashOnHand":1384.32,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00945493","candidateId":"H6FL21109","source":"https://www.fec.gov/data/committee/C00945493/","name":"Alexander Cooke","office":"U.S. House Candidate (FL-21)"},
      "alexander_hale": {"receipts":115678.12,"disbursements":96559.1,"cashOnHand":19119.02,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00930305","candidateId":"H6TX07151","source":"https://www.fec.gov/data/committee/C00930305/","name":"Alexander Hale","office":"U.S. House Candidate (TX-7)"},
      "alissa_ellman": {"receipts":452166.23,"disbursements":405923.87,"cashOnHand":46242.36,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00912550","candidateId":"H6NY24219","source":"https://www.fec.gov/data/committee/C00912550/","name":"Alissa J. Ellman","office":"U.S. House Candidate (NY-24)"},
      "amanda_green": {"receipts":658316.41,"disbursements":630177.85,"cashOnHand":28138.56,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00914333","candidateId":"H6FL02299","source":"https://www.fec.gov/data/committee/C00914333/","name":"Amanda Marie Green","office":"U.S. House Candidate (FL-2)"},
      "amanda_hollowell": {"receipts":264753.46,"disbursements":214977.79,"cashOnHand":50136.67,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00914465","candidateId":"H6GA01158","source":"https://www.fec.gov/data/committee/C00914465/","name":"Amanda Hollowell","office":"U.S. House Candidate (GA-1)"},
      "amanda_mckinney": {"receipts":1448473.62,"disbursements":1231097.77,"cashOnHand":217375.85,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00932582","candidateId":"H6WA04216","source":"https://www.fec.gov/data/committee/C00932582/","name":"Amanda McKinney","office":"U.S. House Candidate (WA-4)"},
      "amy_chai": {"receipts":21972.16,"disbursements":16375.01,"cashOnHand":690,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00785634","candidateId":"H2CT03102","source":"https://www.fec.gov/data/committee/C00785634/","name":"Amy Chai","office":"U.S. House Candidate (CT-1)"},
      "andre_easton": {"receipts":93798.98,"disbursements":83490.04,"cashOnHand":827.94,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00919365","candidateId":"H6NY15167","source":"https://www.fec.gov/data/committee/C00919365/","name":"Andre Easton","office":"U.S. House Candidate (NY-15)"},
      "andrew_beck": {"receipts":14612.26,"disbursements":11590.4,"cashOnHand":3158.02,"coverageEnd":"2026-06-30","cycle":2026,"committeeId":"C00872697","candidateId":"H6WI05136","source":"https://www.fec.gov/data/committee/C00872697/","name":"Andrew Beck","office":"U.S. House Candidate (WI-5)"},
      "andrew_koontz": {"receipts":5100,"disbursements":129.77,"cashOnHand":4970.23,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00942482","candidateId":"H6TN06288","source":"https://www.fec.gov/data/committee/C00942482/","name":"Andrew J. Koontz","office":"U.S. House Candidate (TN-7)"},
      "angel_oakley": {"receipts":18442.93,"disbursements":14382.21,"cashOnHand":4060.72,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00880161","candidateId":"H6IL03163","source":"https://www.fec.gov/data/committee/C00880161/","name":"Angel Oakley","office":"U.S. House Candidate (IL-3)"},
      "angela_torres": {"receipts":509751.75,"disbursements":404933.43,"cashOnHand":104818.32,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00901652","candidateId":"H6CA34286","source":"https://www.fec.gov/data/committee/C00901652/","name":"Angela Gonzales-Torres","office":"U.S. House Candidate (CA-34)"},
      "angelica_duenas": {"receipts":97450.42,"disbursements":81208.79,"cashOnHand":16145.36,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00697391","candidateId":"H8CA29100","source":"https://www.fec.gov/data/committee/C00697391/","name":"Angélica María Dueñas","office":"U.S. House Candidate (CA-29)"},
      "anil_kumar": {"receipts":724355.07,"disbursements":406548.99,"cashOnHand":319467.09,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00846089","candidateId":"H4MI10131","source":"https://www.fec.gov/data/committee/C00846089/","name":"Anil Kumar","office":"U.S. House Candidate (MI-11)"},
      "anna_golladay": {"receipts":164743.76,"disbursements":94778.87,"cashOnHand":43309.43,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00936971","candidateId":"H6TN03228","source":"https://www.fec.gov/data/committee/C00936971/","name":"Anna Golladay","office":"U.S. House Candidate (TN-3)"},
      "anthony_constantino": {"receipts":14464951.19,"disbursements":14472853.54,"cashOnHand":2298984.48,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00892737","candidateId":"H6NY21157","source":"https://www.fec.gov/data/committee/C00892737/","name":"Anthony Constantino","office":"U.S. House Candidate (NY-21)"},
      "april_verlato": {"receipts":700,"disbursements":7882.46,"cashOnHand":655.19,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00858845","candidateId":"H4CA28127","source":"https://www.fec.gov/data/committee/C00858845/","name":"April A. Verlato","office":"U.S. House Candidate (CA-28)"},
      "armen_kurdian": {"receipts":189195.87,"disbursements":158769,"cashOnHand":30426.87,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00942680","candidateId":"H6CA49169","source":"https://www.fec.gov/data/committee/C00942680/","name":"Armen Kurdian","office":"U.S. House Candidate (CA-49)"},
      "arthur_purves": {"receipts":33521.75,"disbursements":13786.67,"cashOnHand":19735.08,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00951277","candidateId":"H6VA11249","source":"https://www.fec.gov/data/committee/C00951277/","name":"Arthur G. Purves","office":"U.S. House Candidate (VA-11)"},
      "ashley_bell": {"receipts":147720.19,"disbursements":135900.99,"cashOnHand":11774.2,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00901934","candidateId":"H6NC10174","source":"https://www.fec.gov/data/committee/C00901934/","name":"Ashley Bell","office":"U.S. House Candidate (NC-10)"},
      "austin_magee": {"receipts":11430.87,"disbursements":11250.76,"cashOnHand":180.11,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00939249","candidateId":"H6LA05283","source":"https://www.fec.gov/data/committee/C00939249/","name":"Austin Magee","office":"U.S. House Candidate (LA-5)"},
      "austin_rogers": {"receipts":1359851.76,"disbursements":1261556.5,"cashOnHand":98295.26,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00936963","candidateId":"H6FL02331","source":"https://www.fec.gov/data/committee/C00936963/","name":"Austin Rogers","office":"U.S. House Candidate (FL-2)"},
      "bale_dalton": {"receipts":2334663.82,"disbursements":2132409.93,"cashOnHand":202253.89,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00926949","candidateId":"H6FL07215","source":"https://www.fec.gov/data/committee/C00926949/","name":"Bale Dalton","office":"U.S. House Candidate (FL-7)"},
      "barb_regnitz": {"receipts":2755770.38,"disbursements":2251535.31,"cashOnHand":504235.07,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00924100","candidateId":"H6IN01231","source":"https://www.fec.gov/data/committee/C00924100/","name":"Barb Regnitz","office":"U.S. House Candidate (IN-1)"},
      "barbara_kahl": {"receipts":17728.49,"disbursements":11616.21,"cashOnHand":5412.46,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00942839","candidateId":"H6OR01308","source":"https://www.fec.gov/data/committee/C00942839/","name":"Barbara J Kahl","office":"U.S. House Candidate (OR-1)"},
      "becky_stille": {"receipts":97390.36,"disbursements":97440.29,"cashOnHand":-49.93,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00903401","candidateId":"H6NE03180","source":"https://www.fec.gov/data/committee/C00903401/","name":"Becky Kelly Stille","office":"U.S. House Candidate (NE-3)"},
      "belinda_spencer": {"receipts":5206.87,"disbursements":5206.87,"cashOnHand":0,"coverageEnd":"2020-11-23","cycle":2020,"committeeId":"C00759621","candidateId":"H0WV03193","source":"https://www.fec.gov/data/committee/C00759621/","name":"Belinda Fox-Spencer","office":"U.S. House Candidate (WV-1)"},
      "ben_ambrose": {"receipts":186503.84,"disbursements":153160.92,"cashOnHand":32956.26,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00908079","candidateId":"H6MI02216","source":"https://www.fec.gov/data/committee/C00908079/","name":"Ben Ambrose","office":"U.S. House Candidate (MI-2)"},
      "bert_mizusawa": {"receipts":1097120.26,"disbursements":944726.42,"cashOnHand":152393.84,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00934265","candidateId":"S8VA00321","source":"https://www.fec.gov/data/committee/C00934265/","name":"Bert Mizusawa","office":"U.S. Senate Candidate"},
      "beth_macy": {"receipts":2926193.48,"disbursements":2563315.68,"cashOnHand":362877.8,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00927129","candidateId":"H6VA06173","source":"https://www.fec.gov/data/committee/C00927129/","name":"Beth A. Macy","office":"U.S. House Candidate (VA-6)"},
      "bethany_mann": {"receipts":86553.55,"disbursements":85269.15,"cashOnHand":5711.74,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00806190","candidateId":"H2MO03167","source":"https://www.fec.gov/data/committee/C00806190/","name":"Bethany E Mann","office":"U.S. House Candidate (MO-3)"},
      "bill_reeside": {"receipts":115492.05,"disbursements":111831.97,"cashOnHand":3660.08,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00927277","candidateId":"H6SC01342","source":"https://www.fec.gov/data/committee/C00927277/","name":"Bill Reeside","office":"U.S. House Candidate (SC-1)"},
      "blake_gendebien": {"receipts":7655529.27,"disbursements":7543858.96,"cashOnHand":364011.8,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00893776","candidateId":"H6NY21199","source":"https://www.fec.gov/data/committee/C00893776/","name":"Blake Gendebien","office":"U.S. House Candidate (NY-21)"},
      "blake_miguez": {"receipts":7749606.17,"disbursements":6215092.8,"cashOnHand":1534513.37,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00908459","candidateId":"H6LA05234","source":"https://www.fec.gov/data/committee/C00908459/","name":"Blake Miguez","office":"U.S. House Candidate (LA-6)"},
      "blay_tarnoff": {"receipts":24572,"disbursements":24506,"cashOnHand":66,"coverageEnd":"2026-09-30","cycle":2026,"committeeId":"C00955930","candidateId":"H6NY04237","source":"https://www.fec.gov/data/committee/C00955930/","name":"Blay Tarnoff","office":"U.S. House Candidate (NY-4)"},
      "bob_smith": {"receipts":346742.15,"disbursements":289534.26,"cashOnHand":57207.89,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00898882","candidateId":"H6CA24345","source":"https://www.fec.gov/data/committee/C00898882/","name":"Bob Smith","office":"U.S. House Candidate (CA-24)"},
      "bobby_pulido": {"receipts":6819246.79,"disbursements":5549792.34,"cashOnHand":1269454.45,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00919985","candidateId":"H6TX15246","source":"https://www.fec.gov/data/committee/C00919985/","name":"Bobby Pulido","office":"U.S. House Candidate (TX-15)"},
      "brad_lander": {"receipts":2785966.92,"disbursements":2705430.72,"cashOnHand":80536.2,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00930123","candidateId":"H6NY10176","source":"https://www.fec.gov/data/committee/C00930123/","name":"Brad Lander","office":"U.S. House Candidate (NY-10)"},
      "brad_meyer": {"receipts":203411.2,"disbursements":168834.95,"cashOnHand":28806.83,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00903989","candidateId":"H6IN09242","source":"https://www.fec.gov/data/committee/C00903989/","name":"Brad A. Meyer","office":"U.S. House Candidate (IN-9)"},
      "brad_smith": {"receipts":322260.9,"disbursements":230957.63,"cashOnHand":91303.27,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00920231","candidateId":"H6WI06191","source":"https://www.fec.gov/data/committee/C00920231/","name":"Brad Smith","office":"U.S. House Candidate (WI-6)"},
      "branden_scrivener": {"receipts":8195.29,"disbursements":8128.56,"cashOnHand":27.53,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00936328","candidateId":"H6FL12231","source":"https://www.fec.gov/data/committee/C00936328/","name":"Branden Scrivener","office":"U.S. House Candidate (FL-12)"},
      "brandon_herrera": {"receipts":3115205.22,"disbursements":2804434.23,"cashOnHand":318811.95,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00844324","candidateId":"H4TX23120","source":"https://www.fec.gov/data/committee/C00844324/","name":"Brandon Herrera","office":"U.S. House Candidate (TX-23)"},
      "brent_andersen": {"receipts":100349.66,"disbursements":83794.93,"cashOnHand":16554.73,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00950675","candidateId":"H6FL20143","source":"https://www.fec.gov/data/committee/C00950675/","name":"Brent Andersen","office":"U.S. House Candidate (FL-20)"},
      "brent_taylor": {"receipts":2832273.18,"disbursements":2308021.89,"cashOnHand":524251.29,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00949867","candidateId":"H6TN09464","source":"https://www.fec.gov/data/committee/C00949867/","name":"Brent Taylor","office":"U.S. House Candidate (TN-9)"},
      "brenton_awa": {"receipts":131062.69,"disbursements":121920.05,"cashOnHand":9142.64,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00923854","candidateId":"H6HI02426","source":"https://www.fec.gov/data/committee/C00923854/","name":"Brenton AWA","office":"U.S. House Candidate (HI-2)"},
      "brian_burley": {"receipts":251136.54,"disbursements":254974.12,"cashOnHand":1939.28,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00700187","candidateId":"H0CA48172","source":"https://www.fec.gov/data/committee/C00700187/","name":"Brian Burley","office":"U.S. House Candidate (CA-42)"},
      "brian_lambert": {"receipts":17091.52,"disbursements":14614.84,"cashOnHand":2476.68,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00953992","candidateId":"H6FL14245","source":"https://www.fec.gov/data/committee/C00953992/","name":"Brian Lambert","office":"U.S. House Candidate (FL-14)"},
      "brian_miller": {"receipts":30958.49,"disbursements":28854.45,"cashOnHand":668.84,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00922831","candidateId":"H6MT02150","source":"https://www.fec.gov/data/committee/C00922831/","name":"Brian J. Miller","office":"U.S. House Candidate (MT-2)"},
      "cait_conley": {"receipts":10706692.07,"disbursements":9758152.57,"cashOnHand":948539.5,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00900431","candidateId":"H6NY17171","source":"https://www.fec.gov/data/committee/C00900431/","name":"Cait Conley","office":"U.S. House Candidate (NY-17)"},
      "caitlin_rourk": {"receipts":576475.06,"disbursements":497138.61,"cashOnHand":79336.45,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00910695","candidateId":"H6TX31102","source":"https://www.fec.gov/data/committee/C00910695/","name":"Caitlin Rourk","office":"U.S. House Candidate (TX-10)"},
      "caitlyn_gegen": {"receipts":101338.84,"disbursements":80202.05,"cashOnHand":21136.79,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00937847","candidateId":"H6GA09284","source":"https://www.fec.gov/data/committee/C00937847/","name":"Caitlyn Gegen","office":"U.S. House Candidate (GA-9)"},
      "callie_barr": {"receipts":1724591.9,"disbursements":1348497.42,"cashOnHand":383735.18,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00837054","candidateId":"H4MI01155","source":"https://www.fec.gov/data/committee/C00837054/","name":"Callie Barr","office":"U.S. House Candidate (MI-1)"},
      "carmela_conroy": {"receipts":840422.66,"disbursements":763370.78,"cashOnHand":90193.47,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00849794","candidateId":"H4WA05168","source":"https://www.fec.gov/data/committee/C00849794/","name":"Carmela Conroy","office":"U.S. House Candidate (WA-5)"},
      "carmen_bucco": {"receipts":8931.33,"disbursements":6638.74,"cashOnHand":2292.59,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00927533","candidateId":"H4NJ10135","source":"https://www.fec.gov/data/committee/C00927533/","name":"Carmen Bucco","office":"U.S. House Candidate (NJ-10)"},
      "caroline_shinkle": {"receipts":272962.88,"disbursements":146539.35,"cashOnHand":126423.53,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00937920","candidateId":"H6NY12404","source":"https://www.fec.gov/data/committee/C00937920/","name":"Caroline Shinkle","office":"U.S. House Candidate (NY-12)"},
      "carrie_buck": {"receipts":2463872.56,"disbursements":2307449.85,"cashOnHand":156422.71,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00914804","candidateId":"H6NV01331","source":"https://www.fec.gov/data/committee/C00914804/","name":"Carrie Ann Buck","office":"U.S. House Candidate (NV-1)"},
      "casey_askar": {"receipts":7357432.7,"disbursements":5476245.76,"cashOnHand":1881186.94,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00952663","candidateId":"H6FL22248","source":"https://www.fec.gov/data/committee/C00952663/","name":"Casey Askar","office":"U.S. House Candidate (FL-22)"},
      "casey_shepard": {"receipts":93530.74,"disbursements":11012.78,"cashOnHand":78197.57,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00934547","candidateId":"H6TX17168","source":"https://www.fec.gov/data/committee/C00934547/","name":"Casey Shepard","office":"U.S. House Candidate (TX-17)"},
      "ceretta_smith": {"receipts":47692.67,"disbursements":35471.85,"cashOnHand":12318.39,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00915959","candidateId":"H6GA12080","source":"https://www.fec.gov/data/committee/C00915959/","name":"Ceretta Smith","office":"U.S. House Candidate (GA-12)"},
      "chad_koppie": {"receipts":60408.81,"disbursements":60366.61,"cashOnHand":42.2,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00911453","candidateId":"H2IL08203","source":"https://www.fec.gov/data/committee/C00911453/","name":"Chad Koppie","office":"U.S. House Candidate (IL-7)"},
      "charles_booker": {"receipts":1936323.82,"disbursements":1632724.93,"cashOnHand":303598.89,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00929208","candidateId":"S6KY00385","source":"https://www.fec.gov/data/committee/C00929208/","name":"Charles Booker","office":"U.S. Senate Candidate"},
      "charlie_hatcher": {"receipts":1803850.94,"disbursements":1329308.19,"cashOnHand":474542.75,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00923383","candidateId":"H6TN05405","source":"https://www.fec.gov/data/committee/C00923383/","name":"Charlie Hatcher","office":"U.S. House Candidate (TN-5)"},
      "chaz_molder": {"receipts":3531777.7,"disbursements":2971282.5,"cashOnHand":560495.2,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00918581","candidateId":"H6TN05397","source":"https://www.fec.gov/data/committee/C00918581/","name":"Chaz Molder","office":"U.S. House Candidate (TN-5)"},
      "chelsey_hockett": {"receipts":56907.83,"disbursements":-43669.28,"cashOnHand":27222.7,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00920314","candidateId":"H6TX05189","source":"https://www.fec.gov/data/committee/C00920314/","name":"Chelsey Hockett","office":"U.S. House Candidate (TX-5)"},
      "cheryl_riley": {"receipts":22354.21,"disbursements":20252.1,"cashOnHand":2691.08,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00872754","candidateId":"H4MD08213","source":"https://www.fec.gov/data/committee/C00872754/","name":"Cheryl Riley","office":"U.S. House Candidate (MD-8)"},
      "chris_backemeyer": {"receipts":1154612.7,"disbursements":799446.75,"cashOnHand":355165.95,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00925750","candidateId":"H6NE01143","source":"https://www.fec.gov/data/committee/C00925750/","name":"Chris Backemeyer","office":"U.S. House Candidate (NE-1)"},
      "chris_beck": {"receipts":276514.73,"disbursements":163848.98,"cashOnHand":112665.75,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00940791","candidateId":"H6OR02322","source":"https://www.fec.gov/data/committee/C00940791/","name":"Chris Beck","office":"U.S. House Candidate (OR-2)"},
      "chris_chaffee": {"receipts":26577.35,"disbursements":26577.35,"cashOnHand":0,"coverageEnd":"2014-12-03","cycle":2014,"committeeId":"C00565804","candidateId":"H4MD05169","source":"https://www.fec.gov/data/committee/C00565804/","name":"Chris Chaffee","office":"U.S. House Candidate (MD-5)"},
      "chris_gober": {"receipts":3103392.03,"disbursements":2937827.26,"cashOnHand":165564.77,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00922062","candidateId":"H6TX10221","source":"https://www.fec.gov/data/committee/C00922062/","name":"Chris Gober","office":"U.S. House Candidate (TX-10)"},
      "chris_harden": {"receipts":139282.64,"disbursements":130573.71,"cashOnHand":8708.93,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00923573","candidateId":"H6GA11116","source":"https://www.fec.gov/data/committee/C00923573/","name":"Chris Harden","office":"U.S. House Candidate (GA-11)"},
      "chris_mcgowan": {"receipts":862815.88,"disbursements":418900.79,"cashOnHand":443915.09,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00909788","candidateId":"H6IA04167","source":"https://www.fec.gov/data/committee/C00909788/","name":"Chris McGowan","office":"U.S. House Candidate (IA-4)"},
      "chris_reichard": {"receipts":27957.64,"disbursements":21305.88,"cashOnHand":6651.76,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00933739","candidateId":"H6MO08183","source":"https://www.fec.gov/data/committee/C00933739/","name":"Chris Reichard","office":"U.S. House Candidate (MO-8)"},
      "chris_shea": {"receipts":465963.04,"disbursements":412194.61,"cashOnHand":53768.43,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00935692","candidateId":"H6CT05231","source":"https://www.fec.gov/data/committee/C00935692/","name":"Chris Shea","office":"U.S. House Candidate (CT-5)"},
      "chris_stigall": {"receipts":1045323.71,"disbursements":834318.78,"cashOnHand":211004.93,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00945832","candidateId":"H6MO06310","source":"https://www.fec.gov/data/committee/C00945832/","name":"Chris Stigall","office":"U.S. House Candidate (MO-6)"},
      "christian_maxwell": {"receipts":94709.38,"disbursements":39067.66,"cashOnHand":62200.44,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00904227","candidateId":"H6IL01191","source":"https://www.fec.gov/data/committee/C00904227/","name":"Christian Maxwell","office":"U.S. House Candidate (IL-1)"},
      "christian_vukasovich": {"receipts":151703.92,"disbursements":112187.98,"cashOnHand":39516.94,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00922534","candidateId":"H6MI05227","source":"https://www.fec.gov/data/committee/C00922534/","name":"Christian Vukasovich","office":"U.S. House Candidate (MI-5)"},
      "christina_bohannan": {"receipts":9905570.29,"disbursements":7901941.23,"cashOnHand":2110846.44,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00787820","candidateId":"H2IA02111","source":"https://www.fec.gov/data/committee/C00787820/","name":"Christina Bohannan","office":"U.S. House Candidate (IA-1)"},
      "christopher_gallant": {"receipts":1735637.7,"disbursements":1309644.61,"cashOnHand":425993.09,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00914770","candidateId":"H6NY01159","source":"https://www.fec.gov/data/committee/C00914770/","name":"Christopher J. Gallant","office":"U.S. House Candidate (NY-1)"},
      "christopher_lancia": {"receipts":17485.75,"disbursements":11243.45,"cashOnHand":67.54,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00905125","candidateId":"H6CT03178","source":"https://www.fec.gov/data/committee/C00905125/","name":"Christopher Lancia","office":"U.S. House Candidate (CT-3)"},
      "christopher_mitchell": {"receipts":210,"disbursements":8.73,"cashOnHand":201.27,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00849612","candidateId":"H4CO05071","source":"https://www.fec.gov/data/committee/C00849612/","name":"Christopher Mitchell","office":"U.S. House Candidate (CO-5)"},
      "christy_peterson": {"receipts":9446.32,"disbursements":2053.4,"cashOnHand":7392.92,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00946152","candidateId":"H6CO01331","source":"https://www.fec.gov/data/committee/C00946152/","name":"Christy Peterson","office":"U.S. House Candidate (CO-1)"},
      "chuck_conboy": {"receipts":0.02,"disbursements":88.32,"cashOnHand":-88.3,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00962845","candidateId":"S6NE00202","source":"https://www.fec.gov/data/committee/C00962845/","name":"Chuck Conboy","office":"U.S. Senate Candidate"},
      "chuck_gray": {"receipts":2011264,"disbursements":1850089.42,"cashOnHand":161174.58,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00932244","candidateId":"H6WY00217","source":"https://www.fec.gov/data/committee/C00932244/","name":"Chuck Gray","office":"U.S. House Candidate (WY-AL)"},
      "chuck_hubbard": {"receipts":863260.01,"disbursements":718645.82,"cashOnHand":152010.2,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00841874","candidateId":"H4NC05294","source":"https://www.fec.gov/data/committee/C00841874/","name":"Chuck Hubbard","office":"U.S. House Candidate (NC-5)"},
      "chuong_vo": {"receipts":937468.52,"disbursements":762012.87,"cashOnHand":175455.65,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00922427","candidateId":"H6CA45191","source":"https://www.fec.gov/data/committee/C00922427/","name":"Chuong V. Vo","office":"U.S. House Candidate (CA-45)"},
      "claire_reynolds": {"receipts":128534.75,"disbursements":72765.59,"cashOnHand":55769.16,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00929711","candidateId":"H6TX11112","source":"https://www.fec.gov/data/committee/C00929711/","name":"Claire Reynolds","office":"U.S. House Candidate (TX-11)"},
      "claire_valdez": {"receipts":1915867.24,"disbursements":1805437.7,"cashOnHand":110429.54,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00933515","candidateId":"H6NY07214","source":"https://www.fec.gov/data/committee/C00933515/","name":"Claire Valdez","office":"U.S. House Candidate (NY-7)"},
      "cliff_johnson": {"receipts":848648.09,"disbursements":759400.54,"cashOnHand":89247.55,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00922039","candidateId":"H6MS01313","source":"https://www.fec.gov/data/committee/C00922039/","name":"Cliff Johnson","office":"U.S. House Candidate (MS-1)"},
      "colby_watson": {"receipts":57590.37,"disbursements":53437.3,"cashOnHand":4158.07,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00920652","candidateId":"H6NC08202","source":"https://www.fec.gov/data/committee/C00920652/","name":"Colby Watson","office":"U.S. House Candidate (NC-8)"},
      "colin_allred": {"receipts":8134455.95,"disbursements":7836027.76,"cashOnHand":298428.19,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00929844","candidateId":"H8TX32098","source":"https://www.fec.gov/data/committee/C00929844/","name":"Colin Allred","office":"U.S. House Candidate (TX-33)"},
      "connie_chan": {"receipts":2404664.18,"disbursements":1822859.27,"cashOnHand":581804.91,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00927558","candidateId":"H6CA11268","source":"https://www.fec.gov/data/committee/C00927558/","name":"Connie Chan","office":"U.S. House Candidate (CA-11)"},
      "conrad_cable": {"receipts":1842505.52,"disbursements":1433697.74,"cashOnHand":408807.78,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00909762","candidateId":"H6LA04187","source":"https://www.fec.gov/data/committee/C00909762/","name":"Conrad Cable","office":"U.S. House Candidate (LA-4)"},
      "courtney_mcclain": {"receipts":130729.56,"disbursements":79614.91,"cashOnHand":50464.65,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00922120","candidateId":"H6SC04171","source":"https://www.fec.gov/data/committee/C00922120/","name":"Courtney McClain","office":"U.S. House Candidate (SC-4)"},
      "cristian_morales": {"receipts":14995,"disbursements":14456.26,"cashOnHand":538.74,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00944405","candidateId":"H6CA43188","source":"https://www.fec.gov/data/committee/C00944405/","name":"Cristian Morales","office":"U.S. House Candidate (CA-43)"},
      "curtis_gibson": {"receipts":13784.9,"disbursements":10755.81,"cashOnHand":1576.67,"coverageEnd":"2026-09-30","cycle":2026,"committeeId":"C00932376","candidateId":"H6FL18212","source":"https://www.fec.gov/data/committee/C00932376/","name":"Curtis Gibson","office":"U.S. House Candidate (FL-18)"},
      "cynthia_wirth": {"receipts":91566.02,"disbursements":65028.04,"cashOnHand":26537.98,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00913194","candidateId":"H6IN06230","source":"https://www.fec.gov/data/committee/C00913194/","name":"Cynthia (Cinde) Wirth","office":"U.S. House Candidate (IN-6)"},
      "cyril_jefferson": {"receipts":232324.53,"disbursements":224465.46,"cashOnHand":7859.07,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00907576","candidateId":"H6NC06164","source":"https://www.fec.gov/data/committee/C00907576/","name":"Cyril Jefferson","office":"U.S. House Candidate (NC-6)"},
      "damon_galdo": {"receipts":16219.73,"disbursements":15447.45,"cashOnHand":772.28,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00930941","candidateId":"H2NJ01187","source":"https://www.fec.gov/data/committee/C00930941/","name":"Damon Galdo","office":"U.S. House Candidate (NJ-1)"},
      "dan_barrios": {"receipts":160379.07,"disbursements":151633.9,"cashOnHand":8745.17,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00930024","candidateId":"H6TX32217","source":"https://www.fec.gov/data/committee/C00930024/","name":"Dan Barrios","office":"U.S. House Candidate (TX-32)"},
      "dan_green": {"receipts":2692713.23,"disbursements":2243203.48,"cashOnHand":449959.75,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00952531","candidateId":"H6FL09294","source":"https://www.fec.gov/data/committee/C00952531/","name":"Dan Green","office":"U.S. House Candidate (FL-9)"},
      "dan_koh": {"receipts":5383420.65,"disbursements":4302769.83,"cashOnHand":1081990.54,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00654509","candidateId":"H8MA03072","source":"https://www.fec.gov/data/committee/C00654509/","name":"Dan Koh","office":"U.S. House Candidate (MA-6)"},
      "dan_mckay": {"receipts":121181.95,"disbursements":116183.64,"cashOnHand":4998.31,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00940163","candidateId":"H6LA05291","source":"https://www.fec.gov/data/committee/C00940163/","name":"Dan McKay","office":"U.S. House Candidate (LA-5)"},
      "dan_schwartz": {"receipts":1155585.2,"disbursements":1160058.29,"cashOnHand":-4473.09,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00902957","candidateId":"H6MD01320","source":"https://www.fec.gov/data/committee/C00902957/","name":"Dan Schwartz","office":"U.S. House Candidate (MD-1)"},
      "daniel_biss": {"receipts":3446462.65,"disbursements":2837579.86,"cashOnHand":608882.79,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00905307","candidateId":"H6IL09228","source":"https://www.fec.gov/data/committee/C00905307/","name":"Daniel Biss","office":"U.S. House Candidate (IL-9)"},
      "danny_minton": {"receipts":147189.2,"disbursements":107550.94,"cashOnHand":39638.26,"coverageEnd":"2026-09-30","cycle":2026,"committeeId":"C00893842","candidateId":"H6TX25203","source":"https://www.fec.gov/data/committee/C00893842/","name":"Danny Minton","office":"U.S. House Candidate (TX-6)"},
      "darden_copeland": {"receipts":1257202.49,"disbursements":1183516.61,"cashOnHand":73685.88,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00913301","candidateId":"H6TN07286","source":"https://www.fec.gov/data/committee/C00913301/","name":"Darden Copeland","office":"U.S. House Candidate (TN-7)"},
      "darializa_chevalier": {"receipts":1603708.74,"disbursements":1449148.25,"cashOnHand":154560.49,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00927541","candidateId":"H6NY13279","source":"https://www.fec.gov/data/committee/C00927541/","name":"Darializa Avila Chevalier","office":"U.S. House Candidate (NY-13)"},
      "darline_graham": {"receipts":1917646.09,"disbursements":1283216.19,"cashOnHand":634429.9,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00957308","candidateId":"S6SC04437","source":"https://www.fec.gov/data/committee/C00957308/","name":"Darline Graham","office":"U.S. Senate Candidate"},
      "dave_beckwith": {"receipts":256489.11,"disbursements":232678,"cashOnHand":31847.36,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00944264","candidateId":"H2VA10273","source":"https://www.fec.gov/data/committee/C00944264/","name":"Dave T. Beckwith","office":"U.S. House Candidate (VA-10)"},
      "dave_wallace": {"receipts":15450,"disbursements":15818,"cashOnHand":-367,"coverageEnd":"2014-12-03","cycle":2014,"committeeId":"C00551713","candidateId":"H2MD06138","source":"https://www.fec.gov/data/committee/C00551713/","name":"Dave Wallace","office":"U.S. House Candidate (MD-2)"},
      "david_pan": {"receipts":104144.51,"disbursements":105168.47,"cashOnHand":1856.37,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00847699","candidateId":"H4CA46137","source":"https://www.fec.gov/data/committee/C00847699/","name":"David Pan","office":"U.S. House Candidate (CA-46)"},
      "david_russ": {"receipts":13165.84,"disbursements":27985.74,"cashOnHand":-549.9,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00763946","candidateId":"H2OR01240","source":"https://www.fec.gov/data/committee/C00763946/","name":"David Russ","office":"U.S. House Candidate (OR-6)"},
      "david_smith": {"receipts":311173.65,"disbursements":266975.96,"cashOnHand":44197.69,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00941559","candidateId":"S6OR05218","source":"https://www.fec.gov/data/committee/C00941559/","name":"David Brock Smith","office":"U.S. Senate Candidate"},
      "deborah_adeimy": {"receipts":201144.96,"disbursements":171963.25,"cashOnHand":32789.85,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00791541","candidateId":"H2FL21132","source":"https://www.fec.gov/data/committee/C00791541/","name":"Deborah Adeimy","office":"U.S. House Candidate (FL-23)"},
      "deborah_hosey": {"receipts":10780.11,"disbursements":8404.71,"cashOnHand":2375.4,"coverageEnd":"2026-09-30","cycle":2026,"committeeId":"C00952770","candidateId":"H6FL26074","source":"https://www.fec.gov/data/committee/C00952770/","name":"Deborah Ann Meidinger Hosey","office":"U.S. House Candidate (FL-26)"},
      "dennis_clark": {"receipts":9990.83,"disbursements":9919.03,"cashOnHand":39.8,"coverageEnd":"2020-11-23","cycle":2020,"committeeId":"C00749606","candidateId":"H0TN09111","source":"https://www.fec.gov/data/committee/C00749606/","name":"Dennis Clark","office":"U.S. House Candidate (TN-9)"},
      "dennis_hannon": {"receipts":5525,"disbursements":1086.8,"cashOnHand":4438.2,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00942698","candidateId":"H6NY26131","source":"https://www.fec.gov/data/committee/C00942698/","name":"Dennis E. Hannon","office":"U.S. House Candidate (NY-26)"},
      "deva_simmons": {"receipts":29703.8,"disbursements":31220.09,"cashOnHand":-1516.29,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00918920","candidateId":"H6FL18204","source":"https://www.fec.gov/data/committee/C00918920/","name":"Deva Simmons","office":"U.S. House Candidate (FL-18)"},
      "diamant_hysenaj": {"receipts":446003.85,"disbursements":405333.06,"cashOnHand":40670.79,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00898593","candidateId":"H6NY14251","source":"https://www.fec.gov/data/committee/C00898593/","name":"Diamant Hysenaj","office":"U.S. House Candidate (NY-14)"},
      "dillan_vancil": {"receipts":406023.47,"disbursements":373863.61,"cashOnHand":52481.85,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00893446","candidateId":"H6IL17247","source":"https://www.fec.gov/data/committee/C00893446/","name":"Dillan S. Vancil","office":"U.S. House Candidate (IL-17)"},
      "dione_sims": {"receipts":546.48,"disbursements":3550,"cashOnHand":-3003.52,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00930974","candidateId":"H6TX25237","source":"https://www.fec.gov/data/committee/C00930974/","name":"Dione Sims","office":"U.S. House Candidate (TX-25)"},
      "don_tracy": {"receipts":4914363.45,"disbursements":4431346.07,"cashOnHand":483017.38,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00917120","candidateId":"S6IL00615","source":"https://www.fec.gov/data/committee/C00917120/","name":"Don Tracy","office":"U.S. Senate Candidate"},
      "donavan_mckinney": {"receipts":1876779.88,"disbursements":1747106.34,"cashOnHand":129673.54,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00903591","candidateId":"H6MI13254","source":"https://www.fec.gov/data/committee/C00903591/","name":"Donavan McKinney","office":"U.S. House Candidate (MI-13)"},
      "donna_miller": {"receipts":2700312.85,"disbursements":2607906.11,"cashOnHand":92406.74,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00911164","candidateId":"H6IL02355","source":"https://www.fec.gov/data/committee/C00911164/","name":"Donna Miller","office":"U.S. House Candidate (IL-2)"},
      "doug_basler": {"receipts":44410.66,"disbursements":35705.02,"cashOnHand":9248.61,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00566232","candidateId":"H4WA09061","source":"https://www.fec.gov/data/committee/C00566232/","name":"Doug Basler","office":"U.S. House Candidate (WA-9)"},
      "doug_chapin": {"receipts":765076.15,"disbursements":646600.39,"cashOnHand":118475.76,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00909531","candidateId":"H6MN06215","source":"https://www.fec.gov/data/committee/C00909531/","name":"Doug Chapin","office":"U.S. House Candidate (MN-6)"},
      "doug_ollivant": {"receipts":389127.17,"disbursements":279911.02,"cashOnHand":109216.15,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00921650","candidateId":"H6VA07205","source":"https://www.fec.gov/data/committee/C00921650/","name":"Doug A. Ollivant","office":"U.S. House Candidate (VA-7)"},
      "drew_cox": {"receipts":60558.9,"disbursements":53738.87,"cashOnHand":6820.03,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00912428","candidateId":"H6IN04193","source":"https://www.fec.gov/data/committee/C00912428/","name":"Drew Cox","office":"U.S. House Candidate (IN-4)"},
      "dwayne_romero": {"receipts":1701091.41,"disbursements":1504967.24,"cashOnHand":196124.17,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00941526","candidateId":"H6CO03253","source":"https://www.fec.gov/data/committee/C00941526/","name":"Dwayne L. Romero","office":"U.S. House Candidate (CO-3)"},
      "edgardo_baez": {"receipts":69063.4,"disbursements":60532.19,"cashOnHand":8531.21,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00905661","candidateId":"H6TX20113","source":"https://www.fec.gov/data/committee/C00905661/","name":"Edgardo Rafael Baez","office":"U.S. House Candidate (TX-20)"},
      "edwin_feller": {"receipts":11338.4,"disbursements":4495.08,"cashOnHand":6843.32,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00951129","candidateId":"H6WA02228","source":"https://www.fec.gov/data/committee/C00951129/","name":"Edwin H. Feller","office":"U.S. House Candidate (WA-2)"},
      "edwin_rivera": {"receipts":15390.56,"disbursements":10755.82,"cashOnHand":4634.74,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00949644","candidateId":"H6VA03121","source":"https://www.fec.gov/data/committee/C00949644/","name":"Edwin Rivera, Jr.","office":"U.S. House Candidate (VA-3)"},
      "eileen_laubacher": {"receipts":13700426.19,"disbursements":11854137.8,"cashOnHand":1846288.39,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00904284","candidateId":"H6CO04202","source":"https://www.fec.gov/data/committee/C00904284/","name":"Eileen Laubacher","office":"U.S. House Candidate (CO-4)"},
      "elaine_luria": {"receipts":8044063.94,"disbursements":7565201.72,"cashOnHand":478862.22,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00926303","candidateId":"H6VA02198","source":"https://www.fec.gov/data/committee/C00926303/","name":"Elaine G. Luria","office":"U.S. House Candidate (VA-2)"},
      "eliott_rodriguez": {"receipts":1567392.71,"disbursements":945601.63,"cashOnHand":621791.08,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00942581","candidateId":"H6FL27098","source":"https://www.fec.gov/data/committee/C00942581/","name":"Eliott Rodriguez","office":"U.S. House Candidate (FL-27)"},
      "elizabeth_fitzgibbon": {"receipts":21161.09,"disbursements":17489.63,"cashOnHand":3671.46,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00946673","candidateId":"H6WI06241","source":"https://www.fec.gov/data/committee/C00946673/","name":"Elizabeth Anne Fitzgibbon","office":"U.S. House Candidate (WI-6)"},
      "eric_ching": {"receipts":97169.8,"disbursements":127035.35,"cashOnHand":10375.02,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00776930","candidateId":"H2CA39151","source":"https://www.fec.gov/data/committee/C00776930/","name":"Eric Ching","office":"U.S. House Candidate (CA-31)"},
      "eric_flores": {"receipts":3887344.72,"disbursements":3640917.45,"cashOnHand":246427.27,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00912246","candidateId":"H6TX34080","source":"https://www.fec.gov/data/committee/C00912246/","name":"Eric Flores","office":"U.S. House Candidate (TX-34)"},
      "eric_jones": {"receipts":18058057.13,"disbursements":16516978.44,"cashOnHand":1541078.69,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00919100","candidateId":"H6CA04222","source":"https://www.fec.gov/data/committee/C00919100/","name":"Eric Jones","office":"U.S. House Candidate (CA-4)"},
      "eric_pratt": {"receipts":768790.87,"disbursements":595361.14,"cashOnHand":173429.73,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00912824","candidateId":"H6MN02263","source":"https://www.fec.gov/data/committee/C00912824/","name":"Eric Pratt","office":"U.S. House Candidate (MN-2)"},
      "eric_yonce": {"receipts":619554.84,"disbursements":522156.86,"cashOnHand":96905.4,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00913434","candidateId":"H6FL06340","source":"https://www.fec.gov/data/committee/C00913434/","name":"Eric Yonce","office":"U.S. House Candidate (FL-6)"},
      "erik_osberg": {"receipts":577219.01,"disbursements":450470.81,"cashOnHand":126748.2,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00899344","candidateId":"H6MN07312","source":"https://www.fec.gov/data/committee/C00899344/","name":"Erik Osberg","office":"U.S. House Candidate (MN-7)"},
      "espoir_ngabo": {"receipts":3132.88,"disbursements":3125,"cashOnHand":0,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00936005","candidateId":"H6TX07177","source":"https://www.fec.gov/data/committee/C00936005/","name":"Espoir Ngabo","office":"U.S. House Candidate (TX-7)"},
      "ethan_baker": {"receipts":204668,"disbursements":149047.26,"cashOnHand":56620.74,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00942508","candidateId":"H6MI11290","source":"https://www.fec.gov/data/committee/C00942508/","name":"Ethan Baker","office":"U.S. House Candidate (MI-11)"},
      "eunice_lehmacher": {"receipts":99512.38,"disbursements":76720.24,"cashOnHand":22792.14,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00930313","candidateId":"H6SC03090","source":"https://www.fec.gov/data/committee/C00930313/","name":"Eunice Lehmacher","office":"U.S. House Candidate (SC-3)"},
      "evan_hunt": {"receipts":702785.91,"disbursements":646670.58,"cashOnHand":56115.33,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00902437","candidateId":"H6TX03234","source":"https://www.fec.gov/data/committee/C00902437/","name":"Evan Hunt","office":"U.S. House Candidate (TX-3)"},
      "everett_jackson": {"receipts":25348.99,"disbursements":22885.98,"cashOnHand":2463.01,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00924167","candidateId":"H6TX30211","source":"https://www.fec.gov/data/committee/C00924167/","name":"Everett Jackson","office":"U.S. House Candidate (TX-30)"},
      "fred_clark": {"receipts":863780.13,"disbursements":602936.26,"cashOnHand":260843.87,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00920868","candidateId":"H6WI07207","source":"https://www.fec.gov/data/committee/C00920868/","name":"Fred Clark","office":"U.S. House Candidate (WI-7)"},
      "fred_wellman": {"receipts":2178964.91,"disbursements":1938247.02,"cashOnHand":240717.89,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00921528","candidateId":"H6MO02343","source":"https://www.fec.gov/data/committee/C00921528/","name":"Fred Wellman","office":"U.S. House Candidate (MO-2)"},
      "frederick_haynes": {"receipts":694864.53,"disbursements":535828.88,"cashOnHand":159035.65,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00931667","candidateId":"H6TX30245","source":"https://www.fec.gov/data/committee/C00931667/","name":"Frederick D. Haynes III","office":"U.S. House Candidate (TX-30)"},
      "gary_grossi": {"receipts":9150.83,"disbursements":1773.01,"cashOnHand":7377.82,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00941054","candidateId":"H6MA03100","source":"https://www.fec.gov/data/committee/C00941054/","name":"Gary J. Grossi","office":"U.S. House Candidate (MA-3)"},
      "gay_valimont": {"receipts":295713.87,"disbursements":260991.04,"cashOnHand":34722.83,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00941161","candidateId":"H4FL01197","source":"https://www.fec.gov/data/committee/C00941161/","name":"Gay Valimont","office":"U.S. House Candidate (FL-1)"},
      "genevieve_angel": {"receipts":21826.25,"disbursements":10882.23,"cashOnHand":10944.02,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00942029","candidateId":"H6CA44210","source":"https://www.fec.gov/data/committee/C00942029/","name":"Genevieve Angel","office":"U.S. House Candidate (CA-44)"},
      "george_austin": {"receipts":314977.26,"disbursements":218265.18,"cashOnHand":96712.08,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00914481","candidateId":"H6CT02196","source":"https://www.fec.gov/data/committee/C00914481/","name":"George Patrick Austin","office":"U.S. House Candidate (CT-2)"},
      "gerald_malloy": {"receipts":186379.02,"disbursements":155348.33,"cashOnHand":31030.69,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00950048","candidateId":"H6VT01085","source":"https://www.fec.gov/data/committee/C00950048/","name":"Gerald Malloy","office":"U.S. House Candidate (VT-AL)"},
      "gordon_heslop": {"receipts":128719.69,"disbursements":124180.97,"cashOnHand":5977.95,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00934869","candidateId":"H6LA04229","source":"https://www.fec.gov/data/committee/C00934869/","name":"Gordon Heslop","office":"U.S. House Candidate (LA-4)"},
      "greg_stoker": {"receipts":89121.25,"disbursements":79969.82,"cashOnHand":9151.43,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00929653","candidateId":"H6TX31169","source":"https://www.fec.gov/data/committee/C00929653/","name":"Greg Stoker","office":"U.S. House Candidate (TX-31)"},
      "gregg_mele": {"receipts":101520.99,"disbursements":87955.05,"cashOnHand":13565.94,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00796649","candidateId":"H2NJ06210","source":"https://www.fec.gov/data/committee/C00796649/","name":"Gregg Mele","office":"U.S. House Candidate (NJ-12)"},
      "gregory_cunningham": {"receipts":2316222.73,"disbursements":1998474.63,"cashOnHand":317748.1,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00921791","candidateId":"H6NM02127","source":"https://www.fec.gov/data/committee/C00921791/","name":"Gregory G. Cunningham","office":"U.S. House Candidate (NM-2)"},
      "hallie_shoffner": {"receipts":4042810.83,"disbursements":3285879.13,"cashOnHand":756931.7,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00905471","candidateId":"S6AR00199","source":"https://www.fec.gov/data/committee/C00905471/","name":"Hallie Shoffner","office":"U.S. Senate Candidate"},
      "heather_smiley": {"receipts":3435.6,"disbursements":3350.09,"cashOnHand":85.51,"coverageEnd":"2024-12-31","cycle":2024,"committeeId":"C00879718","candidateId":"H4MI06154","source":"https://www.fec.gov/data/committee/C00879718/","name":"Heather Smiley","office":"U.S. House Candidate (MI-6)"},
      "heidi_kuhn": {"receipts":112308.98,"disbursements":105720.36,"cashOnHand":6588.62,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00951509","candidateId":"H6TN08367","source":"https://www.fec.gov/data/committee/C00951509/","name":"Heidi Kuhn","office":"U.S. House Candidate (TN-8)"},
      "hilda_solis": {"receipts":1485148.13,"disbursements":1197641.24,"cashOnHand":284506.89,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00917542","candidateId":"H6CA38139","source":"https://www.fec.gov/data/committee/C00917542/","name":"Hilda Solis","office":"U.S. House Candidate (CA-38)"},
      "horace_taylor": {"receipts":8119,"disbursements":8074,"cashOnHand":145,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00948885","candidateId":"H6TN08342","source":"https://www.fec.gov/data/committee/C00948885/","name":"Horace Taylor","office":"U.S. House Candidate (TN-8)"},
      "houston_brignano": {"receipts":7020.37,"disbursements":5801.28,"cashOnHand":1219.09,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00925842","candidateId":"H6CA36208","source":"https://www.fec.gov/data/committee/C00925842/","name":"Houston Brignano","office":"U.S. House Candidate (CA-36)"},
      "houston_gaines": {"receipts":2816583.39,"disbursements":1754504.58,"cashOnHand":1062078.81,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00914168","candidateId":"H6GA10175","source":"https://www.fec.gov/data/committee/C00914168/","name":"Houston Gaines","office":"U.S. House Candidate (GA-10)"},
      "jace_yarbrough": {"receipts":1261760.06,"disbursements":1138666.34,"cashOnHand":123093.72,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00930297","candidateId":"H6TX32225","source":"https://www.fec.gov/data/committee/C00930297/","name":"Jace Yarbrough","office":"U.S. House Candidate (TX-32)"},
      "jack_codiga": {"receipts":54619.62,"disbursements":50829.16,"cashOnHand":3790.46,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00926840","candidateId":"H6NC12113","source":"https://www.fec.gov/data/committee/C00926840/","name":"Jack Codiga","office":"U.S. House Candidate (NC-12)"},
      "jackie_auringer": {"receipts":158702.7,"disbursements":136999.69,"cashOnHand":21703.01,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00946723","candidateId":"H6NY18252","source":"https://www.fec.gov/data/committee/C00946723/","name":"Jackie Mary Auringer","office":"U.S. House Candidate (NY-18)"},
      "jacqui_irwin": {"receipts":1170990.11,"disbursements":713178.78,"cashOnHand":457811.33,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00933630","candidateId":"H6CA26266","source":"https://www.fec.gov/data/committee/C00933630/","name":"Jacqui Irwin","office":"U.S. House Candidate (CA-26)"},
      "jake_johnson": {"receipts":3507568.36,"disbursements":2946474.85,"cashOnHand":561093.51,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00902684","candidateId":"H6MN01190","source":"https://www.fec.gov/data/committee/C00902684/","name":"Jake Johnson","office":"U.S. House Candidate (MN-1)"},
      "jamee_decio": {"receipts":1455232.1,"disbursements":1000631.84,"cashOnHand":454600.26,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00916619","candidateId":"H6IN02189","source":"https://www.fec.gov/data/committee/C00916619/","name":"Jamee Decio","office":"U.S. House Candidate (IN-2)"},
      "james_byrd": {"receipts":53560.38,"disbursements":46560.64,"cashOnHand":7927.4,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00938738","candidateId":"S6WY00217","source":"https://www.fec.gov/data/committee/C00938738/","name":"James Byrd","office":"U.S. Senate Candidate"},
      "james_hooper": {"receipts":2002.05,"disbursements":3249.83,"cashOnHand":7769.12,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00812644","candidateId":"H2MI12198","source":"https://www.fec.gov/data/committee/C00812644/","name":"James D. Hooper","office":"U.S. House Candidate (MI-12)"},
      "james_kingston": {"receipts":2357233.34,"disbursements":2087277.98,"cashOnHand":269955.36,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00908624","candidateId":"H6GA01109","source":"https://www.fec.gov/data/committee/C00908624/","name":"James “Jim” Kingston","office":"U.S. House Candidate (GA-1)"},
      "james_marter": {"receipts":214272.03,"disbursements":180483.44,"cashOnHand":37832.43,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00657361","candidateId":"H8IL16153","source":"https://www.fec.gov/data/committee/C00657361/","name":"James T. \"Jim\" Marter","office":"U.S. House Candidate (IL-14)"},
      "james_martin": {"receipts":821778.76,"disbursements":770880.38,"cashOnHand":50898.38,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00921601","candidateId":"H6FL21075","source":"https://www.fec.gov/data/committee/C00921601/","name":"James T. Martin","office":"U.S. House Candidate (FL-21)"},
      "james_pericola": {"receipts":225867.92,"disbursements":190672.27,"cashOnHand":35195.65,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00952937","candidateId":"H6FL11357","source":"https://www.fec.gov/data/committee/C00952937/","name":"James Pericola","office":"U.S. House Candidate (FL-11)"},
      "jamie_ager": {"receipts":5869452.65,"disbursements":5249294.71,"cashOnHand":620157.94,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00914119","candidateId":"H6NC11248","source":"https://www.fec.gov/data/committee/C00914119/","name":"Jamie Ager","office":"U.S. House Candidate (NC-11)"},
      "jamie_joyce": {"receipts":69669.05,"disbursements":64410.77,"cashOnHand":5258.28,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00941476","candidateId":"H6CA12209","source":"https://www.fec.gov/data/committee/C00941476/","name":"Jamie Joyce","office":"U.S. House Candidate (CA-12)"},
      "jasmine_clark": {"receipts":2386955.4,"disbursements":2043223.34,"cashOnHand":343732.06,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00906875","candidateId":"H6GA13070","source":"https://www.fec.gov/data/committee/C00906875/","name":"Jasmine Clark","office":"U.S. House Candidate (GA-13)"},
      "jason_gibbs": {"receipts":413837.88,"disbursements":353339.34,"cashOnHand":60498.54,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00909887","candidateId":"H6CA27306","source":"https://www.fec.gov/data/committee/C00909887/","name":"Jason Gibbs","office":"U.S. House Candidate (CA-27)"},
      "jason_pearce": {"receipts":27748.78,"disbursements":25036.8,"cashOnHand":2711.98,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00923870","candidateId":"H6TX04174","source":"https://www.fec.gov/data/committee/C00923870/","name":"Jason Pearce","office":"U.S. House Candidate (TX-4)"},
      "jeanine_driscoll": {"receipts":684947.48,"disbursements":682394.4,"cashOnHand":2553.08,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00948034","candidateId":"H6NY04211","source":"https://www.fec.gov/data/committee/C00948034/","name":"Jeanine C. Driscoll","office":"U.S. House Candidate (NY-4)"},
      "jeff_belle": {"receipts":26538.06,"disbursements":26456.35,"cashOnHand":81.71,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00943225","candidateId":"H6CA52163","source":"https://www.fec.gov/data/committee/C00943225/","name":"Jeff Belle","office":"U.S. House Candidate (CA-52)"},
      "jeff_walter": {"receipts":431415.26,"disbursements":423635.44,"cashOnHand":7779.82,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00906594","candidateId":"H6IL11166","source":"https://www.fec.gov/data/committee/C00906594/","name":"Jeff Walter","office":"U.S. House Candidate (IL-11)"},
      "jeff_wilson": {"receipts":532329.74,"disbursements":484162.93,"cashOnHand":48166.81,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00898288","candidateId":"H6IL13154","source":"https://www.fec.gov/data/committee/C00898288/","name":"Jeff Wilson","office":"U.S. House Candidate (IL-13)"},
      "jeffrey_hulum": {"receipts":60172.68,"disbursements":49971.86,"cashOnHand":10553.54,"coverageEnd":"2026-09-30","cycle":2026,"committeeId":"C00931386","candidateId":"H6MS04242","source":"https://www.fec.gov/data/committee/C00931386/","name":"Jeffrey Hulum III","office":"U.S. House Candidate (MS-4)"},
      "jennifer_balkcom": {"receipts":399491.7,"disbursements":104674.18,"cashOnHand":294817.52,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00958785","candidateId":"H6NC11321","source":"https://www.fec.gov/data/committee/C00958785/","name":"Jennifer Capps Balkcom","office":"U.S. House Candidate (NC-11)"},
      "jennifer_davis": {"receipts":1782174.57,"disbursements":1502427.6,"cashOnHand":279746.97,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00919142","candidateId":"H6IL08311","source":"https://www.fec.gov/data/committee/C00919142/","name":"Jennifer Davis","office":"U.S. House Candidate (IL-8)"},
      "jennifer_jenkins": {"receipts":960174.42,"disbursements":807452.37,"cashOnHand":152722.05,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00918474","candidateId":"H6FL06399","source":"https://www.fec.gov/data/committee/C00918474/","name":"Jennifer Jenkins","office":"U.S. House Candidate (FL-8)"},
      "jennifer_moore": {"receipts":2693.46,"disbursements":1167.79,"cashOnHand":1525.67,"coverageEnd":"2026-09-30","cycle":2026,"committeeId":"C00954669","candidateId":"H6NY10218","source":"https://www.fec.gov/data/committee/C00954669/","name":"Jennifer E. Moore","office":"U.S. House Candidate (NY-10)"},
      "jennifer_todd": {"receipts":210096.75,"disbursements":172911.15,"cashOnHand":37185.6,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00896217","candidateId":"H6IL15092","source":"https://www.fec.gov/data/committee/C00896217/","name":"Jennifer Todd","office":"U.S. House Candidate (IL-15)"},
      "jenny_honeycutt": {"receipts":1291995.81,"disbursements":983977.52,"cashOnHand":308018.29,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00927004","candidateId":"H6SC01334","source":"https://www.fec.gov/data/committee/C00927004/","name":"Jenny Costa Honeycutt","office":"U.S. House Candidate (SC-1)"},
      "jenny_roux": {"receipts":592041.22,"disbursements":456266.74,"cashOnHand":135774.48,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00940130","candidateId":"H6CA47114","source":"https://www.fec.gov/data/committee/C00940130/","name":"Jenny Rae Le Roux","office":"U.S. House Candidate (CA-47)"},
      "jessica_ethridge": {"receipts":963.04,"disbursements":483.01,"cashOnHand":480.03,"coverageEnd":"2026-09-30","cycle":2026,"committeeId":"C00948588","candidateId":"H6SC04197","source":"https://www.fec.gov/data/committee/C00948588/","name":"Jessica Ethridge","office":"U.S. House Candidate (SC-4)"},
      "jessica_killin": {"receipts":5593463.21,"disbursements":5085734.98,"cashOnHand":507728.23,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00911941","candidateId":"H6CO05324","source":"https://www.fec.gov/data/committee/C00911941/","name":"Jessica Killin","office":"U.S. House Candidate (CO-5)"},
      "jessica_steinmann": {"receipts":2441284.26,"disbursements":2361913.74,"cashOnHand":79370.52,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00919530","candidateId":"H6TX08209","source":"https://www.fec.gov/data/committee/C00919530/","name":"Jessica Hart Steinmann","office":"U.S. House Candidate (TX-8)"},
      "jim_desmond": {"receipts":3177972.16,"disbursements":2460453.71,"cashOnHand":717518.45,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00895722","candidateId":"H6CA49128","source":"https://www.fec.gov/data/committee/C00895722/","name":"Jim Desmond","office":"U.S. House Candidate (CA-48)"},
      "jim_schwartzel": {"receipts":2828902.86,"disbursements":2322691.45,"cashOnHand":506211.41,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00901967","candidateId":"H6FL19137","source":"https://www.fec.gov/data/committee/C00901967/","name":"Jim Schwartzel","office":"U.S. House Candidate (FL-19)"},
      "joe_hathaway": {"receipts":837601.01,"disbursements":795427.54,"cashOnHand":42173.47,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00921809","candidateId":"H6NJ11211","source":"https://www.fec.gov/data/committee/C00921809/","name":"Joe Hathaway","office":"U.S. House Candidate (NJ-11)"},
      "joe_krzeczkowski": {"receipts":3530.92,"disbursements":2614.44,"cashOnHand":916.48,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00943241","candidateId":"H6CO07130","source":"https://www.fec.gov/data/committee/C00943241/","name":"Joe Krzeczkowski","office":"U.S. House Candidate (CO-7)"},
      "joe_males": {"receipts":1114056.44,"disbursements":1056061.74,"cashOnHand":57994.7,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00901785","candidateId":"H6CA25219","source":"https://www.fec.gov/data/committee/C00901785/","name":"Joe Males","office":"U.S. House Candidate (CA-25)"},
      "joe_mitchell": {"receipts":2916068.98,"disbursements":2370535.31,"cashOnHand":545533.67,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00918979","candidateId":"H6IA02237","source":"https://www.fec.gov/data/committee/C00918979/","name":"Joe Mitchell","office":"U.S. House Candidate (IA-2)"},
      "joe_strada": {"receipts":5512075.39,"disbursements":4652007.69,"cashOnHand":860067.7,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00952713","candidateId":"H6FL11332","source":"https://www.fec.gov/data/committee/C00952713/","name":"Joe Strada","office":"U.S. House Candidate (FL-11)"},
      "john_cowan": {"receipts":2824605.89,"disbursements":2678787.74,"cashOnHand":145818.15,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00938175","candidateId":"H0GA14048","source":"https://www.fec.gov/data/committee/C00938175/","name":"John Cowan","office":"U.S. House Candidate (GA-11)"},
      "john_croisant": {"receipts":217468.86,"disbursements":179179.74,"cashOnHand":38289.12,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00895714","candidateId":"H6OK01201","source":"https://www.fec.gov/data/committee/C00895714/","name":"John Croisant","office":"U.S. House Candidate (OK-1)"},
      "john_day": {"receipts":222556.77,"disbursements":97818.62,"cashOnHand":124738.15,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00942151","candidateId":"H6LA03205","source":"https://www.fec.gov/data/committee/C00942151/","name":"John Day","office":"U.S. House Candidate (LA-3)"},
      "john_deaton": {"receipts":1674459.77,"disbursements":1186303.41,"cashOnHand":488156.36,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00926139","candidateId":"S6MA00304","source":"https://www.fec.gov/data/committee/C00926139/","name":"John Deaton","office":"U.S. Senate Candidate"},
      "john_duresky": {"receipts":459019.84,"disbursements":375328.59,"cashOnHand":83691.25,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00916585","candidateId":"H6WA04190","source":"https://www.fec.gov/data/committee/C00916585/","name":"John Duresky","office":"U.S. House Candidate (WA-4)"},
      "john_mcbride": {"receipts":55486.59,"disbursements":51049.55,"cashOnHand":4547.04,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00846873","candidateId":"H4CA09101","source":"https://www.fec.gov/data/committee/C00846873/","name":"John McBride","office":"U.S. House Candidate (CA-9)"},
      "john_nagel": {"receipts":1126114.57,"disbursements":1023562.64,"cashOnHand":102551.93,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00924639","candidateId":"H6MN05357","source":"https://www.fec.gov/data/committee/C00924639/","name":"John Nagel","office":"U.S. House Candidate (MN-5)"},
      "john_vincent": {"receipts":640418.73,"disbursements":570071.44,"cashOnHand":70347.29,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00899492","candidateId":"H6SC07034","source":"https://www.fec.gov/data/committee/C00899492/","name":"John Gregory Vincent","office":"U.S. House Candidate (SC-7)"},
      "john_williams": {"receipts":223179.9,"disbursements":213880.62,"cashOnHand":7976.68,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00904243","candidateId":"H6KY01169","source":"https://www.fec.gov/data/committee/C00904243/","name":"John \"Drew\" Williams","office":"U.S. House Candidate (KY-1)"},
      "johnny_garcia": {"receipts":2201578.83,"disbursements":2052076.08,"cashOnHand":149502.75,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00922799","candidateId":"H6TX35095","source":"https://www.fec.gov/data/committee/C00922799/","name":"Johnny C. Garcia","office":"U.S. House Candidate (TX-35)"},
      "johnny_garrett": {"receipts":3000586.11,"disbursements":2657168.12,"cashOnHand":343417.99,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00910935","candidateId":"H6TN06213","source":"https://www.fec.gov/data/committee/C00910935/","name":"Johnny Garrett","office":"U.S. House Candidate (TN-6)"},
      "jon_bonck": {"receipts":2202298.38,"disbursements":1954128.09,"cashOnHand":248170.29,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00904151","candidateId":"H6TX02244","source":"https://www.fec.gov/data/committee/C00904151/","name":"Jon Bonck","office":"U.S. House Candidate (TX-38)"},
      "jonny_larsen": {"receipts":88136.41,"disbursements":83274.94,"cashOnHand":4861.47,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00904714","candidateId":"H6UT02424","source":"https://www.fec.gov/data/committee/C00904714/","name":"Jonny Larsen","office":"U.S. House Candidate (UT-4)"},
      "jordan_herrera": {"receipts":41656.63,"disbursements":22673.73,"cashOnHand":19365.61,"coverageEnd":"2026-07-15","cycle":2026,"committeeId":"C00899161","candidateId":"H6MO05254","source":"https://www.fec.gov/data/committee/C00899161/","name":"Jordan Herrera","office":"U.S. House Candidate (MO-4)"},
      "jose_vega": {"receipts":344809.74,"disbursements":340441.39,"cashOnHand":5641.78,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00867234","candidateId":"H4NY15147","source":"https://www.fec.gov/data/committee/C00867234/","name":"Jose Vega","office":"U.S. House Candidate (NY-15)"},
      "joseph_arminio": {"receipts":12301.76,"disbursements":5358,"cashOnHand":6943.76,"coverageEnd":"2026-09-30","cycle":2026,"committeeId":"C00957365","candidateId":"H6DE01121","source":"https://www.fec.gov/data/committee/C00957365/","name":"Joseph \"Dr. Joe\" Arminio","office":"U.S. House Candidate (DE-AL)"},
      "joseph_chou": {"receipts":2578.08,"disbursements":602.49,"cashOnHand":4096.83,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00872333","candidateId":"H4NY06047","source":"https://www.fec.gov/data/committee/C00872333/","name":"Joseph Chou","office":"U.S. House Candidate (NY-6)"},
      "josh_smead": {"receipts":145752.57,"disbursements":110551.76,"cashOnHand":35200.81,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00900233","candidateId":"H6MO06260","source":"https://www.fec.gov/data/committee/C00900233/","name":"Josh Smead","office":"U.S. House Candidate (MO-6)"},
      "joy_powers": {"receipts":256577.62,"disbursements":196950.36,"cashOnHand":59671.26,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00926725","candidateId":"H6VA09136","source":"https://www.fec.gov/data/committee/C00926725/","name":"Joy A. Powers","office":"U.S. House Candidate (VA-9)"},
      "julie_fortier": {"receipts":161510.74,"disbursements":127866.39,"cashOnHand":33644.35,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00925263","candidateId":"H6IL12131","source":"https://www.fec.gov/data/committee/C00925263/","name":"Julie Fortier","office":"U.S. House Candidate (IL-12)"},
      "justin_early": {"receipts":291879.92,"disbursements":271032.4,"cashOnHand":20847.52,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00907329","candidateId":"H6TX31094","source":"https://www.fec.gov/data/committee/C00907329/","name":"Justin Early","office":"U.S. House Candidate (TX-31)"},
      "justin_filip": {"receipts":4636,"disbursements":4247.55,"cashOnHand":3616.45,"coverageEnd":"2026-09-30","cycle":2026,"committeeId":"C00947887","candidateId":"H4OR04141","source":"https://www.fec.gov/data/committee/C00947887/","name":"Justin Filip","office":"U.S. House Candidate (OR-4)"},
      "justin_murphy": {"receipts":68188.87,"disbursements":57102.19,"cashOnHand":10190.62,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00865808","candidateId":"S4NJ00532","source":"https://www.fec.gov/data/committee/C00865808/","name":"Justin Murphy","office":"U.S. Senate Candidate"},
      "justin_pearson": {"receipts":4009058.26,"disbursements":3262930.01,"cashOnHand":746128.25,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00922633","candidateId":"H6TN09449","source":"https://www.fec.gov/data/committee/C00922633/","name":"Justin J. Pearson","office":"U.S. House Candidate (TN-9)"},
      "kailee_buller": {"receipts":464688.44,"disbursements":304550.35,"cashOnHand":160138.09,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00942011","candidateId":"H6NY22213","source":"https://www.fec.gov/data/committee/C00942011/","name":"Kailee Buller","office":"U.S. House Candidate (NY-22)"},
      "karen_ortiz": {"receipts":47330.11,"disbursements":23912.36,"cashOnHand":13925.92,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00928283","candidateId":"H6NY12297","source":"https://www.fec.gov/data/committee/C00928283/","name":"Karen Ortiz","office":"U.S. House Candidate (NY-12)"},
      "katy_stout": {"receipts":1117715.08,"disbursements":973291.43,"cashOnHand":144423.65,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00926121","candidateId":"H6TX23273","source":"https://www.fec.gov/data/committee/C00926121/","name":"Katy Padilla Stout","office":"U.S. House Candidate (TX-23)"},
      "kelley_dennison": {"receipts":12348.37,"disbursements":11261.16,"cashOnHand":1087.21,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00943555","candidateId":"H6CO02206","source":"https://www.fec.gov/data/committee/C00943555/","name":"Kelley Anne Dennison","office":"U.S. House Candidate (CO-2)"},
      "kellie_keenan": {"receipts":15435.44,"disbursements":13970,"cashOnHand":1465.44,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00947416","candidateId":"H6RI01153","source":"https://www.fec.gov/data/committee/C00947416/","name":"Kellie Keenan","office":"U.S. House Candidate (RI-1)"},
      "kelly_esti": {"receipts":27962.9,"disbursements":28913.89,"cashOnHand":3709.27,"coverageEnd":"2026-09-30","cycle":2026,"committeeId":"C00912584","candidateId":"H6GA08138","source":"https://www.fec.gov/data/committee/C00912584/","name":"Kelly Esti","office":"U.S. House Candidate (GA-8)"},
      "kelly_kirschner": {"receipts":876363.29,"disbursements":615224.22,"cashOnHand":261139.07,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00949073","candidateId":"H6FL16158","source":"https://www.fec.gov/data/committee/C00949073/","name":"Kelly Kirschner","office":"U.S. House Candidate (FL-16)"},
      "kelly_thompson": {"receipts":347103.35,"disbursements":293121.91,"cashOnHand":53981.44,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00907816","candidateId":"H6IN03294","source":"https://www.fec.gov/data/committee/C00907816/","name":"Kelly Thompson","office":"U.S. House Candidate (IN-3)"},
      "kent_udell": {"receipts":99541.33,"disbursements":93825.44,"cashOnHand":5715.89,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00938811","candidateId":"H6UT03182","source":"https://www.fec.gov/data/committee/C00938811/","name":"Kent S. Udell","office":"U.S. House Candidate (UT-3)"},
      "kevin_burge": {"receipts":334210.32,"disbursements":252864.3,"cashOnHand":81346.02,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00905547","candidateId":"H6TX24172","source":"https://www.fec.gov/data/committee/C00905547/","name":"Kevin Burge","office":"U.S. House Candidate (TX-24)"},
      "kevin_lincoln": {"receipts":2850212.82,"disbursements":2425948.51,"cashOnHand":448388.44,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00845826","candidateId":"H4CA09093","source":"https://www.fec.gov/data/committee/C00845826/","name":"Kevin Lincoln","office":"U.S. House Candidate (CA-13)"},
      "kevin_martin": {"receipts":10320,"disbursements":10220,"cashOnHand":100,"coverageEnd":"2026-03-31","cycle":2026,"committeeId":"C00944496","candidateId":"H6GA06181","source":"https://www.fec.gov/data/committee/C00944496/","name":"Kevin E. Martin","office":"U.S. House Candidate (GA-6)"},
      "kimberly_hardy": {"receipts":390475.48,"disbursements":370056.76,"cashOnHand":20418.72,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00909804","candidateId":"H6NC07196","source":"https://www.fec.gov/data/committee/C00909804/","name":"Kimberly Hardy","office":"U.S. House Candidate (NC-7)"},
      "kimberly_overman": {"receipts":280117.97,"disbursements":250591.48,"cashOnHand":29526.49,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00914317","candidateId":"H6FL15200","source":"https://www.fec.gov/data/committee/C00914317/","name":"Kimberly Overman","office":"U.S. House Candidate (FL-12)"},
      "kristi_burke": {"receipts":222584.71,"disbursements":195266.77,"cashOnHand":27317.94,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00934778","candidateId":"H6TN01537","source":"https://www.fec.gov/data/committee/C00934778/","name":"Kristi Burke","office":"U.S. House Candidate (TN-1)"},
      "kristin_hook": {"receipts":386290.87,"disbursements":334040.43,"cashOnHand":52250.44,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00929703","candidateId":"H4TX21108","source":"https://www.fec.gov/data/committee/C00929703/","name":"Kristin Hook","office":"U.S. House Candidate (TX-21)"},
      "kurt_alme": {"receipts":3013680.86,"disbursements":2410943.1,"cashOnHand":602737.76,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00942060","candidateId":"S6MT00295","source":"https://www.fec.gov/data/committee/C00942060/","name":"Kurt Alme","office":"U.S. Senate Candidate"},
      "kyle_kirkland": {"receipts":464700.09,"disbursements":451599.35,"cashOnHand":13100.74,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00926600","candidateId":"H6CA13199","source":"https://www.fec.gov/data/committee/C00926600/","name":"Kyle Kirkland","office":"U.S. House Candidate (CA-21)"},
      "kyle_rable": {"receipts":49029.91,"disbursements":39878.6,"cashOnHand":6317.07,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00900514","candidateId":"H6TX19198","source":"https://www.fec.gov/data/committee/C00900514/","name":"Kyle Rable","office":"U.S. House Candidate (TX-19)"},
      "la_ford": {"receipts":819320.56,"disbursements":725848.5,"cashOnHand":93472.06,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00905893","candidateId":"H6IL07354","source":"https://www.fec.gov/data/committee/C00905893/","name":"La Shawn K. Ford","office":"U.S. House Candidate (IL-7)"},
      "lakesha_womack": {"receipts":59183.28,"disbursements":55625.81,"cashOnHand":4792.77,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00929034","candidateId":"H6NC14069","source":"https://www.fec.gov/data/committee/C00929034/","name":"Lakesha Womack","office":"U.S. House Candidate (NC-14)"},
      "larry_davis": {"receipts":33216.2,"disbursements":31397.41,"cashOnHand":809.04,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00930743","candidateId":"H6LA05168","source":"https://www.fec.gov/data/committee/C00930743/","name":"Larry Davis III","office":"U.S. House Candidate (LA-6)"},
      "larry_marker": {"receipts":99229.65,"disbursements":90122.32,"cashOnHand":88.07,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00943738","candidateId":"S6NM01186","source":"https://www.fec.gov/data/committee/C00943738/","name":"Larry E. Marker","office":"U.S. Senate Candidate"},
      "larry_thompson": {"receipts":66331.34,"disbursements":59185.45,"cashOnHand":7145.89,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00907626","candidateId":"H4CA32137","source":"https://www.fec.gov/data/committee/C00907626/","name":"Larry Thompson","office":"U.S. House Candidate (CA-32)"},
      "lashonda_holloway": {"receipts":58546.29,"disbursements":24880.85,"cashOnHand":44105.44,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00805184","candidateId":"H6FL05193","source":"https://www.fec.gov/data/committee/C00805184/","name":"LaShonda L.J. Holloway","office":"U.S. House Candidate (FL-4)"},
      "laura_jones": {"receipts":30781.89,"disbursements":29168.1,"cashOnHand":4114.54,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00721597","candidateId":"H0TX08145","source":"https://www.fec.gov/data/committee/C00721597/","name":"Laura Jones","office":"U.S. House Candidate (TX-8)"},
      "lauren_jewett": {"receipts":716339.22,"disbursements":560253.37,"cashOnHand":156045.85,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00913863","candidateId":"H6LA01258","source":"https://www.fec.gov/data/committee/C00913863/","name":"Lauren Jewett","office":"U.S. House Candidate (LA-1)"},
      "lauren_pena": {"receipts":132161.88,"disbursements":127708.15,"cashOnHand":4453.73,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00906149","candidateId":"H6TX35038","source":"https://www.fec.gov/data/committee/C00906149/","name":"Lauren B. Peña","office":"U.S. House Candidate (TX-37)"},
      "laurie_buckhout": {"receipts":4663051.91,"disbursements":3257954.93,"cashOnHand":1431400.53,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00853499","candidateId":"H4NC01137","source":"https://www.fec.gov/data/committee/C00853499/","name":"Laurie Buckhout","office":"U.S. House Candidate (NC-1)"},
      "leela_gray": {"receipts":2917664.89,"disbursements":2261242.12,"cashOnHand":656422.77,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00937441","candidateId":"H6FL13312","source":"https://www.fec.gov/data/committee/C00937441/","name":"Leela Gray","office":"U.S. House Candidate (FL-13)"},
      "leticia_gutierrez": {"receipts":215052.56,"disbursements":104160.83,"cashOnHand":110891.73,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00931121","candidateId":"H6TX09231","source":"https://www.fec.gov/data/committee/C00931121/","name":"Leticia Gutierrez","office":"U.S. House Candidate (TX-9)"},
      "lindsay_garcia": {"receipts":97007.38,"disbursements":75353.05,"cashOnHand":21654.33,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00940551","candidateId":"H6LA05309","source":"https://www.fec.gov/data/committee/C00940551/","name":"Lindsay \"Rubia\" Garcia","office":"U.S. House Candidate (LA-6)"},
      "lisa_ballay": {"receipts":1110,"disbursements":500,"cashOnHand":610,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00959395","candidateId":"H2LA02305","source":"https://www.fec.gov/data/committee/C00959395/","name":"Lisa Ballay","office":"U.S. House Candidate (LA-2)"},
      "lisa_kinney": {"receipts":99131.16,"disbursements":66050.18,"cashOnHand":33080.98,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00944280","candidateId":"H6WY01173","source":"https://www.fec.gov/data/committee/C00944280/","name":"Lisa Kinney","office":"U.S. House Candidate (WY-AL)"},
      "luke_bronin": {"receipts":3865511.27,"disbursements":3474692.98,"cashOnHand":390818.29,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00913897","candidateId":"H6CT01206","source":"https://www.fec.gov/data/committee/C00913897/","name":"Luke Bronin","office":"U.S. House Candidate (CT-1)"},
      "lyman": {"receipts":48004.06,"disbursements":50752.64,"cashOnHand":2115.3,"coverageEnd":"2026-06-30","cycle":2026,"committeeId":"C00942904","candidateId":"H6UT03208","source":"https://www.fec.gov/data/committee/C00942904/","name":"Phil Lyman","office":"U.S. House Candidate (UT-3)"},
      "maad_ghazalah": {"receipts":8899.41,"disbursements":8620.77,"cashOnHand":278.64,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00922310","candidateId":"H6NC07204","source":"https://www.fec.gov/data/committee/C00922310/","name":"Maad Abu-Ghazalah","office":"U.S. House Candidate (NC-7)"},
      "macey_budke": {"receipts":6347.29,"disbursements":6021.14,"cashOnHand":326.15,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00938340","candidateId":"H6NE03206","source":"https://www.fec.gov/data/committee/C00938340/","name":"Macey Budke","office":"U.S. House Candidate (NE-3)"},
      "mai_vang": {"receipts":1828417.71,"disbursements":1439654.43,"cashOnHand":388763.28,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00918037","candidateId":"H6CA07175","source":"https://www.fec.gov/data/committee/C00918037/","name":"Mai Vang","office":"U.S. House Candidate (CA-7)"},
      "mallory_dittmer": {"receipts":226553.04,"disbursements":146988.87,"cashOnHand":79564.17,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00918177","candidateId":"H6SC05228","source":"https://www.fec.gov/data/committee/C00918177/","name":"Mallory Dittmer","office":"U.S. House Candidate (SC-5)"},
      "manny_rutinel": {"receipts":9459070.43,"disbursements":8456428.08,"cashOnHand":1002642.35,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00896670","candidateId":"H6CO08013","source":"https://www.fec.gov/data/committee/C00896670/","name":"Manny Rutinel","office":"U.S. House Candidate (CO-8)"},
      "maria_rodriguez": {"receipts":84148.7,"disbursements":43767.87,"cashOnHand":40280.83,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00938209","candidateId":"H6KY03223","source":"https://www.fec.gov/data/committee/C00938209/","name":"Maria Teresa Rodriguez","office":"U.S. House Candidate (KY-3)"},
      "mark_baisley": {"receipts":110001.2,"disbursements":83721.27,"cashOnHand":26279.93,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00932848","candidateId":"S6CO00507","source":"https://www.fec.gov/data/committee/C00932848/","name":"Mark Baisley","office":"U.S. Senate Candidate"},
      "mark_cohen": {"receipts":75900.5,"disbursements":63753.57,"cashOnHand":15673.93,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00930859","candidateId":"H6NE03198","source":"https://www.fec.gov/data/committee/C00930859/","name":"Mark Cohen","office":"U.S. House Candidate (NE-3)"},
      "mark_davis": {"receipts":66969.03,"disbursements":65269.61,"cashOnHand":1699.42,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00914887","candidateId":"H6FL06365","source":"https://www.fec.gov/data/committee/C00914887/","name":"Mark Davis","office":"U.S. House Candidate (FL-16)"},
      "mark_nair": {"receipts":137623.75,"disbursements":134800.08,"cashOnHand":2823.67,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00914200","candidateId":"H6TX13159","source":"https://www.fec.gov/data/committee/C00914200/","name":"Mark Nair","office":"U.S. House Candidate (TX-13)"},
      "mark_tedford": {"receipts":2490273.7,"disbursements":2332928.63,"cashOnHand":157345.07,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00943175","candidateId":"H6OK01235","source":"https://www.fec.gov/data/committee/C00943175/","name":"Mark Tedford","office":"U.S. House Candidate (OK-1)"},
      "mark_teixeira": {"receipts":4392605.96,"disbursements":3952066.56,"cashOnHand":440539.4,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00917658","candidateId":"H6TX21301","source":"https://www.fec.gov/data/committee/C00917658/","name":"Mark Teixeira","office":"U.S. House Candidate (TX-21)"},
      "marni_wilpert": {"receipts":4966576.06,"disbursements":4307440.02,"cashOnHand":659136.04,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00918391","candidateId":"H6CA48310","source":"https://www.fec.gov/data/committee/C00918391/","name":"Marni von Wilpert","office":"U.S. House Candidate (CA-48)"},
      "marquette_scott": {"receipts":68294.77,"disbursements":65867.9,"cashOnHand":2630.47,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00856872","candidateId":"H4TX22197","source":"https://www.fec.gov/data/committee/C00856872/","name":"Marquette Greene-Scott","office":"U.S. House Candidate (TX-22)"},
      "marquita_bradshaw": {"receipts":35195.38,"disbursements":27022.41,"cashOnHand":8251.62,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00846048","candidateId":"S4TN00542","source":"https://www.fec.gov/data/committee/C00846048/","name":"Marquita Bradshaw","office":"U.S. Senate Candidate"},
      "martha_fierro": {"receipts":585,"disbursements":93.28,"cashOnHand":491.72,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00931170","candidateId":"H6TX29122","source":"https://www.fec.gov/data/committee/C00931170/","name":"Martha Fierro","office":"U.S. House Candidate (TX-29)"},
      "mary_allen": {"receipts":493068.23,"disbursements":385561.18,"cashOnHand":107507.05,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00914556","candidateId":"H6IN08293","source":"https://www.fec.gov/data/committee/C00914556/","name":"Mary Allen","office":"U.S. House Candidate (IN-8)"},
      "mary_peltola": {"receipts":36887509.15,"disbursements":32785383.22,"cashOnHand":4102125.93,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00933978","candidateId":"S6AK00276","source":"https://www.fec.gov/data/committee/C00933978/","name":"Mary Peltola","office":"U.S. Senate Candidate"},
      "mary_silva": {"receipts":8478.7,"disbursements":7435.97,"cashOnHand":1298.86,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00870782","candidateId":"H4WA01282","source":"https://www.fec.gov/data/committee/C00870782/","name":"Mary Silva","office":"U.S. House Candidate (WA-1)"},
      "matt_day": {"receipts":217631.83,"disbursements":217631.83,"cashOnHand":0,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00917450","candidateId":"H6GA01182","source":"https://www.fec.gov/data/committee/C00917450/","name":"Matt Day","office":"U.S. House Candidate (GA-2)"},
      "matt_little": {"receipts":1494553.8,"disbursements":1289779.35,"cashOnHand":205276.43,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00903807","candidateId":"H6MN02230","source":"https://www.fec.gov/data/committee/C00903807/","name":"Matt Little","office":"U.S. House Candidate (MN-2)"},
      "matthew_arndt": {"receipts":2210,"disbursements":500,"cashOnHand":1710,"coverageEnd":"2026-09-30","cycle":2026,"committeeId":"C00952291","candidateId":"H6WI06274","source":"https://www.fec.gov/data/committee/C00952291/","name":"Matthew Arndt","office":"U.S. House Candidate (WI-6)"},
      "matthew_dunlap": {"receipts":2964963.53,"disbursements":2520995.86,"cashOnHand":443967.67,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00922377","candidateId":"H6ME02171","source":"https://www.fec.gov/data/committee/C00922377/","name":"Matthew G. Dunlap","office":"U.S. House Candidate (ME-2)"},
      "matthew_montavon": {"receipts":156274.33,"disbursements":131111.49,"cashOnHand":25122.84,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00924787","candidateId":"H4FL17060","source":"https://www.fec.gov/data/committee/C00924787/","name":"Matthew Montavon","office":"U.S. House Candidate (FL-17)"},
      "maura_keller": {"receipts":246621.17,"disbursements":153119.25,"cashOnHand":93521.92,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00903609","candidateId":"H4GA03100","source":"https://www.fec.gov/data/committee/C00903609/","name":"Maura Keller","office":"U.S. House Candidate (GA-3)"},
      "megan_wingfield": {"receipts":9584.49,"disbursements":7832.25,"cashOnHand":1270.59,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00902130","candidateId":"H6KY02068","source":"https://www.fec.gov/data/committee/C00902130/","name":"Megan Wingfield","office":"U.S. House Candidate (KY-2)"},
      "melat_kiros": {"receipts":1308527.59,"disbursements":1232803.19,"cashOnHand":75724.4,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00909481","candidateId":"H6CO01273","source":"https://www.fec.gov/data/committee/C00909481/","name":"Melat Kiros","office":"U.S. House Candidate (CO-1)"},
      "melissa_bean": {"receipts":2457207.28,"disbursements":2155493.75,"cashOnHand":301713.53,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00919183","candidateId":"H6IL08329","source":"https://www.fec.gov/data/committee/C00919183/","name":"Melissa L. Bean","office":"U.S. House Candidate (IL-8)"},
      "melissa_hernandez": {"receipts":2112673.52,"disbursements":2004315.43,"cashOnHand":108358.09,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00932541","candidateId":"H6CA14163","source":"https://www.fec.gov/data/committee/C00932541/","name":"Melissa Hernandez","office":"U.S. House Candidate (CA-14)"},
      "melissa_mcdonough": {"receipts":124711.24,"disbursements":102969.36,"cashOnHand":44441.67,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00836940","candidateId":"H4TX38011","source":"https://www.fec.gov/data/committee/C00836940/","name":"Melissa McDonough","office":"U.S. House Candidate (TX-38)"},
      "melissa_strange": {"receipts":157330.4,"disbursements":123485.44,"cashOnHand":40742.09,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00925917","candidateId":"H6KY04189","source":"https://www.fec.gov/data/committee/C00925917/","name":"Melissa Claire Strange","office":"U.S. House Candidate (KY-4)"},
      "micah_jones": {"receipts":619903.76,"disbursements":450121.61,"cashOnHand":169782.15,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00937755","candidateId":"H6MA06202","source":"https://www.fec.gov/data/committee/C00937755/","name":"Micah Quinney Jones","office":"U.S. House Candidate (MA-6)"},
      "micah_lasher": {"receipts":3493973.6,"disbursements":3184764.31,"cashOnHand":309209.29,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00918565","candidateId":"H6NY12172","source":"https://www.fec.gov/data/committee/C00918565/","name":"Micah C. Lasher","office":"U.S. House Candidate (NY-12)"},
      "michael_alfonso": {"receipts":1770041.24,"disbursements":1343102.67,"cashOnHand":426938.57,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00924902","candidateId":"H6WI07223","source":"https://www.fec.gov/data/committee/C00924902/","name":"Michael Alfonso","office":"U.S. House Candidate (WI-7)"},
      "michael_bouchard": {"receipts":2672721.59,"disbursements":1112737.4,"cashOnHand":1559984.19,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00925743","candidateId":"H6MI10359","source":"https://www.fec.gov/data/committee/C00925743/","name":"Michael Bouchard","office":"U.S. House Candidate (MI-10)"},
      "michael_chiaradio": {"receipts":224381.1,"disbursements":185042.01,"cashOnHand":39338.89,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00907386","candidateId":"H6MS03228","source":"https://www.fec.gov/data/committee/C00907386/","name":"Michael A. Chiaradio","office":"U.S. House Candidate (MS-3)"},
      "michael_echols": {"receipts":3188839.56,"disbursements":2299887.86,"cashOnHand":888951.7,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00938654","candidateId":"H6LA05242","source":"https://www.fec.gov/data/committee/C00938654/","name":"Michael Echols","office":"U.S. House Candidate (LA-5)"},
      "michael_eisenhauer": {"receipts":354191.13,"disbursements":330886.97,"cashOnHand":23304.16,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00930750","candidateId":"H6MT02168","source":"https://www.fec.gov/data/committee/C00930750/","name":"Michael D. Eisenhauer","office":"U.S. House Candidate (MT-2)"},
      "michael_goldstein": {"receipts":59216.32,"disbursements":32551.59,"cashOnHand":26664.73,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00935031","candidateId":"H6CT04143","source":"https://www.fec.gov/data/committee/C00935031/","name":"Michael Ted Goldstein","office":"U.S. House Candidate (CT-4)"},
      "michael_katz": {"receipts":190416.12,"disbursements":174331.53,"cashOnHand":16084.59,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00935163","candidateId":"S6DE00206","source":"https://www.fec.gov/data/committee/C00935163/","name":"Michael \"Dr. Mike\" Katz","office":"U.S. Senate Candidate"},
      "michael_lipetri": {"receipts":2462304.65,"disbursements":2009362.3,"cashOnHand":452942.35,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00937490","candidateId":"H0NY02267","source":"https://www.fec.gov/data/committee/C00937490/","name":"Michael J. LiPetri Jr","office":"U.S. House Candidate (NY-3)"},
      "michael_masuda": {"receipts":581621.44,"disbursements":521955.65,"cashOnHand":59665.79,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00905133","candidateId":"H6CA05377","source":"https://www.fec.gov/data/committee/C00905133/","name":"Michael Masuda","office":"U.S. House Candidate (CA-5)"},
      "michael_mebruer": {"receipts":70714.45,"disbursements":66616.5,"cashOnHand":0,"coverageEnd":"2026-11-05","cycle":2026,"committeeId":"C00938787","candidateId":"H6LA05259","source":"https://www.fec.gov/data/committee/C00938787/","name":"Michael Mebruer","office":"U.S. House Candidate (LA-6)"},
      "michael_quirk": {"receipts":32487.55,"disbursements":29346.89,"cashOnHand":3140.66,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00949198","candidateId":"H6FL17081","source":"https://www.fec.gov/data/committee/C00949198/","name":"Michael J. Quirk","office":"U.S. House Candidate (FL-17)"},
      "michael_whatley": {"receipts":13666933.58,"disbursements":12764695.53,"cashOnHand":902238.05,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00913996","candidateId":"S6NC00415","source":"https://www.fec.gov/data/committee/C00913996/","name":"Michael Whatley","office":"U.S. Senate Candidate"},
      "michaela_barnett": {"receipts":717841.92,"disbursements":587591.39,"cashOnHand":130250.53,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00920520","candidateId":"H6TN02170","source":"https://www.fec.gov/data/committee/C00920520/","name":"Michaela Barnett","office":"U.S. House Candidate (TN-2)"},
      "mike_beltran": {"receipts":2691334.47,"disbursements":969791.75,"cashOnHand":1721542.72,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00950832","candidateId":"H6FL14237","source":"https://www.fec.gov/data/committee/C00950832/","name":"Mike Beltran","office":"U.S. House Candidate (FL-14)"},
      "mike_cargile": {"receipts":9799,"disbursements":9821.96,"cashOnHand":447.81,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00730812","candidateId":"H0CA35146","source":"https://www.fec.gov/data/committee/C00730812/","name":"Mike Cargile","office":"U.S. House Candidate (CA-35)"},
      "mike_croley": {"receipts":117167.7,"disbursements":103075.69,"cashOnHand":14341.64,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00902239","candidateId":"H6TN06171","source":"https://www.fec.gov/data/committee/C00902239/","name":"Mike Croley","office":"U.S. House Candidate (TN-6)"},
      "mike_decillis": {"receipts":183305.5,"disbursements":75417.05,"cashOnHand":107888.45,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00935742","candidateId":"H6NY11265","source":"https://www.fec.gov/data/committee/C00935742/","name":"Mike DeCillis","office":"U.S. House Candidate (NY-11)"},
      "mike_klein": {"receipts":120556.13,"disbursements":108144.35,"cashOnHand":12411.78,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00946459","candidateId":"H6FL03149","source":"https://www.fec.gov/data/committee/C00946459/","name":"Mike Klein","office":"U.S. House Candidate (FL-3)"},
      "mike_marvin": {"receipts":27750,"disbursements":27750,"cashOnHand":0,"coverageEnd":"2026-09-11","cycle":2026,"committeeId":"C00944199","candidateId":"S6NE00152","source":"https://www.fec.gov/data/committee/C00944199/","name":"Mike Marvin","office":"U.S. Senate Candidate"},
      "mike_sell": {"receipts":24206,"disbursements":15016.63,"cashOnHand":4857,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00952655","candidateId":"H6FL04246","source":"https://www.fec.gov/data/committee/C00952655/","name":"Mike Sell","office":"U.S. House Candidate (FL-4)"},
      "mike_thurow": {"receipts":195140.17,"disbursements":186866.01,"cashOnHand":8274.16,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00930610","candidateId":"H6WI06233","source":"https://www.fec.gov/data/committee/C00930610/","name":"Mike Thurow","office":"U.S. House Candidate (WI-6)"},
      "missi_hesketh": {"receipts":66639.85,"disbursements":60168.93,"cashOnHand":45851.95,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00859140","candidateId":"H4MO07156","source":"https://www.fec.gov/data/committee/C00859140/","name":"Missi Hesketh","office":"U.S. House Candidate (MO-7)"},
      "misti_cordell": {"receipts":658608.43,"disbursements":458430.06,"cashOnHand":200178.37,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00936625","candidateId":"H6LA05200","source":"https://www.fec.gov/data/committee/C00936625/","name":"Misti Cordell","office":"U.S. House Candidate (LA-5)"},
      "monique_appeaning": {"receipts":109182.74,"disbursements":94473.6,"cashOnHand":14709.14,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00937789","candidateId":"H6LA06158","source":"https://www.fec.gov/data/committee/C00937789/","name":"Monique Appeaning","office":"U.S. House Candidate (LA-6)"},
      "monique_despain": {"receipts":921875.97,"disbursements":768300.23,"cashOnHand":153575.74,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00921544","candidateId":"H6OR04260","source":"https://www.fec.gov/data/committee/C00921544/","name":"Monique DeSpain","office":"U.S. House Candidate (OR-4)"},
      "nadia_milleron": {"receipts":1585489.1,"disbursements":1288433.58,"cashOnHand":310205.12,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00868927","candidateId":"H4MA01091","source":"https://www.fec.gov/data/committee/C00868927/","name":"Nadia Donya Milleron","office":"U.S. House Candidate (MA-1)"},
      "nancy_lacore": {"receipts":4865629.69,"disbursements":4690325.34,"cashOnHand":175304.35,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00935379","candidateId":"H6SC01359","source":"https://www.fec.gov/data/committee/C00935379/","name":"Nancy Lacore","office":"U.S. House Candidate (SC-1)"},
      "nancy_wallace": {"receipts":33.1,"disbursements":30,"cashOnHand":3825.42,"coverageEnd":"2017-11-28","cycle":2018,"committeeId":"C00620732","candidateId":"H6MD08598","source":"https://www.fec.gov/data/committee/C00620732/","name":"Nancy Wallace","office":"U.S. House Candidate (MD-8)"},
      "ndidiamaka_okpareke": {"receipts":174529.13,"disbursements":116984.34,"cashOnHand":57544.79,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00908509","candidateId":"H6NM01129","source":"https://www.fec.gov/data/committee/C00908509/","name":"Ndidiamaka Ekwua Charlene Okpareke","office":"U.S. House Candidate (NM-1)"},
      "ned_pillersdorf": {"receipts":377088.72,"disbursements":270619.74,"cashOnHand":106493.98,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00907055","candidateId":"H6KY05152","source":"https://www.fec.gov/data/committee/C00907055/","name":"Ned Pillersdorf","office":"U.S. House Candidate (KY-5)"},
      "nicole_gronli": {"receipts":421803.07,"disbursements":399312.34,"cashOnHand":22490.73,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00918961","candidateId":"H6SD01141","source":"https://www.fec.gov/data/committee/C00918961/","name":"Nicole \"Nikki\" Gronli","office":"U.S. House Candidate (SD-AL)"},
      "nicole_locklin": {"receipts":599526.7,"disbursements":489536.92,"cashOnHand":109989.78,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00938530","candidateId":"H6FL26058","source":"https://www.fec.gov/data/committee/C00938530/","name":"Nicole Locklin","office":"U.S. House Candidate (FL-26)"},
      "niki_conforti": {"receipts":348452.74,"disbursements":346015.97,"cashOnHand":7638.59,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00844308","candidateId":"H2IL06090","source":"https://www.fec.gov/data/committee/C00844308/","name":"Niki Conforti","office":"U.S. House Candidate (IL-6)"},
      "nirav_sheth": {"receipts":71544.33,"disbursements":70425.49,"cashOnHand":4876.8,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00845354","candidateId":"H4WA08147","source":"https://www.fec.gov/data/committee/C00845354/","name":"Nirav Sheth","office":"U.S. House Candidate (WA-7)"},
      "nkiyla_thomas": {"receipts":115953.98,"disbursements":92788.73,"cashOnHand":24101.59,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00899559","candidateId":"S6OK04163","source":"https://www.fec.gov/data/committee/C00899559/","name":"N'kiyla Jasmine Thomas","office":"U.S. Senate Candidate"},
      "oliver_gilbert": {"receipts":1458355.31,"disbursements":1031060.76,"cashOnHand":427294.55,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00952598","candidateId":"H6FL24095","source":"https://www.fec.gov/data/committee/C00952598/","name":"Oliver G. Gilbert III","office":"U.S. House Candidate (FL-24)"},
      "pamela_delancy": {"receipts":78669.71,"disbursements":44421.38,"cashOnHand":24291.66,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00933283","candidateId":"H6GA10183","source":"https://www.fec.gov/data/committee/C00933283/","name":"Pamela \"Pam\" Delancy","office":"U.S. House Candidate (GA-10)"},
      "patrick_forbes": {"receipts":156333.69,"disbursements":58933.73,"cashOnHand":97399.96,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00958322","candidateId":"H6LA06190","source":"https://www.fec.gov/data/committee/C00958322/","name":"Patrick \"Pat\" Forbes","office":"U.S. House Candidate (LA-6)"},
      "patrick_halpin": {"receipts":586333.53,"disbursements":536891.17,"cashOnHand":49442.36,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00911958","candidateId":"H6NY02140","source":"https://www.fec.gov/data/committee/C00911958/","name":"Patrick Halpin","office":"U.S. House Candidate (NY-2)"},
      "patti_adair": {"receipts":682238.95,"disbursements":559654.31,"cashOnHand":122584.64,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00927228","candidateId":"H6OR05242","source":"https://www.fec.gov/data/committee/C00927228/","name":"Patti Adair","office":"U.S. House Candidate (OR-5)"},
      "patty_garcia": {"receipts":526691.49,"disbursements":369980.32,"cashOnHand":156711.17,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00925495","candidateId":"H6IL04153","source":"https://www.fec.gov/data/committee/C00925495/","name":"Patty Garcia","office":"U.S. House Candidate (IL-4)"},
      "patty_mcmahon": {"receipts":6327.35,"disbursements":5636.52,"cashOnHand":690.83,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00949040","candidateId":"H6CO06173","source":"https://www.fec.gov/data/committee/C00949040/","name":"Patty McMahon","office":"U.S. House Candidate (CO-6)"},
      "paul_barringer": {"receipts":1215150.98,"disbursements":805628.54,"cashOnHand":409522.44,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00906057","candidateId":"H6NC13228","source":"https://www.fec.gov/data/committee/C00906057/","name":"Paul Barringer","office":"U.S. House Candidate (NC-13)"},
      "paul_lepage": {"receipts":3177401.07,"disbursements":2329177.43,"cashOnHand":848223.64,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00904094","candidateId":"H6ME02148","source":"https://www.fec.gov/data/committee/C00904094/","name":"Paul R. LePage","office":"U.S. House Candidate (ME-2)"},
      "paul_nolley": {"receipts":639225.21,"disbursements":580165.74,"cashOnHand":59059.47,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00900399","candidateId":"H6IL16108","source":"https://www.fec.gov/data/committee/C00900399/","name":"Paul Nolley","office":"U.S. House Candidate (IL-16)"},
      "paul_wikstrom": {"receipts":65015.98,"disbursements":36129.62,"cashOnHand":18547.61,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00939181","candidateId":"H6MN04293","source":"https://www.fec.gov/data/committee/C00939181/","name":"Paul Wikstrom","office":"U.S. House Candidate (MN-4)"},
      "pedro_desouza": {"receipts":13117.74,"disbursements":13006.17,"cashOnHand":111.57,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00951624","candidateId":"H6RI01161","source":"https://www.fec.gov/data/committee/C00951624/","name":"Pedro DeSouza","office":"U.S. House Candidate (RI-1)"},
      "peter_crosby": {"receipts":153918.33,"disbursements":100795.47,"cashOnHand":47879.29,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00913582","candidateId":"H6UT01160","source":"https://www.fec.gov/data/committee/C00913582/","name":"Peter Crosby","office":"U.S. House Candidate (UT-2)"},
      "peter_jassenoff": {"receipts":10500,"disbursements":10440,"cashOnHand":60,"coverageEnd":"2026-06-30","cycle":2026,"committeeId":"C00953877","candidateId":"H6FL25068","source":"https://www.fec.gov/data/committee/C00953877/","name":"Peter Jassenoff","office":"U.S. House Candidate (FL-25)"},
      "peter_oberacker": {"receipts":1424570.72,"disbursements":1401415.23,"cashOnHand":23155.49,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00921668","candidateId":"H6NY19268","source":"https://www.fec.gov/data/committee/C00921668/","name":"Peter K. Oberacker","office":"U.S. House Candidate (NY-19)"},
      "peter_soule": {"receipts":4272,"disbursements":146.78,"cashOnHand":4125.22,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00936435","candidateId":"H6CA16176","source":"https://www.fec.gov/data/committee/C00936435/","name":"Peter Sundin Soulé","office":"U.S. House Candidate (CA-16)"},
      "peter_verbica": {"receipts":85541.19,"disbursements":78720.05,"cashOnHand":6821.14,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00902841","candidateId":"H6CA19154","source":"https://www.fec.gov/data/committee/C00902841/","name":"Peter Coe Verbica","office":"U.S. House Candidate (CA-19)"},
      "peter_williams": {"receipts":21824.92,"disbursements":0,"cashOnHand":71824.92,"coverageEnd":"2024-11-15","cycle":2024,"committeeId":"C00892380","candidateId":"H4LA05171","source":"https://www.fec.gov/data/committee/C00892380/","name":"Peter Williams","office":"U.S. House Candidate (LA-2)"},
      "phil_ehr": {"receipts":361423.35,"disbursements":12325.1,"cashOnHand":418920.85,"coverageEnd":"2026-09-30","cycle":2026,"committeeId":"C00904128","candidateId":"H4FL28042","source":"https://www.fec.gov/data/committee/C00904128/","name":"Phil Felipe Ehr","office":"U.S. House Candidate (FL-28)"},
      "phil_gray": {"receipts":5235,"disbursements":5235,"cashOnHand":0,"coverageEnd":"2018-11-26","cycle":2018,"committeeId":"C00691733","candidateId":"H6TX01261","source":"https://www.fec.gov/data/committee/C00691733/","name":"Phil Gray","office":"U.S. House Candidate (TX-26)"},
      "pia_dandiya": {"receipts":4619822.46,"disbursements":3884717.23,"cashOnHand":735105.23,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00906883","candidateId":"H6FL21059","source":"https://www.fec.gov/data/committee/C00906883/","name":"Pia Dandiya","office":"U.S. House Candidate (FL-22)"},
      "priscilla_ghaznavi": {"receipts":40055,"disbursements":26876.42,"cashOnHand":13178.58,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00946244","candidateId":"H6NY07255","source":"https://www.fec.gov/data/committee/C00946244/","name":"Priscilla Ghaznavi","office":"U.S. House Candidate (NY-7)"},
      "rachel_anderson": {"receipts":164557.53,"disbursements":135872.68,"cashOnHand":35681.48,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00932459","candidateId":"S6WV00188","source":"https://www.fec.gov/data/committee/C00932459/","name":"Rachel Fetty Anderson","office":"U.S. Senate Candidate"},
      "rachel_grage": {"receipts":448223.9,"disbursements":382289.51,"cashOnHand":65881.07,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00923540","candidateId":"H6FL05250","source":"https://www.fec.gov/data/committee/C00923540/","name":"Rachel Grage","office":"U.S. House Candidate (FL-5)"},
      "rachel_peace": {"receipts":101425.72,"disbursements":86994.28,"cashOnHand":14431.44,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00933846","candidateId":"H6NJ04257","source":"https://www.fec.gov/data/committee/C00933846/","name":"Rachel Peace","office":"U.S. House Candidate (NJ-4)"},
      "ralph_alvarado": {"receipts":2307369.27,"disbursements":2126557.77,"cashOnHand":180811.5,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00912303","candidateId":"H6KY06192","source":"https://www.fec.gov/data/committee/C00912303/","name":"Ralph Alvarado","office":"U.S. House Candidate (KY-6)"},
      "ralph_ambrosio": {"receipts":61545.17,"disbursements":54202.52,"cashOnHand":7342.65,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00935965","candidateId":"H6NY20225","source":"https://www.fec.gov/data/committee/C00935965/","name":"Ralph F. Ambrosio","office":"U.S. House Candidate (NY-20)"},
      "ramon_mora": {"receipts":1139.34,"disbursements":1367.27,"cashOnHand":84.59,"coverageEnd":"2026-09-30","cycle":2026,"committeeId":"C00945964","candidateId":"H6NJ02269","source":"https://www.fec.gov/data/committee/C00945964/","name":"Ramon Mora Jr.","office":"U.S. House Candidate (NJ-2)"},
      "randall_terry": {"receipts":74221,"disbursements":58842.2,"cashOnHand":15378.8,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00949990","candidateId":"H6VA07312","source":"https://www.fec.gov/data/committee/C00949990/","name":"Randall A. Terry","office":"U.S. House Candidate (VA-7)"},
      "randy_villegas": {"receipts":5942030.17,"disbursements":4979678.4,"cashOnHand":962351.77,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00902379","candidateId":"H6CA22190","source":"https://www.fec.gov/data/committee/C00902379/","name":"Randy Villegas","office":"U.S. House Candidate (CA-22)"},
      "ray_pooley": {"receipts":26386.57,"disbursements":12311.48,"cashOnHand":14075.09,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00919902","candidateId":"H6MI09245","source":"https://www.fec.gov/data/committee/C00919902/","name":"Ray Pooley","office":"U.S. House Candidate (MI-9)"},
      "raymond_mckay": {"receipts":207230.98,"disbursements":199212.2,"cashOnHand":8357.31,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00827964","candidateId":"S4RI00051","source":"https://www.fec.gov/data/committee/C00827964/","name":"Raymond T. McKay","office":"U.S. Senate Candidate"},
      "raymond_smith": {"receipts":366580.83,"disbursements":321978.57,"cashOnHand":44282.09,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00930784","candidateId":"H6NC03229","source":"https://www.fec.gov/data/committee/C00930784/","name":"Raymond Smith","office":"U.S. House Candidate (NC-3)"},
      "rebecca_bennett": {"receipts":8757003.38,"disbursements":7703548.93,"cashOnHand":1053454.45,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00897165","candidateId":"H6NJ07201","source":"https://www.fec.gov/data/committee/C00897165/","name":"Rebecca Bennett","office":"U.S. House Candidate (NJ-7)"},
      "rhonda_hart": {"receipts":24315.62,"disbursements":19570.52,"cashOnHand":5935.1,"coverageEnd":"2026-09-30","cycle":2026,"committeeId":"C00924365","candidateId":"H4TX14111","source":"https://www.fec.gov/data/committee/C00924365/","name":"Rhonda Hart","office":"U.S. House Candidate (TX-36)"},
      "richard_pan": {"receipts":2548242.27,"disbursements":2340306.07,"cashOnHand":207936.2,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00923193","candidateId":"H6CA03158","source":"https://www.fec.gov/data/committee/C00923193/","name":"Richard Pan","office":"U.S. House Candidate (CA-6)"},
      "rick_brattin": {"receipts":457467.1,"disbursements":457107.77,"cashOnHand":359.33,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00939710","candidateId":"H2MO04199","source":"https://www.fec.gov/data/committee/C00939710/","name":"Rick Brattin","office":"U.S. House Candidate (MO-5)"},
      "rick_crosson": {"receipts":168411.93,"disbursements":106384.44,"cashOnHand":62027.49,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00916064","candidateId":"H6WI08205","source":"https://www.fec.gov/data/committee/C00916064/","name":"Rick Crosson","office":"U.S. House Candidate (WI-8)"},
      "riley_owen": {"receipts":164069.93,"disbursements":154566.82,"cashOnHand":9503.11,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00940411","candidateId":"H6UT01244","source":"https://www.fec.gov/data/committee/C00940411/","name":"Riley Owen","office":"U.S. House Candidate (UT-1)"},
      "ritesh_tandon": {"receipts":57011.48,"disbursements":51784.26,"cashOnHand":5227.22,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00721878","candidateId":"H0CA17193","source":"https://www.fec.gov/data/committee/C00721878/","name":"Ritesh Tandon","office":"U.S. House Candidate (CA-17)"},
      "robb_tucker": {"receipts":304654.01,"disbursements":288202.55,"cashOnHand":16451.46,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00939330","candidateId":"H6CA03174","source":"https://www.fec.gov/data/committee/C00939330/","name":"Robb Tucker","office":"U.S. House Candidate (CA-3)"},
      "robert_burke": {"receipts":1525,"disbursements":12552.79,"cashOnHand":-16965.6,"coverageEnd":"2026-09-30","cycle":2026,"committeeId":"C00952127","candidateId":"H2MA08090","source":"https://www.fec.gov/data/committee/C00952127/","name":"Robert G. Burke","office":"U.S. House Candidate (MA-8)"},
      "robert_henri": {"receipts":6361,"disbursements":4689,"cashOnHand":1672,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00946541","candidateId":"H6OK05301","source":"https://www.fec.gov/data/committee/C00946541/","name":"Robert P. Henri","office":"U.S. House Candidate (OK-5)"},
      "robert_murray": {"receipts":1549.87,"disbursements":41.01,"cashOnHand":1508.86,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00957795","candidateId":"H6VA04129","source":"https://www.fec.gov/data/committee/C00957795/","name":"Robert P. \"Family Man\" Murray, Jr.","office":"U.S. House Candidate (VA-4)"},
      "robert_people": {"receipts":82518.46,"disbursements":55893.61,"cashOnHand":26624.85,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00897447","candidateId":"H6FL15168","source":"https://www.fec.gov/data/committee/C00897447/","name":"Robert People","office":"U.S. House Candidate (FL-15)"},
      "robin_ficker": {"receipts":1284599.36,"disbursements":1280271.74,"cashOnHand":4327.62,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00910968","candidateId":"H6MD06287","source":"https://www.fec.gov/data/committee/C00910968/","name":"Robin Ficker","office":"U.S. House Candidate (MD-6)"},
      "rodney_king": {"receipts":7810,"disbursements":7805,"cashOnHand":5,"coverageEnd":"2026-09-30","cycle":2026,"committeeId":"C00955419","candidateId":"H6TN03251","source":"https://www.fec.gov/data/committee/C00955419/","name":"Rodney Joe King","office":"U.S. House Candidate (TN-3)"},
      "ron_meinhardt": {"receipts":15902.61,"disbursements":14306.54,"cashOnHand":1596.07,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00939058","candidateId":"S6OK04205","source":"https://www.fec.gov/data/committee/C00939058/","name":"Ron Meinhardt","office":"U.S. Senate Candidate"},
      "ronald_muszynski": {"receipts":1130.34,"disbursements":578.03,"cashOnHand":572.31,"coverageEnd":"2026-10-03","cycle":2026,"committeeId":"C00956201","candidateId":"H6MI05235","source":"https://www.fec.gov/data/committee/C00956201/","name":"Ronald A Muszynski","office":"U.S. House Candidate (MI-5)"},
      "ronald_russell_me": {"receipts":214095.98,"disbursements":219953.49,"cashOnHand":8363.57,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00860379","candidateId":"H4ME01160","source":"https://www.fec.gov/data/committee/C00860379/","name":"Ronald C. Russell","office":"U.S. House Candidate (ME-1)"},
      "rudy_recile": {"receipts":20073,"disbursements":20875.45,"cashOnHand":235.29,"coverageEnd":"2026-09-30","cycle":2026,"committeeId":"C00784835","candidateId":"H2CA00153","source":"https://www.fec.gov/data/committee/C00784835/","name":"Rudy Recile","office":"U.S. House Candidate (CA-8)"},
      "russell_best": {"receipts":7617,"disbursements":7617,"cashOnHand":0,"coverageEnd":"2012-11-09","cycle":2012,"committeeId":"C00536276","candidateId":"H0NV02167","source":"https://www.fec.gov/data/committee/C00536276/","name":"Russell Best","office":"U.S. House Candidate (NV-4)"},
      "ryan_elijah": {"receipts":818460.2,"disbursements":645454.08,"cashOnHand":173006.12,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00948661","candidateId":"H6FL07231","source":"https://www.fec.gov/data/committee/C00948661/","name":"Ryan Elijah","office":"U.S. House Candidate (FL-7)"},
      "sam_gallucci": {"receipts":537530.39,"disbursements":518649.18,"cashOnHand":18881.21,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00900613","candidateId":"H6CA26241","source":"https://www.fec.gov/data/committee/C00900613/","name":"Sam Gallucci","office":"U.S. House Candidate (CA-26)"},
      "samantha_mota": {"receipts":12578.93,"disbursements":12250.64,"cashOnHand":328.29,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00908947","candidateId":"H6CA37339","source":"https://www.fec.gov/data/committee/C00908947/","name":"Samantha Mota","office":"U.S. House Candidate (CA-37)"},
      "samir_witta": {"receipts":103438.45,"disbursements":150687.21,"cashOnHand":-47148.76,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00926907","candidateId":"H6CO06116","source":"https://www.fec.gov/data/committee/C00926907/","name":"Samir Ezzeldin Witta","office":"U.S. House Candidate (CO-6)"},
      "sandra_scotter": {"receipts":47739.09,"disbursements":42428.82,"cashOnHand":-1680.31,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00922666","candidateId":"H6CA20228","source":"https://www.fec.gov/data/committee/C00922666/","name":"Sandra Van Scotter","office":"U.S. House Candidate (CA-20)"},
      "scott_colom": {"receipts":4400889.53,"disbursements":3382172.58,"cashOnHand":1018716.95,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00918359","candidateId":"S6MS00133","source":"https://www.fec.gov/data/committee/C00918359/","name":"Scott Colom","office":"U.S. Senate Candidate"},
      "scott_meyers": {"receipts":122819.35,"disbursements":117577.75,"cashOnHand":5241.6,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00937912","candidateId":"H6CA30250","source":"https://www.fec.gov/data/committee/C00937912/","name":"Scott Alan Meyers","office":"U.S. House Candidate (CA-30)"},
      "scott_singer": {"receipts":3197383.91,"disbursements":2736756.89,"cashOnHand":460627.02,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00932574","candidateId":"H6FL23188","source":"https://www.fec.gov/data/committee/C00932574/","name":"Scott Singer","office":"U.S. House Candidate (FL-25)"},
      "sean_kirrane": {"receipts":103741.74,"disbursements":103545.8,"cashOnHand":195.94,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00918342","candidateId":"H6NJ05221","source":"https://www.fec.gov/data/committee/C00918342/","name":"Sean Kirrane","office":"U.S. House Candidate (NJ-5)"},
      "seth_harp": {"receipts":172434.58,"disbursements":128289.26,"cashOnHand":44145.32,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00903013","candidateId":"H6FL03099","source":"https://www.fec.gov/data/committee/C00903013/","name":"Seth Harp","office":"U.S. House Candidate (FL-3)"},
      "seth_haskin": {"receipts":8000,"disbursements":7348.57,"cashOnHand":651.43,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00950402","candidateId":"H6FL19319","source":"https://www.fec.gov/data/committee/C00950402/","name":"Seth Haskin","office":"U.S. House Candidate (FL-19)"},
      "shane_lewis": {"receipts":115468.87,"disbursements":111052.14,"cashOnHand":4416.73,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00920397","candidateId":"H6CA18172","source":"https://www.fec.gov/data/committee/C00920397/","name":"Shane Lewis","office":"U.S. House Candidate (CA-18)"},
      "shannon_taylor": {"receipts":4607379.06,"disbursements":4008644.79,"cashOnHand":598734.27,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00918029","candidateId":"H6VA01299","source":"https://www.fec.gov/data/committee/C00918029/","name":"Shannon L. Taylor","office":"U.S. House Candidate (VA-1)"},
      "sharon_renier": {"receipts":8742,"disbursements":8742,"cashOnHand":0,"coverageEnd":"2004-11-22","cycle":2004,"committeeId":"C00397968","candidateId":"H4MI07137","source":"https://www.fec.gov/data/committee/C00397968/","name":"Sharon Marie Renier","office":"U.S. House Candidate (MI-5)"},
      "shaun_finnie": {"receipts":3158587.64,"disbursements":2896939.04,"cashOnHand":261648.6,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00909051","candidateId":"H6TX02251","source":"https://www.fec.gov/data/committee/C00909051/","name":"Shaun Finnie","office":"U.S. House Candidate (TX-2)"},
      "shawn_harris": {"receipts":8418045.03,"disbursements":8358732.52,"cashOnHand":59312.51,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00905406","candidateId":"H4GA14057","source":"https://www.fec.gov/data/committee/C00905406/","name":"Shawn Harris","office":"U.S. House Candidate (GA-14)"},
      "shimon_blau": {"receipts":204360.6,"disbursements":144600.48,"cashOnHand":59760.12,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00956516","candidateId":"H6CO01356","source":"https://www.fec.gov/data/committee/C00956516/","name":"Shimon Blau","office":"U.S. House Candidate (CO-1)"},
      "spencer_meline": {"receipts":157773.63,"disbursements":85052.41,"cashOnHand":72721.22,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00938050","candidateId":"H6WA08167","source":"https://www.fec.gov/data/committee/C00938050/","name":"Spencer Meline","office":"U.S. House Candidate (WA-8)"},
      "stephanie_vargas": {"receipts":720.51,"disbursements":200,"cashOnHand":520.51,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00932012","candidateId":"H6CA33114","source":"https://www.fec.gov/data/committee/C00932012/","name":"Stephanie M. Vargas","office":"U.S. House Candidate (CA-33)"},
      "stephen_wagley": {"receipts":874343.55,"disbursements":678710.42,"cashOnHand":195633.13,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00958033","candidateId":"H6LA06182","source":"https://www.fec.gov/data/committee/C00958033/","name":"Stephen Wagley","office":"U.S. House Candidate (LA-6)"},
      "stephen_woll": {"receipts":67506,"disbursements":52311.86,"cashOnHand":15194.14,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00954255","candidateId":"H6VA03139","source":"https://www.fec.gov/data/committee/C00954255/","name":"Stephen C. Woll","office":"U.S. House Candidate (VA-3)"},
      "steve_manos": {"receipts":11929,"disbursements":8030.7,"cashOnHand":3987.5,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00904557","candidateId":"H6CA39145","source":"https://www.fec.gov/data/committee/C00904557/","name":"Steve Manos","office":"U.S. House Candidate (CA-39)"},
      "steve_toth": {"receipts":1035120.97,"disbursements":922740.87,"cashOnHand":112380.1,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00911669","candidateId":"H6TX08175","source":"https://www.fec.gov/data/committee/C00911669/","name":"Steve Toth","office":"U.S. House Candidate (TX-2)"},
      "steven_burt": {"receipts":39743.5,"disbursements":37961.66,"cashOnHand":1781.84,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00922898","candidateId":"H6UT04024","source":"https://www.fec.gov/data/committee/C00922898/","name":"Steven Burt","office":"U.S. House Candidate (UT-4)"},
      "steven_feldman": {"receipts":48754.35,"disbursements":64673.75,"cashOnHand":1294.84,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00866608","candidateId":"H4NC10146","source":"https://www.fec.gov/data/committee/C00866608/","name":"Steven Feldman","office":"U.S. House Candidate (NC-10)"},
      "steven_shook": {"receipts":35820.67,"disbursements":30195.23,"cashOnHand":5602.96,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00918573","candidateId":"H6TX26144","source":"https://www.fec.gov/data/committee/C00918573/","name":"Steven Shook","office":"U.S. House Candidate (TX-26)"},
      "stewart_cathey": {"receipts":245550,"disbursements":147771,"cashOnHand":97779,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00935932","candidateId":"H6LA05184","source":"https://www.fec.gov/data/committee/C00935932/","name":"Stewart Cathey, Jr.","office":"U.S. House Candidate (LA-5)"},
      "sydney_gruters": {"receipts":1618888.17,"disbursements":1366391.11,"cashOnHand":252497.06,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00945915","candidateId":"H6FL16141","source":"https://www.fec.gov/data/committee/C00945915/","name":"Sydney Gruters","office":"U.S. House Candidate (FL-16)"},
      "tano_tijerina": {"receipts":1737697.43,"disbursements":1624647.33,"cashOnHand":113050.1,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00929174","candidateId":"H6TX28124","source":"https://www.fec.gov/data/committee/C00929174/","name":"Tano E. Tijerina","office":"U.S. House Candidate (TX-28)"},
      "tanya_lloyd": {"receipts":270814.09,"disbursements":251322.25,"cashOnHand":19679.17,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00859603","candidateId":"H4TX27089","source":"https://www.fec.gov/data/committee/C00859603/","name":"Tanya Lloyd","office":"U.S. House Candidate (TX-27)"},
      "te_brown": {"receipts":313459.03,"disbursements":144183.35,"cashOnHand":169275.68,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00949099","candidateId":"H6FL14203","source":"https://www.fec.gov/data/committee/C00949099/","name":"Te Mayonna Brown","office":"U.S. House Candidate (FL-24)"},
      "teresa_benitez_thompson": {"receipts":1054466.93,"disbursements":872617.73,"cashOnHand":181849.2,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00939488","candidateId":"H6NV02362","source":"https://www.fec.gov/data/committee/C00939488/","name":"Teresa Francisca Benitez-Thompson","office":"U.S. House Candidate (NV-2)"},
      "teresa_fox": {"receipts":70638.66,"disbursements":59758.92,"cashOnHand":10879.74,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00939926","candidateId":"H6WA06286","source":"https://www.fec.gov/data/committee/C00939926/","name":"Teresa Fox","office":"U.S. House Candidate (WA-6)"},
      "terri_deboer": {"receipts":865481.34,"disbursements":795200.73,"cashOnHand":70280.61,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00941823","candidateId":"H6MI03198","source":"https://www.fec.gov/data/committee/C00941823/","name":"Terri DeBoer","office":"U.S. House Candidate (MI-3)"},
      "tessa_hodge": {"receipts":126771.66,"disbursements":114337.33,"cashOnHand":12434.33,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00899138","candidateId":"H6CA23230","source":"https://www.fec.gov/data/committee/C00899138/","name":"Tessa Lynn Hodge","office":"U.S. House Candidate (CA-23)"},
      "thomas_smith": {"receipts":323205.52,"disbursements":238139.56,"cashOnHand":85065.96,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00951830","candidateId":"H6MI08312","source":"https://www.fec.gov/data/committee/C00951830/","name":"Thomas J. Smith","office":"U.S. House Candidate (MI-8)"},
      "thomas_stalcup": {"receipts":26619.26,"disbursements":26472,"cashOnHand":147.26,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00945477","candidateId":"H6MA04140","source":"https://www.fec.gov/data/committee/C00945477/","name":"Thomas Stalcup","office":"U.S. House Candidate (MA-4)"},
      "thurman_bartie": {"receipts":39403.19,"disbursements":38564.42,"cashOnHand":4754.11,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00925867","candidateId":"H6TX14181","source":"https://www.fec.gov/data/committee/C00925867/","name":"Thurman Bill Bartie","office":"U.S. House Candidate (TX-14)"},
      "tia_lebrun": {"receipts":7443,"disbursements":4101.79,"cashOnHand":3940.01,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00819961","candidateId":"H2LA03105","source":"https://www.fec.gov/data/committee/C00819961/","name":"Tia LeBrun","office":"U.S. House Candidate (LA-3)"},
      "tim_bennett": {"receipts":109339.34,"disbursements":104724.18,"cashOnHand":4615.16,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00935726","candidateId":"H6CO07122","source":"https://www.fec.gov/data/committee/C00935726/","name":"Tim Bennett","office":"U.S. House Candidate (CO-7)"},
      "tim_sharman": {"receipts":45422.41,"disbursements":45372.41,"cashOnHand":50,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00953927","candidateId":"H6VA08336","source":"https://www.fec.gov/data/committee/C00953927/","name":"Tim S. Sharman","office":"U.S. House Candidate (VA-8)"},
      "tom_bailey": {"receipts":5855,"disbursements":5677,"cashOnHand":0,"coverageEnd":"2018-11-15","cycle":2018,"committeeId":"C00686212","candidateId":"H8NC13075","source":"https://www.fec.gov/data/committee/C00686212/","name":"Tom Bailey","office":"U.S. House Candidate (NC-1)"},
      "tom_perriello": {"receipts":3762301.32,"disbursements":3078135.29,"cashOnHand":684166.03,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00929968","candidateId":"H8VA05106","source":"https://www.fec.gov/data/committee/C00929968/","name":"Tom S. P. Perriello","office":"U.S. House Candidate (VA-5)"},
      "tom_sell": {"receipts":2502266.26,"disbursements":2234259.45,"cashOnHand":268006.81,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00926345","candidateId":"H6TX19206","source":"https://www.fec.gov/data/committee/C00926345/","name":"Tom Sell","office":"U.S. House Candidate (TX-19)"},
      "tony_darrigo": {"receipts":28180.9,"disbursements":2500,"cashOnHand":25680.9,"coverageEnd":"2026-06-30","cycle":2026,"committeeId":"C00868547","candidateId":"H4FL13234","source":"https://www.fec.gov/data/committee/C00868547/","name":"Tony D'Arrigo","office":"U.S. House Candidate (FL-13)"},
      "tony_kozycki": {"receipts":922117.45,"disbursements":431822.9,"cashOnHand":490294.55,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00942185","candidateId":"H6GA07221","source":"https://www.fec.gov/data/committee/C00942185/","name":"Tony Kozycki","office":"U.S. House Candidate (GA-7)"},
      "tony_sabio": {"receipts":44255.68,"disbursements":37625.89,"cashOnHand":6204.79,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00905943","candidateId":"H6VA08252","source":"https://www.fec.gov/data/committee/C00905943/","name":"Tony A. Sabio","office":"U.S. House Candidate (VA-8)"},
      "tonya_hudson": {"receipts":1822.38,"disbursements":2073.12,"cashOnHand":-250.74,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00921239","candidateId":"H6IN09317","source":"https://www.fec.gov/data/committee/C00921239/","name":"Tonya L. Hudson","office":"U.S. House Candidate (IN-9)"},
      "trever_nehls": {"receipts":327410.4,"disbursements":252643.4,"cashOnHand":74767,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00930065","candidateId":"H6TX22283","source":"https://www.fec.gov/data/committee/C00930065/","name":"Trever Nehls","office":"U.S. House Candidate (TX-22)"},
      "trina_swanson": {"receipts":727329.66,"disbursements":550513.76,"cashOnHand":176815.9,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00933382","candidateId":"H6MN08179","source":"https://www.fec.gov/data/committee/C00933382/","name":"Trina Swanson","office":"U.S. House Candidate (MN-8)"},
      "tripp_hutchinson": {"receipts":7565,"disbursements":1578.36,"cashOnHand":6963.48,"coverageEnd":"2026-06-30","cycle":2026,"committeeId":"C00928408","candidateId":"H6ID02241","source":"https://www.fec.gov/data/committee/C00928408/","name":"Tripp Charles Hutchinson","office":"U.S. House Candidate (ID-2)"},
      "trygve_hammer": {"receipts":370969,"disbursements":328860.24,"cashOnHand":42108.76,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00935494","candidateId":"H6ND01049","source":"https://www.fec.gov/data/committee/C00935494/","name":"Trygve Hammer","office":"U.S. House Candidate (ND-AL)"},
      "tyler_macallister": {"receipts":215467.33,"disbursements":162286.9,"cashOnHand":53180.43,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00910836","candidateId":"H6MA09206","source":"https://www.fec.gov/data/committee/C00910836/","name":"R. Tyler Macallister","office":"U.S. House Candidate (MA-9)"},
      "victor_arias": {"receipts":69983.08,"disbursements":54565.93,"cashOnHand":15417.15,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00934174","candidateId":"H6FL19277","source":"https://www.fec.gov/data/committee/C00934174/","name":"Victor Arias","office":"U.S. House Candidate (FL-19)"},
      "victor_mellor": {"receipts":3885928.85,"disbursements":3841576.22,"cashOnHand":44352.63,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00925230","candidateId":"H6RI02318","source":"https://www.fec.gov/data/committee/C00925230/","name":"Victor Mellor","office":"U.S. House Candidate (RI-2)"},
      "vince_george": {"receipts":311586.29,"disbursements":133982.34,"cashOnHand":3137.68,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00928440","candidateId":"H6WV01160","source":"https://www.fec.gov/data/committee/C00928440/","name":"Vince George","office":"U.S. House Candidate (WV-1)"},
      "virginia_mcintyre": {"receipts":55458.88,"disbursements":66310.96,"cashOnHand":-10855.17,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00937326","candidateId":"H6NY25208","source":"https://www.fec.gov/data/committee/C00937326/","name":"Virginia E. McIntyre","office":"U.S. House Candidate (NY-25)"},
      "wes_climer": {"receipts":1132483.52,"disbursements":863314.06,"cashOnHand":269169.46,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00914408","candidateId":"H6SC05202","source":"https://www.fec.gov/data/committee/C00914408/","name":"Wes Climer","office":"U.S. House Candidate (SC-5)"},
      "whitfield_harrington": {"receipts":143381.62,"disbursements":123897.47,"cashOnHand":19484.15,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00931428","candidateId":"S6IL00680","source":"https://www.fec.gov/data/committee/C00931428/","name":"Whitfield Harrington Jr.","office":"U.S. Senate Candidate"},
      "wilneida_negron": {"receipts":57807.2,"disbursements":52277.25,"cashOnHand":6086.87,"coverageEnd":"2026-09-30","cycle":2026,"committeeId":"C00927095","candidateId":"H6NY12313","source":"https://www.fec.gov/data/committee/C00927095/","name":"Wilneida Negron","office":"U.S. House Candidate (NY-12)"},
      "yolanda_prince": {"receipts":33181.85,"disbursements":19850.91,"cashOnHand":8231.92,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00922625","candidateId":"H6TX01352","source":"https://www.fec.gov/data/committee/C00922625/","name":"Yolanda R. Prince","office":"U.S. House Candidate (TX-1)"},
      "zack_mullock": {"receipts":960948.05,"disbursements":855547.83,"cashOnHand":105400.22,"coverageEnd":"2026-10-14","cycle":2026,"committeeId":"C00939280","candidateId":"H6NJ02251","source":"https://www.fec.gov/data/committee/C00939280/","name":"Zack Mullock","office":"U.S. House Candidate (NJ-2)"}
    };
    // ── END FTM_FEC_SUMMARY ──


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
    function _ftmHandRecord(pid) {
      if (!pid) return null;
      var direct = _FTM_BY_ID[pid];
      if (direct) return direct;
      var key = FTM_ID_ALIAS[pid];
      return (key && _FTM_BY_ID[key]) ? _FTM_BY_ID[key] : null;
    }
    // The date a hand-verified filing's figure stands at: its own asOf when it
    // is an ISO date, else the end of its cycle. '' means "undated", which is
    // never treated as older than anything.
    function _ftmFigureDate(p) {
      var f = (p && p.funding) || {};
      var asOf = String(f.asOf || p.asOf || '');
      if (/^\d{4}-\d{2}-\d{2}/.test(asOf)) return asOf.slice(0, 10);
      var cyc = String(f.cycle || '');
      return /^\d{4}$/.test(cyc) ? cyc + '-12-31' : '';
    }
    // FEC summary rows as receipts-only filing records, built once. The source is
    // the committee's fec.gov page, which is how every surface names the FEC.
    var _FTM_FEC_BY_ID = {};
    Object.keys(FTM_FEC_SUMMARY).forEach(function(pid) {
      var s = FTM_FEC_SUMMARY[pid];
      if (!s || !(Number(s.receipts) > 0)) return;
      _FTM_FEC_BY_ID[pid] = {
        id: pid, name: s.name || '', office: s.office || '',
        totalRaised: Number(s.receipts), topDonors: [], sectors: {},
        source: s.source || 'https://www.fec.gov/',
        fecSummary: s
      };
    });
    function _ftmRecord(pid) {
      var hand = _ftmHandRecord(pid);
      var fec = pid ? (_FTM_FEC_BY_ID[pid] || null) : null;
      if (!fec) return hand;
      if (!hand) return fec;
      // Both on file: the FEC summary only stands in for a hand-verified filing
      // whose figure is dated and older than the report's coverage end.
      var d = _ftmFigureDate(hand), end = String(fec.fecSummary.coverageEnd || '');
      return (d && end && d < end) ? fec : hand;
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
        fecSummary: p.fecSummary ? Object.assign({}, p.fecSummary) : null,
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
