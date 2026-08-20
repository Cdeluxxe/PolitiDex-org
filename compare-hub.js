// ─────────────────────────────────────────────────────────────────────────────
// Compare Hub + My Politicians collection
// ─────────────────────────────────────────────────────────────────────────────
// Extracted verbatim from index.html (it began at line 36328 of the pre-split
// document) as part of the first-paint pass. Not a rewrite: the code below is
// byte-for-byte what was inline, and the <script src> that replaced it sits at
// the same position in the document, so execution order and global scope are
// unchanged. It moved out so the HTML stops carrying it on every single visit —
// external scripts are cached and V8-code-cached across loads; inline script in
// a revalidated document is re-downloaded and re-compiled every time.
// ─────────────────────────────────────────────────────────────────────────────
  // ════════════════════════════════════════════════════════════
  // COMPARE HUB + MY POLITICIANS — localStorage-backed collection
  // ════════════════════════════════════════════════════════════
  (function() {
    const LOCAL_PIDS = ['trump','curtis','lee','bmoore','cox','owens','maloy','jstevenson','tlee','sadams','jpetro','mschultz','tweiler','rward','dhenderson','sreyes','ddamschen','jdougall','lfillmore','wharper','amillner','gsnow','swaldrip','cmusselman','klisonbee','jburton','jellis','sstoddard','bperry','bscott','cpetersen'];

    const DISTRICT_HOUSE_REPS = {
      district1: { pid: 'bmoore',  label: 'District 1', area: 'Weber, Davis & Northern Utah',  sublabel: 'U.S. House District 1 · Northern Utah',  photo: 'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/M001213.jpg', desc: 'Financial executive turned congressman. Ways & Means Committee. Tax, water, and Hill AFB focused.' },
      district2: { pid: 'maloy',   label: 'District 2', area: 'Rural & Southern Utah',        sublabel: 'U.S. House District 2 · Rural / Southern Utah',   photo: 'https://bioguide.congress.gov/bioguide/photo/M/M001228.jpg', desc: 'Utah attorney and first-term congresswoman. Public lands, Western water issues, and fiscal conservatism.' },
      district3: { pid: 'kennedy', label: 'District 3', area: 'Provo, Utah County, Utah',     sublabel: 'U.S. House District 3 · Provo / Utah County',     photo: 'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/K000403.jpg', desc: 'Physician, attorney, and constitutional conservative. Healthcare reform and religious liberty champion.' },
      district4: { pid: 'owens',   label: 'District 4', area: 'Salt Lake & South Valley, Utah', sublabel: 'U.S. House District 4 · Salt Lake / South Valley', photo: 'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/O000086.jpg', desc: 'Former NFL player turned congressman. Education freedom, school choice, and Second Amendment champion.' }
    };
    const STATEWIDE_META = {
      lee:    { badge: 'YOUR U.S. SENATOR', badgeClass: 'mypol-rep-badge', sublabel: 'U.S. Senate · Utah', photo: 'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/L000577.jpg', desc: 'Utah\'s senior senator since 2011. Constitutional originalist and fiscal restraint champion.' },
      curtis: { badge: 'YOUR U.S. SENATOR', badgeClass: 'mypol-rep-badge', sublabel: 'U.S. Senate · Utah', photo: 'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/C001114.jpg', desc: 'Former Provo mayor. Focuses on Western water rights, tech policy, and fiscal conservatism.' },
      cox:    { badge: 'YOUR GOVERNOR', badgeClass: 'mypol-rep-badge', sublabel: 'Governor of Utah', photo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/97/Spencer_Cox_official_photo.jpg/440px-Spencer_Cox_official_photo.jpg', desc: 'Utah\'s 18th governor. Pragmatic conservative focused on rural development, water, and mental health.' }
    };

    var BROWSE_PHOTOS = {
      curtis: 'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/C001114.jpg',
      massie: 'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/M001184.jpg',
      lee: 'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/L000577.jpg',
      cox: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/97/Spencer_Cox_official_photo.jpg/440px-Spencer_Cox_official_photo.jpg',
      trump: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/56/Donald_Trump_official_portrait.jpg/500px-Donald_Trump_official_portrait.jpg',
      mike_johnson: 'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/J000299.jpg',
      rubio: 'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/R000595.jpg',
      bessent: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d6/Official_portrait_of_Treasury_Secretary_Scott_Bessent_%28borderless%29_%28cropped%29.jpg/500px-Official_portrait_of_Treasury_Secretary_Scott_Bessent_%28borderless%29_%28cropped%29.jpg',
      cruz: 'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/C001098.jpg',
      aoc: 'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/O000172.jpg',
      bondi: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e0/Pam_Bondi_official_portrait_%28cropped%29%282%29.jpg/500px-Pam_Bondi_official_portrait_%28cropped%29%282%29.jpg',
      noem: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2a/Official_Portrait_of_Secretary_Kristi_Noem.jpg/500px-Official_Portrait_of_Secretary_Kristi_Noem.jpg',
      lutnick: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/93/Howard_Lutnick_2025.jpg/500px-Howard_Lutnick_2025.jpg',
      scalise: 'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/S001176.jpg',
      barrasso: 'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/B001261.jpg',
      emmer: 'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/E000294.jpg',
      durbin: 'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/D000563.jpg',
      kclark: 'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/C001101.jpg',
      jim_jordan: 'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/J000289.jpg',
      burgum: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4b/Doug_Burgum_2025_DOI_portrait_%28cropped%29%28b%29.jpg/500px-Doug_Burgum_2025_DOI_portrait_%28cropped%29%28b%29.jpg',
      chris_wright: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/51/Secretary_Chris_Wright_Official_Portrait.png/500px-Secretary_Chris_Wright_Official_Portrait.png',
      zeldin: 'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/Z000017.jpg',
      vought: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/06/Russell_Vought%2C_official_portrait_%282025%29_%28cropped1%29.jpg/500px-Russell_Vought%2C_official_portrait_%282025%29_%28cropped1%29.jpg',
      rollins: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a1/Second_Portrait_of_Secretary_Rollins.jpg/500px-Second_Portrait_of_Secretary_Rollins.jpg',
      grassley: 'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/G000386.jpg',
      rand_paul: 'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/P000603.jpg',
      graham: 'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/G000359.jpg',
      hawley: 'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/H001089.jpg',
      murkowski: 'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/M001153.jpg',
      warren: 'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/W000817.jpg',
      fetterman: 'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/F000479.jpg',
      booker: 'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/B001288.jpg',
      crockett: 'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/C001130.jpg',
      khanna: 'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/K000389.jpg',
      robert_garcia: 'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/G000598.jpg',
      jason_smith: 'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/S001195.jpg',
      owens: 'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/O000086.jpg',
      maloy: 'https://bioguide.congress.gov/bioguide/photo/M/M001228.jpg',
      kennedy: 'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/K000403.jpg',
      boebert: 'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/B000825.jpg',
      mtg: 'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/G000596.jpg',
      gaetz: 'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/G000578.jpg',
      tgabbard: 'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/G000571.jpg',
      bmoore: 'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/M001213.jpg',
      cstewart: 'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/S001192.jpg',
      tlee: 'https://le.utah.gov/images/legislator/LEETR.jpg',
      sadams: 'https://le.utah.gov/images/legislator/ADAMSJS.jpg',
      dmccay: 'https://le.utah.gov/images/legislator/MCCAYD.jpg',
      dowens_st: 'https://le.utah.gov/images/legislator/OWENSD.jpg',
      rob_bishop: 'https://upload.wikimedia.org/wikipedia/commons/7/7b/Rob_Bishop_official_portrait.jpg',
      jpike: 'https://insurance.utah.gov/wp-content/uploads/2026-Pike-200x300.jpg',
      jstevenson: 'https://le.utah.gov/images/legislator/STEVEJ.jpg',
      mschultz: 'https://le.utah.gov/images/legislator/SCHULTZM.jpg',
      tweiler: 'https://le.utah.gov/images/legislator/WEILERT.jpg',
      rward: 'https://le.utah.gov/images/legislator/WARDR.jpg',
      bwilson: 'https://le.utah.gov/images/legislator/WILSOB.jpg',
      cbramble: 'https://le.utah.gov/images/legislator/BRAMBLC.jpg',
      evickers: 'https://le.utah.gov/images/legislator/VICKERE.jpg',
      kcullimore: 'https://le.utah.gov/images/legislator/CULLIMK.jpg',
      ssandall: 'https://le.utah.gov/images/legislator/SANDAS.jpg',
      jdraxler: 'https://le.utah.gov/images/legislator/DRAXLJ.jpg',
      jwestwood: 'https://le.utah.gov/images/legislator/WESTWJ.jpg',
      rshipp: 'https://le.utah.gov/images/legislator/SHIPPR.jpg',
      aromero: 'https://le.utah.gov/images/legislator/ROMEROA.jpg',
      dipson: 'https://le.utah.gov/images/legislator/IPSOND.jpg',
      jteuscher: 'https://le.utah.gov/images/legislator/TEUSCHJ.jpg',
      fgibson: 'https://upload.wikimedia.org/wikipedia/commons/e/ec/Francis_Gibson_%282021%29_%28cropped%29.jpeg',
      james_dunnigan: 'https://le.utah.gov/images/legislator/DUNNIGJ.jpg',
      jknotts: 'https://le.utah.gov/images/legislator/KNOTTJ.jpg',
      rspendlove: 'https://le.utah.gov/images/legislator/SPENDLR.jpg',
      rwinterton: 'https://le.utah.gov/images/legislator/WINTERR.jpg',
      janderegg: 'https://le.utah.gov/images/legislator/ANDEREJ.jpg',
      kwan_s12: 'https://le.utah.gov/images/legislator/KWANK.jpg',
      lescamilla: 'https://le.utah.gov/images/legislator/ESCAML.jpg',
      // ── New federal U.S. House & Senate profiles (June 2026 expansion waves) ──
      // Official congressional portraits (public domain) via the unitedstates/images
      // project, keyed by Bioguide ID — the same stable source used above. These
      // are the curated fallback; if a profile later gets a `photo` in Firestore,
      // _getPhotoUrl() prefers that automatically.
      rick_crawford: 'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/C001087.jpg', // AR-01 · C001087
      french_hill: 'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/H001072.jpg', // AR-02 · H001072
      steve_womack: 'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/W000809.jpg', // AR-03 · W000809
      bruce_westerman: 'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/W000821.jpg', // AR-04 · W000821
      mariannette_miller_meeks: 'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/M001215.jpg', // IA-01 · M001215
      trent_kelly: 'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/K000388.jpg', // MS-01 · K000388
      bennie_thompson: 'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/T000193.jpg', // MS-02 · T000193
      michael_guest: 'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/G000591.jpg', // MS-03 · G000591
      mike_ezell: 'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/E000235.jpg', // MS-04 · E000235
      josh_brecheen: 'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/B001317.jpg', // OK-02 · B001317
      frank_lucas: 'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/L000491.jpg', // OK-03 · L000491
      tom_cole: 'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/C001053.jpg', // OK-04 · C001053
      stephanie_bice: 'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/B000740.jpg', // OK-05 · B000740
      don_davis: 'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/D000230.jpg', // NC-01 · D000230
      scott_perry: 'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/P000605.jpg', // PA-10 · P000605
      rob_bresnahan: 'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/B001327.jpg', // PA-08 · B001327
      ryan_mackenzie: 'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/M001230.jpg', // PA-07 · M001230
      mike_collins: 'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/C001129.jpg', // GA U.S. Senate nominee — sitting U.S. Rep (GA-10) · C001129
      jon_ossoff: 'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/O000174.jpg', // GA U.S. Senate · O000174
      collins: 'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/C001035.jpg', // ME U.S. Senate · C001035 (canonical id — `susan_collins` was merged into it, see db/vr-pid-aliases.json)
      john_cornyn: 'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/C001056.jpg', // TX U.S. Senate · C001056
      // Non-incumbent nominees / appointee with no congressional portrait —
      // official or high-quality public portraits via Wikimedia Commons (500px).
      jon_husted: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b7/Sen._Jon_Husted_official_portrait%2C_119th_Congress.jpg/500px-Sen._Jon_Husted_official_portrait%2C_119th_Congress.jpg', // OH U.S. Senate (appointed 2025) — official Senate portrait
      sherrod_brown: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Sherrod_Brown_117th_Congress_(2).jpg/500px-Sherrod_Brown_117th_Congress_(2).jpg', // OH U.S. Senate nominee — former U.S. Senator
      roy_cooper: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/30/Roy_Cooper_in_November_2023_(cropped2).jpg/500px-Roy_Cooper_in_November_2023_(cropped2).jpg', // NC U.S. Senate nominee — former NC Governor
      michael_whatley: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b5/Michael_Whatley_(54670563614)_(cropped).jpg/500px-Michael_Whatley_(54670563614)_(cropped).jpg', // NC U.S. Senate nominee — RNC chair
      ken_paxton: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/20/K_Paxton.jpg/500px-K_Paxton.jpg', // TX U.S. Senate nominee — TX Attorney General
      james_talarico: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/70/James_Talarico_Press_Conference_(cropped).jpg/500px-James_Talarico_Press_Conference_(cropped).jpg', // TX U.S. Senate nominee — TX state representative
      christina_bohannan: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/45/ChristinaBohannan.jpg/500px-ChristinaBohannan.jpg', // IA-01 nominee
      laurie_buckhout: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e4/Laurie_Buckhout.jpg/500px-Laurie_Buckhout.jpg', // NC-01 nominee
      paige_cognetti: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/fd/Paige_Cognetti_(52165104986)_(3x4a).jpg/500px-Paige_Cognetti_(52165104986)_(3x4a).jpg', // PA-08 nominee — Mayor of Scranton
      chris_jones: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/95/Chris_Jones%2C_Arkansas_gubernatorial_candidate.jpg/500px-Chris_Jones%2C_Arkansas_gubernatorial_candidate.jpg', // AR-02 nominee
      graham_platner: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1a/Platner_headshot.jpg/500px-Platner_headshot.jpg', // ME U.S. Senate nominee
      // ══ Photo audit (additive): verified official/reputable portraits ══════════
      // Federal members — official congressional portraits (public domain) via the
      // unitedstates/images project, keyed by Bioguide ID (authoritative dataset).
      aguilar: 'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/A000371.jpg',
      adam_smith: 'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/S000510.jpg', // WA-09 · S000510
      alsobrooks: 'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/A000382.jpg',
      andy_kim: 'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/K000394.jpg',
      angus_king: 'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/K000383.jpg',
      ashley_moody: 'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/M001244.jpg',
      ayanna_pressley: 'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/P000617.jpg',
      banks: 'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/B001299.jpg',
      bennet: 'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/B001267.jpg',
      blackburn: 'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/B001243.jpg',
      blumenthal: 'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/B001277.jpg',
      brendan_boyle: 'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/B001296.jpg',
      brian_mast: 'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/M001199.jpg', // FL-21 · M001199
      britt: 'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/B001319.jpg',
      chip_roy: 'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/R000614.jpg',
      chris_murphy: 'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/M001169.jpg',
      clyburn: 'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/C000537.jpg',
      coons: 'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/C001088.jpg',
      daines: 'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/D000618.jpg',
      dan_crenshaw: 'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/C001120.jpg',
      dan_goldman: 'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/G000599.jpg',
      dan_sullivan: 'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/S001198.jpg',
      deb_fischer: 'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/F000463.jpg',
      debbie_dingell: 'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/D000624.jpg',
      delia_ramirez: 'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/R000617.jpg',
      diana_degette: 'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/D000197.jpg',
      don_bacon: 'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/B001298.jpg',
      donalds: 'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/D000032.jpg',
      duckworth: 'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/D000622.jpg',
      ernst: 'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/E000295.jpg',
      fitzpatrick: 'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/F000466.jpg',
      gallego: 'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/G000574.jpg',
      gillibrand: 'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/G000555.jpg',
      greg_landsman: 'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/L000601.jpg',
      hagerty: 'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/H000601.jpg',
      haley_stevens: 'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/S001215.jpg', // MI-11 · S001215
      hickenlooper: 'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/H000273.jpg',
      hirono: 'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/H001042.jpg',
      hoeven: 'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/H001061.jpg',
      jake_auchincloss: 'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/A000148.jpg',
      jan_schakowsky: 'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/S001145.jpg',
      jared_golden: 'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/G000592.jpg',
      jayapal: 'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/J000298.jpg',
      jeffries: 'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/J000294.jpg',
      jim_justice: 'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/J000312.jpg',
      jim_mcgovern: 'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/M000312.jpg',
      josh_gottheimer: 'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/G000583.jpg',
      kaine: 'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/K000384.jpg',
      kennedy_john: 'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/K000393.jpg',
      kevin_cramer: 'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/C001096.jpg',
      kevin_hern: 'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/H001082.jpg',
      klobuchar: 'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/K000367.jpg',
      lankford: 'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/L000575.jpg',
      lummis: 'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/L000571.jpg',
      luna: 'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/L000596.jpg',
      maggie_hassan: 'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/H001076.jpg',
      mark_kelly: 'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/K000377.jpg',
      markey: 'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/M000133.jpg',
      maxwell_frost: 'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/F000476.jpg',
      mcclain: 'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/M001136.jpg',
      mcconnell: 'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/M000355.jpg',
      mccormick: 'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/M001243.jpg',
      meeks: 'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/M001137.jpg', // NY-05 · M001137
      merkley: 'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/M001176.jpg',
      mike_lawler: 'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/L000599.jpg',
      mike_rounds: 'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/R000605.jpg',
      mike_waltz: 'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/W000823.jpg', // FL-06, 116th-119th · W000823
      moreno: 'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/M001242.jpg',
      mullin: 'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/M001190.jpg',
      nadler: 'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/N000002.jpg',
      nancy_mace: 'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/M000194.jpg',
      omar: 'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/O000173.jpg',
      padilla: 'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/P000145.jpg',
      raja_krishnamoorthi: 'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/K000391.jpg',
      reed: 'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/R000122.jpg', // RI Sen · R000122
      rick_larsen: 'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/L000560.jpg',
      rick_scott: 'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/S001217.jpg',
      ricketts: 'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/R000618.jpg',
      risch: 'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/R000584.jpg', // ID Sen · R000584
      roger_marshall: 'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/M001198.jpg',
      ron_johnson: 'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/J000293.jpg',
      rosen: 'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/R000608.jpg',
      sanders: 'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/S000033.jpg',
      sarah_mcbride: 'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/M001238.jpg',
      schatz: 'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/S001194.jpg',
      schiff: 'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/S001150.jpg',
      schmitt: 'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/S001227.jpg',
      schumer: 'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/S000148.jpg',
      seth_moulton: 'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/M001196.jpg',
      shaheen: 'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/S001181.jpg', // NH Sen · S001181
      sheehy: 'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/S001232.jpg',
      slotkin: 'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/S001208.jpg',
      stefanik: 'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/S001196.jpg',
      steny_hoyer: 'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/H000874.jpg',
      summer_lee: 'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/L000602.jpg',
      tammy_baldwin: 'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/B001230.jpg',
      ted_budd: 'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/B001305.jpg',
      ted_lieu: 'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/L000582.jpg',
      thune: 'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/T000250.jpg',
      tillis: 'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/T000476.jpg',
      tim_scott: 'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/S001184.jpg', // SC Sen · S001184
      tina_smith: 'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/S001203.jpg',
      tlaib: 'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/T000481.jpg',
      todd_young: 'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/Y000064.jpg',
      tom_suozzi: 'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/S001201.jpg',
      tommy_tuberville: 'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/T000278.jpg',
      torres: 'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/T000486.jpg',
      warnock: 'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/W000790.jpg',
      welch: 'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/W000800.jpg',
      // Governors, attorneys general & state legislative leaders — official/reputable
      // portraits via Wikimedia Commons (Wikipedia pageimages; name+state verified).
      aaron_ford: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5c/Nevada_Attorney_General_Aaron_Ford_addresses_the_United_Nations_Human_Rights_Committee%2C_October_17-18%2C_2023_1_%28cropped%29.jpg/500px-Nevada_Attorney_General_Aaron_Ford_addresses_the_United_Nations_Human_Rights_Committee%2C_October_17-18%2C_2023_1_%28cropped%29.jpg',
      andy_beshear: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Andy_Beshear_in_April_2026_%28cropped%29.jpg/500px-Andy_Beshear_in_April_2026_%28cropped%29.jpg',
      ben_albritton: 'https://upload.wikimedia.org/wikipedia/commons/8/83/Ben_Albritton_Portrait.jpg',
      bill_ferguson: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/48/Bill_Ferguson_%2852885272108%29.jpg/500px-Bill_Ferguson_%2852885272108%29.jpg',
      bill_lee: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/21/Hob_Nob_on_the_State_Line_with_Tennessee_Governor_Bill_Lee%2C_Bristol_%28cropped%29.2.jpg/500px-Hob_Nob_on_the_State_Line_with_Tennessee_Governor_Bill_Lee%2C_Bristol_%28cropped%29.2.jpg',
      bob_ferguson: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8e/Bob_Ferguson_at_his_2023_Shrimp_Feed_02_%28cropped%29.jpg/500px-Bob_Ferguson_at_his_2023_Shrimp_Feed_02_%28cropped%29.jpg',
      brad_little: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/bc/Brad_Little_official_photo.jpg/500px-Brad_Little_official_photo.jpg',
      brenna_bird: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e3/Brenna_Bird_by_Gage_Skidmore_2.jpg/500px-Brenna_Bird_by_Gage_Skidmore_2.jpg',
      brian_kemp: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e3/Brian_Kemp_portrait%2C_2024_%28cropped%29.jpg/500px-Brian_Kemp_portrait%2C_2024_%28cropped%29.jpg',
      cameron_sexton: 'https://upload.wikimedia.org/wikipedia/commons/f/f5/TN_Speaker_Cameron_Sexton.jpg',
      carl_heastie: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/09/MTA_Officially_Renames_Two_Brooklyn_Subway_Stations_%2850405873761%29_%28cropped%29.jpg/500px-MTA_Officially_Renames_Two_Brooklyn_Subway_Stations_%2850405873761%29_%28cropped%29.jpg',
      chris_carr: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ea/Christopher_M._Carr_by_Gage_Skidmore_%28cropped%29.jpg/500px-Christopher_M._Carr_by_Gage_Skidmore_%28cropped%29.jpg',
      chris_welch: 'https://upload.wikimedia.org/wikipedia/commons/b/b2/Chris_Welch_May_2023.jpg',
      dan_mckee: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1b/RI_Governor_Daniel_McKee.jpg/500px-RI_Governor_Daniel_McKee.jpg',
      dan_patrick: 'https://upload.wikimedia.org/wikipedia/commons/4/41/Dan_Patrick_Texas_%28cropped%29.jpg',
      dana_nessel: 'https://upload.wikimedia.org/wikipedia/commons/5/52/Dana_Nessel_Michigan_Is_Preparing_for_%27Every_Scenario%27_on_Election_Day_THE_CIRCUS_SHOWTIME_0-25_screenshot_%28cropped%29.jpg',
      daniel_perez_fl: 'https://upload.wikimedia.org/wikipedia/commons/d/d9/Official_Portrait_of_Daniel_Perez.jpg',
      dave_sunday: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a0/Dave_Sunday_by_Gage_Skidmore.jpg/500px-Dave_Sunday_by_Gage_Skidmore.jpg',
      dave_yost: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1f/Dave_Yost_at_Federalist_Society_2.jpg/500px-Dave_Yost_at_Federalist_Society_2.jpg',
      destin_hall: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7e/Rep._Destin_Hall.jpg/500px-Rep._Destin_Hall.jpg',
      don_harmon: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/32/Don_Harmon_%28cropped_more%29.jpeg/500px-Don_Harmon_%28cropped_more%29.jpeg',
      don_scott: 'https://upload.wikimedia.org/wikipedia/commons/3/39/Virginia_Delegate_Don_Scott_%28cropped%29.jpg',
      dunleavy: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9f/Governor_Mike_J._Dunleavy_-_Official_Portrait.jpg/500px-Governor_Mike_J._Dunleavy_-_Official_Portrait.jpg',
      dustin_burrows: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/14/Dustin_Burrows_%282%29.png/500px-Dustin_Burrows_%282%29.png',
      erin_murphy: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6b/Erin_Murphy.jpg/500px-Erin_Murphy.jpg',
      evers: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/08/Tony_Evers_-_2022_%28a%29.jpg/500px-Tony_Evers_-_2022_%28a%29.jpg',
      gavin_newsom: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/90/Governor_of_California_Gavin_Newsom_%28cropped_3x4%29.jpg/500px-Governor_of_California_Gavin_Newsom_%28cropped_3x4%29.jpg',
      gene_wu: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2f/Gene_Wu_2.jpg/500px-Gene_Wu_2.jpg',
      glenn_youngkin: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/27/Youngkin_Governor_Portrait.jpg/500px-Youngkin_Governor_Portrait.jpg',
      greg_abbott: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/db/Greg_Abbott_at_NASA_2024_%28cropped%29.jpg/500px-Greg_Abbott_at_NASA_2024_%28cropped%29.jpg',
      greg_gianforte: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5c/Greg_Gianforte_in_2025_%28cropped%29.jpg/500px-Greg_Gianforte_in_2025_%28cropped%29.jpg',
      greta_neubauer: 'https://upload.wikimedia.org/wikipedia/commons/5/50/Greta_Neubauer_Bans_off_our_Bodies_%28cropped%29.jpg',
      gretchen_whitmer: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2e/2025_Gretchen_Whitmer_%28cropped%29.jpg/500px-2025_Gretchen_Whitmer_%28cropped%29.jpg',
      heath_flora: 'https://upload.wikimedia.org/wikipedia/commons/2/2e/Heath_Flora%2C_2020_%28cropped%29.jpg',
      henry_mcmaster: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/78/Henry_McMaster_in_2026_%28cropped%29.jpg/500px-Henry_McMaster_in_2026_%28cropped%29.jpg',
      james_coleman: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f3/James_Coleman_and_Paul_Lundeen_%28cropped%29.jpg/500px-James_Coleman_and_Paul_Lundeen_%28cropped%29.jpg',
      james_uthmeier: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/df/Official_portrait_of_Attorney_General_James_Uthmeier%2C_2025_%28cropped%29.jpg/500px-Official_portrait_of_Attorney_General_James_Uthmeier%2C_2025_%28cropped%29.jpg',
      janet_mills: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a8/Maine_congressional_delegation_meets_with_Gov_Janet_Mills_%28cropped%29.jpg/500px-Maine_congressional_delegation_meets_with_Gov_Janet_Mills_%28cropped%29.jpg',
      jared_polis: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/46/Jared_Polis_in_2026.jpg/500px-Jared_Polis_in_2026.jpg',
      jay_costa: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/79/Gov._Wolf_Cuts_Ribbon_on_Fern_Hollow_Bridge%2C_Celebrates_Government_That_Works_for_Pennsylvania_%2852578635480%29_%28cropped%29.jpg/500px-Gov._Wolf_Cuts_Ribbon_on_Fern_Hollow_Bridge%2C_Celebrates_Government_That_Works_for_Pennsylvania_%2852578635480%29_%28cropped%29.jpg',
      jb_pritzker: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/53/Governor_JB_Pritzker_official_portrait_2019_%28crop%29.jpg/500px-Governor_JB_Pritzker_official_portrait_2019_%28crop%29.jpg',
      jeff_landry: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d2/Jeff_Landry_2025.jpg/500px-Jeff_Landry_2025.jpg',
      jim_pillen: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/22/Jim_Pillen_SelectUSA_%2855251574792%29.jpg/500px-Jim_Pillen_SelectUSA_%2855251574792%29.jpg',
      joanna_mcclinton: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8b/Joanna_McClinton_-_Gov._Wolf_Joins_Educators_in_Celebrating_Historic_Education_Funding_for_Public_Schools_%2852311414245%29_%28cropped%29.jpg/500px-Joanna_McClinton_-_Gov._Wolf_Joins_Educators_in_Celebrating_Historic_Education_Funding_for_Public_Schools_%2852311414245%29_%28cropped%29.jpg',
      joe_lombardo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f9/Joe_Lombardo_by_Gage_Skidmore_%283x4_cropped%29.jpg/500px-Joe_Lombardo_by_Gage_Skidmore_%283x4_cropped%29.jpg',
      jon_burns: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a0/Official_headshot_of_Jon_Burns.jpg/500px-Official_headshot_of_Jon_Burns.jpg',
      jonathan_skrmetti: 'https://upload.wikimedia.org/wikipedia/commons/6/6c/Jonathan_Skrmetti_Tennessee_AG.png',
      josh_green: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0e/Josh_Green_Official_Photo_2022_%28cropped%29_1cropped%29.jpg/500px-Josh_Green_Official_Photo_2022_%28cropped%29_1cropped%29.jpg',
      josh_kaul: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ef/Josh_Kaul-13_-_44610449305_%283x4b%29.jpg/500px-Josh_Kaul-13_-_44610449305_%283x4b%29.jpg',
      josh_shapiro: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/26/Josh_Shapiro_December_2025.jpg/500px-Josh_Shapiro_December_2025.jpg',
      josh_stein: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/bc/Josh_Stein_SelectUSA_%2855252715239%29.jpg/500px-Josh_Stein_SelectUSA_%2855252715239%29.jpg',
      julie_fahey: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b8/Julie_Fahey_Official_Head_Shot.jpg/500px-Julie_Fahey_Official_Head_Shot.jpg',
      karen_spilka: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/67/Karen_E._Spilka.jpg/500px-Karen_E._Spilka.jpg',
      kathy_hochul: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/25/Kathy_Hochul_March_2024.jpg/500px-Kathy_Hochul_March_2024.jpg',
      katie_hobbs: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/02/Katie_Hobbs_2026.jpg/500px-Katie_Hobbs_2026.jpg',
      kay_ivey: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2c/Governor_Kay_Ivey_2017_%28cropped%29.jpg/500px-Governor_Kay_Ivey_2017_%28cropped%29.jpg',
      keith_ellison: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/62/Keith_Ellison_portrait.jpg/500px-Keith_Ellison_portrait.jpg',
      kelly_armstrong: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d3/Kelly_Armstrong_%283x4_cropped%29_%282%29.jpg/500px-Kelly_Armstrong_%283x4_cropped%29_%282%29.jpg',
      kelly_ayotte: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/98/Governor_Kelly_Ayotte_receives_a_briefing_from_National_Guard_cyber_operators_%28cropped%29_%28cropped%29.jpg/500px-Governor_Kelly_Ayotte_receives_a_briefing_from_National_Guard_cyber_operators_%28cropped%29_%28cropped%29.jpg',
      kevin_stitt: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/96/Kevin_Stitt_%2855103789989%29_%28cropped%29.jpg/500px-Kevin_Stitt_%2855103789989%29_%28cropped%29.jpg',
      kim_reynolds: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5d/Kim_Reynolds_by_Gage_Skidmore_2.jpg/500px-Kim_Reynolds_by_Gage_Skidmore_2.jpg',
      kim_ward: 'https://upload.wikimedia.org/wikipedia/commons/f/f6/Kim_Ward.jpg',
      kris_kobach: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e1/Kris_Kobach_official_portrait%2C_2024.jpg/500px-Kris_Kobach_official_portrait%2C_2024.jpg',
      kris_mayes: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f2/Kris_Mayes_%2852365525231%29_%28cropped%29.jpg/500px-Kris_Mayes_%2852365525231%29_%28cropped%29.jpg',
      kwame_raoul: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a7/Kwame_Raoul_RFCG.jpg/500px-Kwame_Raoul_RFCG.jpg',
      larry_rhoden: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e3/Larry_Rhoden_2025_%28cropped%29.jpg/500px-Larry_Rhoden_2025_%28cropped%29.jpg',
      laura_kelly: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0f/Laura_Kelly_official_photo.jpg/500px-Laura_Kelly_official_photo.jpg',
      laurie_jinkins: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/77/Laurie_Jinkins.jpg/500px-Laurie_Jinkins.jpg',
      letitia_james: 'https://upload.wikimedia.org/wikipedia/commons/7/75/Letitia_James_Interview_Feb_2020.png',
      lisa_demuth: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a2/May_10%2C_2025_Lisa_Demuth_Fishing_Opener.jpg/500px-May_10%2C_2025_Lisa_Demuth_Fishing_Opener.jpg',
      liz_murrill: 'https://upload.wikimedia.org/wikipedia/commons/2/2f/Liz_Murrill_2024_%28cropped%29.jpg',
      lujan: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7e/Ben_Ray_Luj%C3%A1n%2C_official_portrait_%28119th_Congress%29.jpg/500px-Ben_Ray_Luj%C3%A1n%2C_official_portrait_%28119th_Congress%29.jpg',
      mark_gordon: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8b/Wyoming_Governor_Mark_Gordon_expands_partnership_with_Tunisia_to_enhance_agriculture_and_civil_protection_%284%29_%28cropped%29.jpg/500px-Wyoming_Governor_Mark_Gordon_expands_partnership_with_Tunisia_to_enhance_agriculture_and_civil_protection_%284%29_%28cropped%29.jpg',
      matt_hall: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/75/Matt_Hall_in_2024_%28cropped%29.jpg/500px-Matt_Hall_in_2024_%28cropped%29.jpg',
      matt_huffman: 'https://upload.wikimedia.org/wikipedia/commons/0/06/Matt_Huffman.jpg',
      matt_meyer: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a6/%2802-19-2025%29_Matt_Meyer.jpg/500px-%2802-19-2025%29_Matt_Meyer.jpg',
      matt_ritter: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/39/MattRitterCT.png/500px-MattRitterCT.png',
      maura_healey: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/39/Maura_Healey%2C_official_portrait%2C_governor.jpg/500px-Maura_Healey%2C_official_portrait%2C_governor.jpg',
      michelle_lujan_grisham: 'https://upload.wikimedia.org/wikipedia/commons/b/b9/Michelle_Lujan_Grisham_2026.jpg',
      mike_braun: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/77/Governor_Mike_Braun_DHS.jpg/500px-Governor_Mike_Braun_DHS.jpg',
      mike_dewine: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3c/Gov-Mike-DeWine.jpg/500px-Gov-Mike-DeWine.jpg',
      mike_kehoe: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/48/Mike_Kehoe_2025_%28cropped%29.jpg/500px-Mike_Kehoe_2025_%28cropped%29.jpg',
      mike_mcguire: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/06/State_Senator_Mike_McGuire.jpg/500px-State_Senator_Mike_McGuire.jpg',
      mikie_sherrill: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/22/Governor_of_New_Jersey_Rebecca_Michelle_%22Mikie%22_Sherrill.jpg/500px-Governor_of_New_Jersey_Rebecca_Michelle_%22Mikie%22_Sherrill.jpg',
      murrell_smith: 'https://upload.wikimedia.org/wikipedia/commons/1/13/Murrell_Smith_%28cropped%29.png',
      ned_lamont: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b8/Governor_Ned_Lamont_of_Connecticut%2C_official_portrait.jpg/500px-Governor_Ned_Lamont_of_Connecticut%2C_official_portrait.jpg',
      neguse: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b0/Joe_Neguse%2C_official_portrait%2C_116th_Congress.jpg/500px-Joe_Neguse%2C_official_portrait%2C_116th_Congress.jpg',
      pat_grassley: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/38/Pat_Grassley_88th_General_Assembly_Portrait.jpg/500px-Pat_Grassley_88th_General_Assembly_Portrait.jpg',
      patrick_morrisey: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e1/Patrick_Morrisey_2026.jpg/500px-Patrick_Morrisey_2026.jpg',
      phil_berger: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4c/Senator_Phil_Berger_2023-25_Legislative_Portrait.jpg/500px-Senator_Phil_Berger_2023-25_Legislative_Portrait.jpg',
      phil_scott: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/cc/Phil_Scott_2019.png/500px-Phil_Scott_2019.png',
      phillip_devillier: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a0/Phillip_DeVillier.jpg/500px-Phillip_DeVillier.jpg',
      raul_labrador: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5b/Raul_Labrador_115th.jpg/500px-Raul_Labrador_115th.jpg',
      rob_bonta: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/22/Rob_Bonta_official_portrait_%28cropped%29.jpg/500px-Rob_Bonta_official_portrait_%28cropped%29.jpg',
      robert_rivas: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/dc/Robert_Rivas_official_speaker_portrait.jpg/500px-Robert_Rivas_official_speaker_portrait.jpg',
      robert_stivers: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f0/Senator_Robert_Stivers.jpg/500px-Senator_Robert_Stivers.jpg',
      robin_vos: 'https://upload.wikimedia.org/wikipedia/commons/1/1f/Robin_Vos_speaks_at_Racine_Tea_Party_event_%288378614585%29.jpg',
      ron_desantis: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4f/Ron_DeSantis_official_photo.jpg/500px-Ron_DeSantis_official_photo.jpg',
      ron_mariano: 'https://upload.wikimedia.org/wikipedia/commons/9/9f/Speaker_Ronald_Mariano.jpg',
      ryan_fecteau: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/cb/SpeakerRyanFecteau.jpg/500px-SpeakerRyanFecteau.jpg',
      sarah_huckabee_sanders: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/bd/Governor_Sarah_Huckabee_Sanders_2026.jpg/500px-Governor_Sarah_Huckabee_Sanders_2026.jpg',
      sharon_carson: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d1/Sharon_Carson_The_Benefits_of_Family_%281%29_%28cropped%29.jpg/500px-Sharon_Carson_The_Benefits_of_Family_%281%29_%28cropped%29.jpg',
      stewart_cousins: 'https://upload.wikimedia.org/wikipedia/commons/f/fe/%2801-28-20%29NYS_Senate_Majority_Leader_Andrea_Stewart_-Cousins_%28cropped%29.jpg',
      tate_reeves: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/92/Gov._Tate_Reeves_Signs_House_Bill_1486_%28cropped%29_%282%29.jpg/500px-Gov._Tate_Reeves_Signs_House_Bill_1486_%28cropped%29_%282%29.jpg',
      tim_walz: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3a/Governor_Tim_Walz_2026.jpg/500px-Governor_Tim_Walz_2026.jpg',
      tina_kotek: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a3/Tina_Kotek_official_portrait_2021%283x4_cropped%29.jpg/500px-Tina_Kotek_official_portrait_2021%283x4_cropped%29.jpg',
      todd_huston: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c7/SOTS_%282_of_52%29_%2851815593427%29_%28cropped%29.jpg/500px-SOTS_%282_of_52%29_%2851815593427%29_%28cropped%29.jpg',
      warren_petersen: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e8/Warren_Petersen_by_Gage_Skidmore_2.jpg/500px-Warren_Petersen_by_Gage_Skidmore_2.jpg',
      wes_moore: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c3/Wes_Moore_Official_Governor_Portrait.jpg/500px-Wes_Moore_Official_Governor_Portrait.jpg',

      // ── Coverage pass: faces for the share / arrival pool ────────────────────
      // Added so a cold #record= arrival, an Official Record share card, a profile
      // hero and a browse/search row all paint the same real face. Every URL below
      // was confirmed HTTP 200 image/* before being added; anyone without a
      // confirmable public portrait is deliberately absent and keeps the honest
      // party-tinted initials fallback.
      //
      // Sitting members of Congress use the official unitedstates/images portrait,
      // keyed by Bioguide ID resolved from the authoritative dataset
      // (https://unitedstates.github.io/congress-legislators/legislators-current.json).
      //
      // Executive/state officials use the hash-independent Commons redirect,
      //   https://commons.wikimedia.org/wiki/Special:FilePath/<File>?width=500
      // rather than the upload.wikimedia.org/.../thumb/<hash>/... form used above.
      // Same trusted host family, but the thumb form embeds the file's MD5 path and
      // has already 404d on this project twice when a file was re-uploaded (see
      // scripts/add-missing-photos.mjs). Special:FilePath survives a re-hash.
      blunt_rochester:          'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/B001303.jpg', // Lisa Blunt Rochester — Sen, DE
      chellie_pingree:          'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/P000597.jpg', // Chellie Pingree — Rep, ME-01
      cortez_masto:             'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/C001113.jpg', // Catherine Cortez Masto — Sen, NV
      julie_fedorchak:          'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/F000482.jpg', // Julie Fedorchak — Rep, ND-AL
      marie_gluesenkamp_perez:  'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/G000600.jpg', // Marie Gluesenkamp Perez — Rep, WA-03
      maxine_waters:            'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/W000187.jpg', // Maxine Waters — Rep, CA-43
      mike_flood:               'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/F000474.jpg', // Mike Flood — Rep, NE-01
      mike_simpson:             'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/S001148.jpg', // Michael K. Simpson — Rep, ID-02
      troy_downing:             'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/D000634.jpg', // Troy Downing — Rep, MT-02
      van_hollen:               'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/V000128.jpg', // Chris Van Hollen — Sen, MD

      // ── The people who run the committees ────────────────────────────────
      // This map is a curated shelf, not a census, and for a long time it skipped
      // almost every House chair and ranking member — the committee gavels were
      // simply never anyone's turn to add. That went unnoticed while the map was
      // only a photo fallback. It stopped being invisible when the Voting Record
      // roster was widened to attribute roll calls to them: db/vr-member-map.json
      // is derived from the portraits below, so a member with no face here could
      // not be attributed a vote at all, and the profiles of the members chairing
      // Agriculture, Appropriations, Budget, Education & Workforce, Energy &
      // Commerce, Homeland Security, House Administration, Judiciary, Natural
      // Resources, Oversight, Rules, Science, Small Business, Transportation &
      // Infrastructure, Veterans' Affairs and Ways & Means each read as though
      // that member had barely voted.
      //
      // Each Bioguide was resolved by full name + state + chamber against the
      // authoritative dataset and each URL confirmed HTTP 200 image/jpeg, on the
      // same official portrait host the rest of this block uses.
      andy_harris:              'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/H001052.jpg', // Andy Harris — Rep, MD-01
      angie_craig:              'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/C001119.jpg', // Angie Craig — Rep, MN-02
      arrington:                'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/A000375.jpg', // Jodey C. Arrington — Rep, TX-19
      brian_babin:              'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/B001291.jpg', // Brian Babin — Rep, TX-36
      bryan_steil:              'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/S001213.jpg', // Bryan Steil — Rep, WI-01
      comer:                    'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/C001108.jpg', // James Comer — Rep, KY-01
      delauro:                  'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/D000216.jpg', // Rosa L. DeLauro — Rep, CT-03
      foxx:                     'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/F000450.jpg', // Virginia Foxx — Rep, NC-05
      garbarino:                'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/G000597.jpg', // Andrew R. Garbarino — Rep, NY-02
      glenn_thompson:           'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/T000467.jpg', // Glenn Thompson — Rep, PA-15
      guthrie:                  'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/G000558.jpg', // Brett Guthrie — Rep, KY-02
      jared_huffman:            'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/H001068.jpg', // Jared Huffman — Rep, CA-02
      jim_himes:                'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/H001047.jpg', // James A. Himes — Rep, CT-04
      mike_bost:                'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/B001295.jpg', // Mike Bost — Rep, IL-12
      neal:                     'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/N000015.jpg', // Richard E. Neal — Rep, MA-01
      pallone:                  'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/P000034.jpg', // Frank Pallone, Jr. — Rep, NJ-06
      raskin:                   'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/R000606.jpg', // Jamie Raskin — Rep, MD-08
      roger_williams:           'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/W000816.jpg', // Roger Williams — Rep, TX-25
      sam_graves:               'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/G000546.jpg', // Sam Graves — Rep, MO-06
      takano:                   'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/T000472.jpg', // Mark Takano — Rep, CA-39
      walberg:                  'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/W000798.jpg', // Tim Walberg — Rep, MI-05
      zoe_lofgren:              'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/L000397.jpg', // Zoe Lofgren — Rep, CA-18

      // ── …and the senators who chair the committees ───────────────────────
      // The same omission on the other side of the Capitol, found the same way:
      // forty of the fifty-five sitting senators the app profiles already had a
      // portrait here, and the fifteen without one were disproportionately the
      // gavels — Appropriations, Armed Services, Agriculture, Commerce, Energy
      // & Natural Resources, Environment & Public Works, Finance, HELP,
      // Homeland Security, Intelligence and Veterans' Affairs. Each Bioguide was
      // confirmed against the authoritative dataset and each URL returned HTTP
      // 200 image/jpeg. (Ben Ray Luján is the fifteenth; his curated photo is a
      // Commons upload and he is named in vr-gen-member-map.mjs's SEED_SLUGS
      // instead, because a Commons URL carries no readable Bioguide.)
      boozman:                  'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/B001236.jpg', // John Boozman — Sen, AR
      cantwell:                 'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/C000127.jpg', // Maria Cantwell — Sen, WA
      capito:                   'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/C001047.jpg', // Shelley Moore Capito — Sen, WV
      cassidy:                  'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/C001075.jpg', // Bill Cassidy — Sen, LA
      cotton:                   'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/C001095.jpg', // Tom Cotton — Sen, AR
      crapo:                    'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/C000880.jpg', // Mike Crapo — Sen, ID
      heinrich:                 'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/H001046.jpg', // Martin Heinrich — Sen, NM
      jerry_moran:              'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/M000934.jpg', // Jerry Moran — Sen, KS
      murray:                   'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/M001111.jpg', // Patty Murray — Sen, WA
      peters:                   'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/P000595.jpg', // Gary C. Peters — Sen, MI
      warner:                   'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/W000805.jpg', // Mark R. Warner — Sen, VA
      whitehouse:               'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/W000802.jpg', // Sheldon Whitehouse — Sen, RI
      wicker:                   'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/W000437.jpg', // Roger F. Wicker — Sen, MS
      wyden:                    'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/W000779.jpg', // Ron Wyden — Sen, OR

      adrian_fontes:            'https://commons.wikimedia.org/wiki/Special:FilePath/Adrian_Fontes_2025.jpg?width=500', // Adrian Fontes — Secretary of State, AZ
      al_schmidt:               'https://commons.wikimedia.org/wiki/Special:FilePath/Al_Schmidt.jpg?width=500', // Al Schmidt — Secretary of the Commonwealth, PA
      brad_raffensperger:       'https://commons.wikimedia.org/wiki/Special:FilePath/SoS_HeadshotRaffensperger.jpg?width=500', // Brad Raffensperger — Secretary of State, GA
      cisco_aguilar:            'https://commons.wikimedia.org/wiki/Special:FilePath/Francisco_Aguilar%2C_Secretary_of_State_of_Nevada%2C_2024.jpg?width=500', // Cisco Aguilar — Secretary of State, NV
      diego_morales:            'https://commons.wikimedia.org/wiki/Special:FilePath/Diego_Morales_DC.png?width=500', // Diego Morales — Secretary of State, IN
      frank_larose:             'https://commons.wikimedia.org/wiki/Special:FilePath/Frank_LaRose_by_Gage_Skidmore.jpg?width=500', // Frank LaRose — Secretary of State, OH
      hassett:                  'https://commons.wikimedia.org/wiki/Special:FilePath/Kevin_Hassett_official_photo_(cropped)(2).jpg?width=500', // Kevin Hassett — Director, National Economic Council
      hegseth:                  'https://commons.wikimedia.org/wiki/Special:FilePath/Pete_Hegseth_Official_Portrait_(cropped)(b).jpg?width=500', // Pete Hegseth — Secretary of Defense
      jane_nelson_tx:           'https://commons.wikimedia.org/wiki/Special:FilePath/Sec-Jane-Nelson-TX.jpg?width=500', // Jane Nelson — Secretary of State, TX
      jeff_jackson:             'https://commons.wikimedia.org/wiki/Special:FilePath/Rep._Jeff_Jackson_-_118th_Congress.jpg?width=500', // Jeff Jackson — Attorney General, NC
      jena_griswold:            'https://commons.wikimedia.org/wiki/Special:FilePath/Jena_Griswold.JPG?width=500', // Jena Griswold — Secretary of State, CO
      jocelyn_benson:           'https://commons.wikimedia.org/wiki/Special:FilePath/SOS_Jocelyn_Benson_web.jpg?width=500', // Jocelyn Benson — Secretary of State, MI
      maggie_toulouse_oliver:   'https://commons.wikimedia.org/wiki/Special:FilePath/Maggie_Toulouse_Oliver.jpg?width=500', // Maggie Toulouse Oliver — Secretary of State, NM
      michael_adams_ky:         'https://commons.wikimedia.org/wiki/Special:FilePath/Michael_Adams.jpg?width=500', // Michael Adams — Secretary of State, KY
      michael_watson_ms:        'https://commons.wikimedia.org/wiki/Special:FilePath/Michael_Watson.png?width=500', // Michael Watson — Secretary of State, MS
      shirley_weber:            'https://commons.wikimedia.org/wiki/Special:FilePath/Shirley_Weber.jpg?width=500', // Shirley Weber — Secretary of State, CA
      stephen_miran:            'https://commons.wikimedia.org/wiki/Special:FilePath/Official_portrait_of_Governor_Stephen_I._Miran_HIGH_RES_miran_stephen_(54810191208)_(cropped).jpg?width=500', // Stephen Miran — Chair, Council of Economic Advisers
      steve_hobbs:              'https://commons.wikimedia.org/wiki/Special:FilePath/Steve_Hobbs.jpg?width=500', // Steve Hobbs — Secretary of State, WA
      steve_simon:              'https://commons.wikimedia.org/wiki/Special:FilePath/2026SteveSimon.jpg?width=500', // Steve Simon — Secretary of State, MN
    };
    // Expose the curated headshot map globally so the single-source-of-truth
    // _getPhotoUrl() (defined in a SEPARATE <script> closure, where this `var`
    // isn't in scope) can use it as the guaranteed fallback. Without this, any
    // surface driven by _getPhotoUrl — e.g. the "See who's running in my races"
    // cards — falls back to a bare 👤 icon for anyone whose photo lives only here
    // and hasn't been hydrated from Firestore yet.
    try { window.BROWSE_PHOTOS = BROWSE_PHOTOS; } catch (e) {}

    let _selectedDistrict = 'district1';
    const DISTRICT_KEY = 'politidex_district';

    function _getSelectedDistrict() {
      try {
        const saved = localStorage.getItem(DISTRICT_KEY);
        if (saved && DISTRICT_HOUSE_REPS[saved]) return saved;
      } catch(e) {}
      return 'district1';
    }

    function _getPrimaryReps() {
      if (!window._hasUserLocation) return [];
      var userLoc = window._currentVoterLocation || { state: '', county: '', district: '' };
      var userState = (userLoc.state || '').toLowerCase().trim();
      var userCounty = (userLoc.county || userLoc.city || '').toLowerCase().trim();
      var userDistrict = (userLoc.district || '').replace(/[^0-9]/g, '');

      var userDistNum = userDistrict ? parseInt(userDistrict, 10) : NaN;

      var reps = [];
      Object.keys(CMP_DATA).forEach(function(pid) {
        var d = CMP_DATA[pid];
        var polStateRaw = (d.state || '').toLowerCase();
        var polOffice = (d.office || '').toLowerCase();

        // Resolve the politician's state through the authoritative helper rather
        // than a raw substring test. A bare/Firestore-overwritten state field
        // ("District 2", "House District 9") does not literally contain "utah", so
        // the old `indexOf` check silently dropped the voter's own representatives.
        var polState = _getPoliticianState(pid).toLowerCase();
        if (!polState || polState === 'national') return;
        if (userState && polState !== userState &&
            polState.indexOf(userState) === -1 && userState.indexOf(polState) === -1) return;

        // Statewide offices (U.S. Senator, Governor, Attorney General, Auditor,
        // Treasurer) represent every voter in the state.
        if (polOffice.includes('senator') || polOffice.includes('governor') || polOffice.includes('auditor') || polOffice.includes('attorney general') || polOffice.includes('treasurer')) {
          reps.push(pid);
          return;
        }

        var isUSHouse = polOffice.indexOf('u.s. rep') !== -1 || polOffice.indexOf('u.s. house') !== -1 ||
                        polOffice.indexOf('us house') !== -1 ||
                        (polOffice.indexOf('representative') !== -1 && polOffice.indexOf('state') === -1);

        // U.S. House seats match ONLY on the voter's congressional district. The
        // district number is read through _relevantDistNum, which normalizes every
        // record format and is Firestore-safe, so a District 1 voter gets ONLY the
        // District 1 representative and never a neighboring district's. House reps
        // are deliberately excluded from the county fallback below — county text
        // must never pull in a rep from the wrong district.
        if (isUSHouse) {
          if (isNaN(userDistNum)) return;
          var polDistNum = _relevantDistNum(pid);
          if (polDistNum !== null && polDistNum === userDistNum) reps.push(pid);
          return;
        }

        // State-legislative / local offices: refine to the voter's county/city when
        // we have one, matching only authoritative location/office text.
        if (userCounty && (polStateRaw.includes(userCounty) || (d.office||'').toLowerCase().includes(userCounty) || (d.district||'').toLowerCase().includes(userCounty))) {
          reps.push(pid);
        }
      });
      return reps;
    }

    function _getPrimaryRepMeta() {
      if (!window._hasUserLocation) return {};
      var reps = _getPrimaryReps();
      var meta = {};
      reps.forEach(function(pid) {
        var d = CMP_DATA[pid];
        if (!d) return;
        var office = (d.office || '').toLowerCase();
        var badge = 'YOUR REPRESENTATIVE';
        var badgeClass = 'mypol-rep-badge';
        if (office.includes('senator') && !office.includes('state')) {
          badge = 'YOUR U.S. SENATOR';
          badgeClass = 'mypol-rep-badge';
        } else if (office.includes('governor')) {
          badge = 'YOUR GOVERNOR';
          badgeClass = 'mypol-rep-badge';
        } else if (office.includes('representative') && !office.includes('state')) {
          badge = 'YOUR HOUSE REP — Most Direct Impact';
          badgeClass = 'mypol-house-badge';
        } else if (office.includes('state senator') || office.includes('state senate')) {
          badge = 'YOUR STATE SENATOR';
          badgeClass = 'mypol-rep-badge';
        } else if (office.includes('state representative') || office.includes('state rep')) {
          badge = 'YOUR STATE REP';
          badgeClass = 'mypol-rep-badge';
        } else if (office.includes('mayor')) {
          badge = 'YOUR MAYOR';
          badgeClass = 'mypol-rep-badge';
        }
        meta[pid] = {
          badge: badge,
          badgeClass: badgeClass,
          sublabel: d.office + ' · ' + d.state,
          photo: ((typeof window._getPhotoUrl === 'function') ? window._getPhotoUrl(pid) : (BROWSE_PHOTOS[pid] || '')),
          desc: d.bio || ''
        };
      });
      return meta;
    }

    window.selectDistrict = function(district) {
      if (!DISTRICT_HOUSE_REPS[district]) return;
      _selectedDistrict = district;
      try { localStorage.setItem(DISTRICT_KEY, district); } catch(e) {}
      var pills = document.querySelectorAll('.district-pill');
      pills.forEach(function(p) { p.classList.toggle('active', p.getAttribute('data-district') === district); });
      var sublabel = document.getElementById('district-sublabel');
      if (sublabel) sublabel.textContent = DISTRICT_HOUSE_REPS[district].area;
      var headerP = document.querySelector('#my-politicians .text-center p');
      if (headerP) headerP.innerHTML = 'These are the politicians who directly represent <span class="text-amber-400 font-700">YOU</span> in ' + DISTRICT_HOUSE_REPS[district].area;
      // Add the authoritative U.S. House representative for the SELECTED district
      // straight from the curated district→rep map, so picking "District 1" always
      // adds that district's actual rep (e.g. bmoore) and never a neighboring
      // district's. _getPrimaryReps then layers on the voter's statewide / state /
      // local representatives from their saved location.
      var _districtRepPid = DISTRICT_HOUSE_REPS[district].pid;
      if (_districtRepPid && CMP_DATA[_districtRepPid]) _myPoliticians.add(_districtRepPid);
      _getPrimaryReps().forEach(function(pid) { _myPoliticians.add(pid); });
      _mypolSave();
      _mypolBuildGrid();
      chubBuildAll();
      _mypolUpdateCount();
    };

    _selectedDistrict = _getSelectedDistrict();

    const MY_POL_KEY = 'politidex_my_politicians';
    let _myPoliticians = new Set();

    const FAVORITES_KEY = 'politidex_favorites';
    let _favoritePids = new Set();

    function _loadFavorites() {
      try {
        const saved = localStorage.getItem(FAVORITES_KEY);
        if (saved) {
          const arr = JSON.parse(saved);
          _favoritePids = new Set(Array.isArray(arr) ? arr : []);
        }
      } catch(e) {
        _favoritePids = new Set();
      }
    }

    function _saveFavorites() {
      try { localStorage.setItem(FAVORITES_KEY, JSON.stringify([..._favoritePids])); } catch(e) {}
      var user = auth.currentUser;
      if (user && !user.isAnonymous) {
        db.collection('users').doc(user.uid).set({
          favorites: Array.from(_favoritePids)
        }, { merge: true }).then(function() {
          if (typeof _showAccountSaveToast === 'function') _showAccountSaveToast();
        }).catch(function(e) {
          console.warn("Firestore save favorites failed:", e);
        });
      }
    }

    window.toggleFavorite = function(pid) {
      var basePid = pid.replace(/^(modal-|catch-|dir-)/, '');
      if (_favoritePids.has(basePid)) {
        _favoritePids.delete(basePid);
      } else {
        _favoritePids.add(basePid);
      }
      _saveFavorites();
      _favoritesBuildGrid();
      _refreshAllHeartUI();
      _mypolBuildGrid();
      if (typeof filterDirectory === 'function') filterDirectory();
      
      // Update modal favorite btn if modal is open and shows this basePid
      const modalFavBtn = document.getElementById('modal-favorite-btn');
      if (modalFavBtn && (modalFavBtn.getAttribute('data-pid') || '').replace(/^modal-/, '') === basePid) {
        const isFav = _favoritePids.has(basePid);
        modalFavBtn.classList.toggle('favorited', isFav);
        modalFavBtn.innerHTML = isFav ? '❤️' : '🤍';
        modalFavBtn.title = isFav ? 'Remove from Favorites' : 'Save to Favorites';
      }
    };

    function _refreshAllHeartUI() {
      document.querySelectorAll('.heart-btn').forEach(btn => {
        const rawPid = btn.getAttribute('data-pid');
        if (rawPid) {
          const pid = rawPid.replace(/^(modal-|catch-|dir-)/, '');
          const isFav = _favoritePids.has(pid);
          btn.classList.toggle('favorited', isFav);
          btn.innerHTML = isFav ? '❤️' : '🤍';
          btn.title = isFav ? 'Remove from Favorites' : 'Add to Favorites';
        }
      });
    }

    function injectHeartButtonsToStaticCards() {
      const cards = document.querySelectorAll('#profiles .grid .card-holo');
      cards.forEach(card => {
        const likeBtn = card.querySelector('.like-btn');
        if (!likeBtn) return;
        const pid = likeBtn.getAttribute('data-pid');
        if (!pid) return;

        if (card.querySelector('.static-heart-btn')) return;

        const heartBtn = document.createElement('button');
        heartBtn.className = 'heart-btn static-heart-btn flex items-center gap-1.5 border border-rose-500/20 hover:border-rose-500/50 active:scale-95 text-rose-400 font-condensed font-700 text-xs tracking-widest uppercase px-3 py-2 rounded-lg transition-all ' + (_favoritePids.has(pid) ? 'favorited' : '');
        heartBtn.setAttribute('data-pid', pid);
        heartBtn.title = _favoritePids.has(pid) ? 'Remove from Favorites' : 'Add to Favorites';
        heartBtn.onclick = function(e) {
          e.stopPropagation();
          window.toggleFavorite(pid);
        };
        heartBtn.style.marginLeft = '0.4rem';
        heartBtn.innerHTML = _favoritePids.has(pid) ? '❤️' : '🤍';

        const likeBtnParent = likeBtn.parentElement;
        if (likeBtnParent) {
          likeBtnParent.appendChild(heartBtn);
        }
      });
    }

    function _favoritesRenderCard(pid) {
      const d = CMP_DATA[pid];
      if (!d) return '';
      const alignBar = (typeof _alignCardBar === 'function') ? _alignCardBar(pid) : '';
      const favBadge = '<span style="display:inline-flex;align-items:center;gap:0.2rem;background:rgba(244,63,94,0.12);border:1px solid rgba(244,63,94,0.3);color:#fb7185;font-family:\'Barlow Condensed\',sans-serif;font-weight:700;font-size:0.55rem;letter-spacing:0.06em;text-transform:uppercase;padding:0.12rem 0.4rem;border-radius:999px;">❤️ Favorite</span>';
      return window._pdxCardShell(pid, {
        cardClass: 'favorite-card',
        controls: _pdxHeartCtrl(pid),
        badges: favBadge + _pdxLocalBadge(pid),
        extra: alignBar,
        actions: _pdxTeamActions(pid)
      });
    }

    function _favoritesBuildGrid() {
      var grid = document.getElementById('favorites-grid');
      var empty = document.getElementById('favorites-empty');
      var badge = document.getElementById('favorites-count-badge');
      if (!grid) return;

      var pids = [..._favoritePids].filter(function(pid) { return CMP_DATA[pid]; });
      pids.sort(function(a, b) {
        var sa = CMP_DATA[a].score ?? -1, sb = CMP_DATA[b].score ?? -1;
        return sb - sa;
      });

      if (pids.length > 0) {
        grid.innerHTML = pids.map(function(pid) { return _favoritesRenderCard(pid); }).join('');
        if (empty) empty.style.display = 'none';
        if (badge) { badge.textContent = pids.length; badge.style.display = ''; }
      } else {
        grid.innerHTML = '';
        if (empty) empty.style.display = '';
        if (badge) badge.style.display = 'none';
      }
    }

    // ── Auth Dynamic Nav populate ──
    function openAuthModal() {
      document.getElementById('auth-email').value = '';
      document.getElementById('auth-password').value = '';
      const nameInput = document.getElementById('auth-name');
      if (nameInput) nameInput.value = '';
      document.getElementById('auth-error').classList.add('hidden');

      _authMode = 'signup'; 
      toggleAuthMode();

      const overlay = document.getElementById('auth-overlay');
      overlay.style.display = 'flex';
      overlay.style.alignItems = 'center';
      overlay.style.justifyContent = 'center';
      overlay.style.opacity = '0';
      document.body.style.overflow = 'hidden';
      requestAnimationFrame(() => requestAnimationFrame(() => {
        overlay.style.transition = 'opacity 0.22s ease';
        overlay.style.opacity = '1';
      }));
    }

    function closeAuthModal() {
      const overlay = document.getElementById('auth-overlay');
      overlay.style.opacity = '0';
      setTimeout(() => {
        overlay.style.display = 'none';
        if (document.getElementById('modal-overlay').style.display === 'none' &&
            document.getElementById('comment-overlay').style.display === 'none') {
          document.body.style.overflow = '';
        }
      }, 220);
    }

    function showAuthError(msg) {
      const errorEl = document.getElementById('auth-error');
      const errorText = document.getElementById('auth-error-text');
      errorText.textContent = msg;
      errorEl.classList.remove('hidden');
    }

    let _authMode = 'signin'; 

    function toggleAuthMode() {
      const nameField = document.getElementById('auth-field-name');
      const modalTitle = document.getElementById('auth-modal-title');
      const submitLabel = document.getElementById('auth-submit-label');
      const toggleMsg = document.getElementById('auth-toggle-msg');
      const toggleBtn = document.getElementById('auth-toggle-btn');
      const errorEl = document.getElementById('auth-error');

      errorEl.classList.add('hidden');

      if (_authMode === 'signin') {
        _authMode = 'signup';
        nameField.classList.remove('hidden');
        modalTitle.textContent = 'Create PolitiDex Account';
        submitLabel.textContent = 'Create Account';
        toggleMsg.textContent = 'Already have an account?';
        toggleBtn.textContent = 'Sign In';
      } else {
        _authMode = 'signin';
        nameField.classList.add('hidden');
        modalTitle.textContent = 'Sign In to PolitiDex';
        submitLabel.textContent = 'Sign In';
        toggleMsg.textContent = "Don't have an account?";
        toggleBtn.textContent = 'Create an Account';
      }
    }

    function submitAuthForm() {
      const email = document.getElementById('auth-email').value.trim();
      const password = document.getElementById('auth-password').value;
      const name = document.getElementById('auth-name').value.trim();

      if (!email || !password) {
        showAuthError("Please fill in email and password fields.");
        return;
      }

      const submitBtn = document.getElementById('auth-submit-btn');
      const submitLabel = document.getElementById('auth-submit-label');
      submitBtn.disabled = true;
      submitBtn.style.opacity = '0.7';

      if (_authMode === 'signup') {
        submitLabel.textContent = 'Registering...';
        auth.createUserWithEmailAndPassword(email, password).then(function(userCredential) {
          const user = userCredential.user;
          if (name) {
            return user.updateProfile({
              displayName: name
            }).then(function() {
              return user;
            });
          }
          return user;
        }).then(function(user) {
          console.log("Registration success:", user);
          closeAuthModal();
        }).catch(function(error) {
          console.error("Registration failed:", error.message);
          showAuthError(error.message);
        }).finally(function() {
          submitBtn.disabled = false;
          submitBtn.style.opacity = '1';
          submitLabel.textContent = 'Create Account';
        });
      } else {
        submitLabel.textContent = 'Signing in...';
        auth.signInWithEmailAndPassword(email, password).then(function(userCredential) {
          console.log("Sign in success:", userCredential.user);
          closeAuthModal();
        }).catch(function(error) {
          console.error("Sign in failed:", error.message);
          showAuthError(error.message);
        }).finally(function() {
          submitBtn.disabled = false;
          submitBtn.style.opacity = '1';
          submitLabel.textContent = 'Sign In';
        });
      }
    }

    function loginWithGoogle() {
      const provider = new firebase.auth.GoogleAuthProvider();
      auth.signInWithPopup(provider).then(function(result) {
        console.log("Google sign in success:", result.user);
        closeAuthModal();
      }).catch(function(error) {
        console.error("Google sign in failed:", error.message);
        showAuthError(error.message);
      });
    }

    function updateNavAuth(user) {
      const desktop = document.getElementById('nav-auth-desktop');
      const mobile = document.getElementById('nav-auth-mobile');

      if (user && !user.isAnonymous) {
        const displayName = user.displayName || (user.email ? user.email.split('@')[0] : 'Member');
        const initial = displayName.charAt(0).toUpperCase();
        const avatarFallback = `<div class="w-8 h-8 rounded-full border-2 border-crimson-500/50 bg-crimson-600/30 flex items-center justify-center font-display text-xs text-white">${initial}</div>`;
        const avatarFallbackAttr = avatarFallback.replace(/"/g, '&quot;');
        const avatarHtml = user.photoURL
          ? `<img loading="lazy" decoding="async" src="${user.photoURL}" referrerpolicy="no-referrer" onerror="this.outerHTML='${avatarFallbackAttr}'" class="w-8 h-8 rounded-full border-2 border-crimson-500/50 object-cover" />`
          : avatarFallback;

        if (desktop) {
          desktop.innerHTML = `
            <div class="relative group">
              <button class="flex items-center gap-2 bg-navy-800/90 hover:bg-navy-700/90 border border-crimson-500/40 hover:border-crimson-500/60 rounded-lg px-3 py-1.5 transition-all text-left shadow-lg" style="box-shadow:0 4px 16px rgba(192,21,42,0.15);">
                ${avatarHtml}
                <div class="hidden lg:flex flex-col leading-none">
                  <span class="text-white font-display text-sm tracking-wider max-w-[100px] truncate">${displayName}</span>
                  <span class="text-steel-400 font-condensed text-[10px] tracking-wider uppercase mt-0.5">My Account</span>
                </div>
                <svg class="w-3.5 h-3.5 text-steel-400 hidden lg:block" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5"/></svg>
              </button>
              <div class="absolute right-0 top-full mt-2 w-52 bg-navy-800 border border-crimson-500/30 rounded-lg overflow-hidden shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 z-50" style="box-shadow:0 12px 40px rgba(0,0,0,0.6),0 0 20px rgba(192,21,42,0.12);">
                <div class="px-3 py-2.5 border-b border-white/5 flex items-center gap-2.5">
                  ${avatarHtml}
                  <div class="min-w-0">
                    <div class="text-white font-display text-xs tracking-wider truncate">${displayName}</div>
                    <div class="text-steel-500 text-[10px] lowercase truncate">${user.email || 'Logged In'}</div>
                  </div>
                </div>
                <button onclick="if(window.PDXStances&&PDXStances.openViews)PDXStances.openViews();else location.hash='#my-stances';" class="w-full text-left font-condensed font-700 text-xs tracking-widest uppercase px-3 py-3 hover:bg-white/5 text-steel-300 hover:text-white transition-colors flex items-center gap-2 border-b border-white/5">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"/><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                  My Views
                </button>
                <button onclick="auth.signOut()" class="w-full text-left font-condensed font-700 text-xs tracking-widest uppercase px-3 py-3 hover:bg-white/5 text-red-400 hover:text-red-300 transition-colors flex items-center gap-2">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9"/></svg>
                  Log Out
                </button>
              </div>
            </div>
          `;
        }

        if (mobile) {
          mobile.innerHTML = `
            <div class="flex items-center gap-3 px-3.5 py-3 bg-navy-800/60 border border-crimson-500/40 rounded-xl" style="box-shadow:0 4px 18px rgba(192,21,42,0.15);">
              ${avatarHtml}
              <div class="flex-1 min-w-0">
                <div class="text-white font-display text-base tracking-wider truncate">${displayName}</div>
                <div class="text-gold-400 font-condensed font-700 text-[11px] tracking-widest uppercase mt-0.5">My Account</div>
              </div>
              <button onclick="if(window.PDXStances&&PDXStances.openViews)PDXStances.openViews();else location.hash='#my-stances';document.getElementById('mobileMenu')&&document.getElementById('mobileMenu').classList.add('hidden');" class="bg-navy-700/60 border border-white/10 text-steel-200 px-3 py-1.5 rounded-lg text-xs font-700 tracking-wider hover:bg-navy-700 transition-colors flex-shrink-0">👁 My Views</button>
              <button onclick="auth.signOut()" class="bg-red-950/40 border border-red-500/20 text-red-400 px-3 py-1.5 rounded-lg text-xs font-700 tracking-wider hover:bg-red-900/30 transition-colors flex-shrink-0">Logout</button>
            </div>
          `;
        }
      } else {
        if (desktop) {
          desktop.innerHTML = `
            <button onclick="openAuthModal()" class="relative bg-gradient-to-r from-crimson-600 via-crimson-500 to-crimson-600 hover:from-crimson-500 hover:via-crimson-400 hover:to-crimson-500 text-white font-display tracking-widest uppercase rounded-lg shadow-lg transition-all flex items-center gap-1.5 hover:scale-105 active:scale-95" style="white-space:nowrap;font-size:10px;letter-spacing:0.1em;padding:4.5px 10px;animation:navSignInGlow 2.2s ease-in-out infinite, navSignInAttention 6s ease-in-out infinite;border:1.5px solid rgba(255,255,255,0.25);text-shadow:0 1px 4px rgba(0,0,0,0.4);">
              <svg class="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M18 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM3 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 019.374 21c-2.331 0-4.512-.645-6.374-1.766z"/></svg>
              <span>JOIN THE PEOPLE</span>
              <span style="font-size:7.5px;background:rgba(255,255,255,0.22);padding:1px 5px;border-radius:4px;letter-spacing:0.06em;font-weight:700;">FREE</span>
            </button>
          `;
        }
        if (mobile) {
          mobile.innerHTML = `
            <button onclick="openAuthModal();document.getElementById('mobileMenu').classList.add('hidden');" class="w-full relative bg-gradient-to-r from-crimson-600 via-crimson-500 to-crimson-600 hover:from-crimson-500 hover:via-crimson-400 hover:to-crimson-500 text-white rounded-xl text-center font-display tracking-widest uppercase flex items-center justify-center gap-2" style="font-size:15px;letter-spacing:0.11em;padding:14px 16px;animation:navSignInGlow 2.2s ease-in-out infinite;border:1.5px solid rgba(255,255,255,0.25);text-shadow:0 1px 4px rgba(0,0,0,0.4);">
              <svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M18 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM3 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 019.374 21c-2.331 0-4.512-.645-6.374-1.766z"/></svg>
              <span>JOIN THE PEOPLE</span>
              <span style="font-size:9px;background:rgba(255,255,255,0.22);padding:1.5px 7px;border-radius:4px;letter-spacing:0.06em;font-weight:700;">FREE</span>
            </button>
          `;
        }
      }
    }

    function syncUserDataFromFirestore(uid) {
      db.collection('users').doc(uid).get().then(function(doc) {
        if (doc.exists) {
          const data = doc.data();
          if (data.my_politicians) {
            _myPoliticians = new Set(data.my_politicians);
          } else {
            // New account, no saved team → empty national/neutral set. Never
            // pre-seed with politicians for users anywhere in the U.S.
            _myPoliticians = new Set();
          }
          if (data.favorites) {
            _favoritePids = new Set(data.favorites);
          } else {
            _favoritePids = new Set();
          }
          if (data.potential_politicians) {
            _potentialPoliticians = new Set(data.potential_politicians);
          } else {
            _potentialPoliticians = new Set();
          }
          if (data.team_ballot && typeof data.team_ballot === 'object') {
            try { localStorage.setItem('politidex_my_team', JSON.stringify(data.team_ballot)); } catch(e) {}
          }
          // Restore the member's protected Home Voting Base (their saved,
          // location-anchored "real team") and the home/research view mode so it
          // follows them across devices — exactly like team_ballot and
          // voter_location above. Saved by _homeStore()/_homeSetMode(); without
          // this restore a signed-in voter on a new device would see an empty
          // Home Base even though they'd set one elsewhere.
          if (data.home_base && typeof data.home_base === 'object' && data.home_base.slots) {
            try { localStorage.setItem('politidex_home_base', JSON.stringify(data.home_base)); } catch(e) {}
          }
          if (data.team_mode === 'home' || data.team_mode === 'research') {
            try { localStorage.setItem('politidex_team_mode', data.team_mode); } catch(e) {}
          }
          // Re-anchor the experience to the freshly-restored Home Base (location,
          // mode and banner) so Relevant to Me defaults to their real team.
          try { if (typeof window._homeHydrateView === 'function') window._homeHydrateView(); } catch(e) {}
          // Restore the member's saved voting location so their personalized
          // views (My Team, Relevant to Me, Your Voter Map, ballot slots) reflect
          // their real area on any device — but never override a location the
          // visitor already set locally in this session.
          if (data.voter_location && data.voter_location.state && !window._hasUserLocation) {
            try {
              localStorage.setItem('politidex_voter_location', JSON.stringify(data.voter_location));
              if (typeof window.loadVoterLocation === 'function') window.loadVoterLocation();
              var _ls = document.getElementById('voter-state-sel');
              if (_ls) _ls.value = data.voter_location.state || '';
              ['_updateTeamPositionsForLocation','updateRelevantLocationText','updateMyTeamLocationText','updateRacesAndPositions','_vhBallotRerender','_vhSyncBanner','renderRelevantToMe','myteamBrowseFilter','pmFilterLocation'].forEach(function(fn) {
                try { if (typeof window[fn] === 'function') window[fn](); } catch(e) {}
              });
            } catch(e) { console.warn('Restore voter_location failed:', e); }
          }
        } else {
          var currentBallot = {};
          try { var s = localStorage.getItem('politidex_my_team'); if (s) currentBallot = JSON.parse(s) || {}; } catch(e) {}
          var currentHomeBase = null, currentTeamMode = null;
          try { var hb = localStorage.getItem('politidex_home_base'); if (hb) currentHomeBase = JSON.parse(hb) || null; } catch(e) {}
          try { var tm = localStorage.getItem('politidex_team_mode'); if (tm === 'home' || tm === 'research') currentTeamMode = tm; } catch(e) {}
          db.collection('users').doc(uid).set({
            my_politicians: Array.from(_myPoliticians),
            favorites: Array.from(_favoritePids),
            potential_politicians: Array.from(_potentialPoliticians),
            team_ballot: currentBallot,
            home_base: currentHomeBase,
            team_mode: currentTeamMode,
            voter_location: (window._hasUserLocation && window._currentVoterLocation) ? window._currentVoterLocation : null
          }, { merge: true }).catch(function(e) {
            console.warn("Error creating user profile in Firestore:", e);
          });
        }

        db.collection('users').doc(uid).collection('votes').get().then(function(votesSnap) {
          votesSnap.forEach(function(voteDoc) {
            var vPid = voteDoc.id;
            var vData = voteDoc.data();
            if (vData.type === 'like') {
              _likedPids.add(vPid);
              _dislikedPids.delete(vPid);
            } else if (vData.type === 'dislike') {
              _dislikedPids.add(vPid);
              _likedPids.delete(vPid);
            }
          });
          localStorage.setItem('pdx_liked_pids', JSON.stringify(Array.from(_likedPids)));
          localStorage.setItem('pdx_disliked_pids', JSON.stringify(Array.from(_dislikedPids)));
          if (typeof _refreshAllVoteUI === 'function') _refreshAllVoteUI();
        }).catch(function(e) {
          console.warn('Error loading user votes from Firestore:', e);
        });

        db.collection('users').doc(uid).collection('comments').get().then(function(commentsSnap) {
          commentsSnap.forEach(function(cDoc) {
            var cData = cDoc.data();
            if (cData.pid) _commentedPids.add(cData.pid);
          });
          localStorage.setItem('pdx_commented_pids', JSON.stringify(Array.from(_commentedPids)));
          document.querySelectorAll('[data-comment-pid]').forEach(function(btn) {
            var cPid = btn.getAttribute('data-comment-pid');
            if (_commentedPids.has(cPid)) btn.classList.add('commented');
          });
        }).catch(function(e) {
          console.warn('Error loading user comments from Firestore:', e);
        });

        _potentialBuildGrid();
        _favoritesBuildGrid();
        _refreshAllHeartUI();
        if (typeof filterDirectory === 'function') filterDirectory();

        db.collection('userTeams').doc(uid).get().then(function(teamDoc) {
          // The authoritative voting team is the keyed `team_ballot` map saved
          // under the user's account (one pid per ballot slot). Start from
          // whatever was just loaded into localStorage so a stale or lossy
          // reconstruction can never wipe out a good saved team on refresh.
          var selections = {};
          try { selections = JSON.parse(localStorage.getItem('politidex_my_team') || '{}') || {}; } catch(e) { selections = {}; }

          // Helper: pull a politician's race slot key, tolerating either the
          // window-scoped or closure-scoped resolver.
          function _raceKeyFor(pid) {
            if (typeof window._findRaceKeyForPolitician === 'function') return window._findRaceKeyForPolitician(pid);
            if (typeof _findRaceKeyForPolitician === 'function') return _findRaceKeyForPolitician(pid);
            return null;
          }

          // Legacy/back-compat: older accounts only stored a flat `userTeams.team`
          // array of pids. Use it to BACK-FILL slots that are still empty — never
          // to overwrite a slot the keyed map already filled.
          if (teamDoc.exists) {
            var teamData = teamDoc.data();
            if (teamData && Array.isArray(teamData.team)) {
              console.log("Loaded team from userTeams (back-fill):", teamData.team);
              teamData.team.forEach(function(pid) {
                _myPoliticians.add(pid);
                var raceKey = _raceKeyFor(pid);
                if (raceKey && !selections[raceKey]) {
                  selections[raceKey] = pid;
                }
              });
            }
          }

          // Finalize the loaded slate: keep "my politicians" in sync, persist
          // locally and re-render. Shared by both the new-structure and the
          // legacy-only code paths below.
          function _finalizeTeam() {
            Object.keys(selections).forEach(function(k) {
              if (selections[k]) _myPoliticians.add(selections[k]);
            });
            try { localStorage.setItem('politidex_my_team', JSON.stringify(selections)); } catch(e) {}
            _mypolSave();
            _mypolBuildGrid();
            _mypolUpdateCount();
            if (typeof window._vhBallotRerender === 'function') window._vhBallotRerender();
          }

          // Preferred source: the new multi-team subcollection. Read the main
          // team document and use its keyed `slots` map (falling back to its
          // flat `members` list) to fill any slots not already set. This is the
          // forward-looking structure that also supports naming + future sharing.
          var mainId = (teamDoc.exists && teamDoc.data() && teamDoc.data().mainTeamId) || window.PDX_DEFAULT_TEAM_ID || 'main';
          db.collection('userTeams').doc(uid).collection('teams').doc(mainId).get()
            .then(function(mainDoc) {
              if (mainDoc.exists) {
                var t = mainDoc.data() || {};
                if (t.slots && typeof t.slots === 'object') {
                  Object.keys(t.slots).forEach(function(rk) {
                    if (t.slots[rk] && !selections[rk]) selections[rk] = t.slots[rk];
                  });
                } else if (Array.isArray(t.members)) {
                  t.members.forEach(function(pid) {
                    _myPoliticians.add(pid);
                    var rk = _raceKeyFor(pid);
                    if (rk && !selections[rk]) selections[rk] = pid;
                  });
                }
              }
              _finalizeTeam();
            })
            .catch(function() { _finalizeTeam(); });
        }).catch(function(err) {
          console.warn("Failed to load userTeams:", err);
          _mypolBuildGrid();
          _mypolUpdateCount();
          if (typeof window._vhBallotRerender === 'function') window._vhBallotRerender();
        });
      }).catch(function(error) {
        console.error("Error syncing Firestore user data:", error);
        _mypolLoad();
        _loadFavorites();
        _potentialLoad();

        _mypolBuildGrid();
        _potentialBuildGrid();
        _favoritesBuildGrid();
        _refreshAllHeartUI();
        if (typeof filterDirectory === 'function') filterDirectory();
      });
    }

    // Load the visitor's My Team, Favorites and Watching lists straight from this
    // browser's localStorage and repaint every grid. This is the persistence path
    // for guests / anonymous visitors (anyone not signed into a real account): it
    // never touches Firestore, so a team built on this device survives refreshes
    // and return visits instead of being wiped by an empty cloud profile.
    function _loadLocalUserData() {
      try { _mypolLoad(); } catch (e) {}
      try { _loadFavorites(); } catch (e) {}
      try { _potentialLoad(); } catch (e) {}
      try { _mypolBuildGrid(); } catch (e) {}
      try { _favoritesBuildGrid(); } catch (e) {}
      try { _potentialBuildGrid(); } catch (e) {}
      try { _refreshAllHeartUI(); } catch (e) {}
      try { _mypolUpdateCount(); } catch (e) {}
      try { if (typeof filterDirectory === 'function') filterDirectory(); } catch (e) {}
    }
    window._loadLocalUserData = _loadLocalUserData;

    window.openAuthModal = openAuthModal;
    window.closeAuthModal = closeAuthModal;
    window.toggleAuthMode = toggleAuthMode;
    window.submitAuthForm = submitAuthForm;
    window.loginWithGoogle = loginWithGoogle;
    window.updateNavAuth = updateNavAuth;
    window.syncUserDataFromFirestore = syncUserDataFromFirestore;
    window._findRaceKeyForPolitician = _findRaceKeyForPolitician;

    // Reconcile the nav account indicator with whatever auth state Firebase has
    // already resolved. This covers the case where onAuthStateChanged fired
    // before updateNavAuth() existed, which previously left the nav blank.
    try {
      var _navAuthUser = (typeof _lastAuthUser !== 'undefined' && _lastAuthUser)
        ? _lastAuthUser
        : ((typeof auth !== 'undefined' && auth.currentUser && !auth.currentUser.isAnonymous) ? auth.currentUser : null);
      updateNavAuth(_navAuthUser);
    } catch (e) { /* leave static fallback in place */ }
    window._favoritesBuildGrid = _favoritesBuildGrid;

    function _mypolLoad() {
      try {
        const saved = window.PDXStore ? window.PDXStore.readRaw(MY_POL_KEY) : localStorage.getItem(MY_POL_KEY);
        if (saved) {
          const arr = JSON.parse(saved);
          _myPoliticians = new Set(Array.isArray(arr) ? arr : []);
        } else {
          // No saved data → start with an empty, national/neutral team. No
          // location-specific representatives are pre-loaded for
          // a visitor from anywhere in the U.S. — the user builds their own
          // team from their saved location.
          _myPoliticians = new Set();
        }
      } catch(e) {
        _myPoliticians = new Set();
      }
      _mypolSave();
    }

    function _mypolSave() {

      if (window.PDXStore) { window.PDXStore.write(MY_POL_KEY, [..._myPoliticians]); }   // marks 'team' dirty
      else { try { localStorage.setItem(MY_POL_KEY, JSON.stringify([..._myPoliticians])); } catch(e) {} }
      var user = auth.currentUser;
      if (user && !user.isAnonymous) {
        db.collection('users').doc(user.uid).set({
          my_politicians: Array.from(_myPoliticians)
        }, { merge: true }).then(function() {
          if (typeof _showAccountSaveToast === 'function') _showAccountSaveToast();
        }).catch(function(e) {
          console.warn("Firestore save my_politicians failed:", e);
        });
      }
    }

    // Re-read the roster and repaint when a cross-device sync pull updates the
    // 'team' collection (see PDXTeamSync.project → 'pdx-team-change'). We read
    // straight from storage into the in-memory set — NOT through _mypolSave — so a
    // pull-driven refresh never re-persists, re-dirties, or re-mirrors to Firestore.
    try {
      window.addEventListener('pdx-team-change', function () {
        try {
          var raw = window.PDXStore ? window.PDXStore.readRaw(MY_POL_KEY) : localStorage.getItem(MY_POL_KEY);
          var arr = raw ? JSON.parse(raw) : [];
          _myPoliticians = new Set(Array.isArray(arr) ? arr : []);
        } catch (e) { return; }
        try { if (typeof _mypolBuildGrid === 'function') _mypolBuildGrid(); } catch (e) {}
        try { if (typeof chubBuildAll === 'function') chubBuildAll(); } catch (e) {}
        try { if (typeof _mypolUpdateCount === 'function') _mypolUpdateCount(); } catch (e) {}
        try { if (window.renderRelevantToMe) window.renderRelevantToMe(); } catch (e) {}
      });
    } catch (e) { /* live refresh is best-effort; storage already holds the truth */ }

    function _findRaceKeyForPolitician(pid) {
      if (typeof window.TEAM_POSITIONS === 'undefined') return null;
      var _hasSlot = function(k) {
        return !!k && window.TEAM_POSITIONS.some(function(p) { return p.key === k; });
      };

      // Per-seat local routing: a local candidate belongs to their SPECIFIC seat's
      // own ballot key (local_<raceKey>) — resolved by which local roster contains
      // them — rather than the shared generic 'local' slot. Non-local people resolve
      // to null here and fall through to the normal office matching below, so this
      // only affects local seats.
      try {
        var _lk = (typeof window._myteamLocalKeyForPid === 'function') ? window._myteamLocalKeyForPid(pid) : null;
        if (_lk) return _lk;
      } catch (e) {}

      // Primary: the politician is a known candidate in one of the voter's own
      // ballot races — that race's slot is exactly the one they fill.
      if (typeof window._ballotCandidates === 'function') {
        for (var i = 0; i < window.TEAM_POSITIONS.length; i++) {
          var key = window.TEAM_POSITIONS[i].key;
          var cands = window._ballotCandidates(key);
          if (cands && cands.some(function(c) { return c.pid === pid; })) {
            return key;
          }
        }
      }

      // Fallback: map the politician to a slot by the office they hold or seek,
      // using the SAME robust classifier the browse / Relevant-to-Me sections use
      // to bucket people into office groups. This covers local seats, bare-chamber
      // district offices and 2026 candidates that the loose office-string regex
      // below silently missed — which is what left someone added from those
      // surfaces in the team set but with no ballot slot, so the 0/6 progress
      // never moved. Now any add that maps to a real office fills its seat.
      var _btToRace = {
        senator: 'senate', representative: 'house', governor: 'governor',
        state_senator: 'statesenate', state_rep: 'statehouse', local: 'local',
        president: 'president'
      };
      try {
        if (typeof _classifyBrowseType === 'function') {
          var _rk = _btToRace[_classifyBrowseType(pid)];
          if (_hasSlot(_rk)) return _rk;
        }
      } catch (e) {}

      var d = CMP_DATA[pid];
      if (!d) return null;
      var o = (d.office || '').toLowerCase();
      if (/president/i.test(o) && !/state/i.test(o)) return 'president';
      if (/senator/i.test(o) && !/state/i.test(o)) return 'senate';
      if (/representative/i.test(o) && !/state/i.test(o)) return 'house';
      if (/governor/i.test(o)) return 'governor';
      if (/state\s*sen/i.test(o)) return 'statesenate';
      if (/state\s*rep/i.test(o)) return 'statehouse';
      if (/mayor|county|local/i.test(o)) return 'local';
      return null;
    }

    window.mypolToggle = function(pid) {
      var wasOnTeam = _myPoliticians.has(pid);
      if (wasOnTeam) { 
        _myPoliticians.delete(pid);
        var selections = window._ballotLoad ? window._ballotLoad() : {};
        var raceKey = _findRaceKeyForPolitician(pid);
        if (raceKey && selections[raceKey] === pid) {
          delete selections[raceKey];
          if (window._ballotSave) window._ballotSave(selections);
          if (window._ballotRender) window._ballotRender();
        }
      }
      else { 
        _myPoliticians.add(pid); 
        var raceKey = _findRaceKeyForPolitician(pid);
        if (raceKey) {
          var selections = window._ballotLoad ? window._ballotLoad() : {};
          selections[raceKey] = pid;
          if (window._ballotSave) window._ballotSave(selections);
          if (window._ballotRender) window._ballotRender();
        }
      }
      _mypolSave();
      _mypolBuildGrid();
      chubBuildAll();
      _mypolUpdateCount();
      if (window.renderRelevantToMe) { try { window.renderRelevantToMe(); } catch (e) {} }
      if (window._myteamBrowseRefreshCoverage) { try { window._myteamBrowseRefreshCoverage(); } catch (e) {} }
    };

    // Exposed so other script blocks (e.g. the Compare modal) can read whether a
    // politician is already on the visitor's team and reflect it in their UI.
    //
    // The team has historically had TWO stores: this `_myPoliticians` set (which
    // drives every "✓ On Team" badge, heart, and filter across browse / compare /
    // Relevant to Me) and the keyed ballot map `politidex_my_team` (which drives
    // the 6-slot My Voting Team grid and the X/6 count). Adds made from the
    // district cards and Your Key Races go through ballotPickCard, which only wrote
    // the ballot — so those picks filled a slot but never flipped _myPoliticians,
    // leaving every other surface showing "Add to My Team" for someone already on
    // the team. We now treat a pick that fills ANY ballot slot as on-team too, so
    // membership is consistent no matter which add path recorded it.
    window._pdxIsOnTeam = function(pid) {
      if (!pid) return false;
      if ((typeof _myPoliticians !== 'undefined') && _myPoliticians.has(pid)) return true;
      try {
        var sel = JSON.parse(localStorage.getItem('politidex_my_team') || '{}') || {};
        for (var k in sel) { if (sel[k] === pid) return true; }
      } catch (e) {}
      return false;
    };

    // Keep `_myPoliticians` in lock-step with a ballot-slot pick. The district-card
    // and Key-Races "+ ADD" buttons commit through ballotPickCard (ballot only);
    // calling this from there makes the pick flip every membership-driven surface
    // (badges, hearts, filters) and persist to the account, exactly as the browse
    // "Add to My Team" path already does. On removal we only drop the pid when it
    // no longer occupies any other ballot slot, so a person picked elsewhere is
    // never silently pulled off the team.
    window._pdxReflectBallotPick = function(pid, onTeam) {
      if (!pid || typeof _myPoliticians === 'undefined') return;
      var changed = false;
      if (onTeam) {
        if (!_myPoliticians.has(pid)) { _myPoliticians.add(pid); changed = true; }
      } else if (_myPoliticians.has(pid)) {
        var stillPicked = false;
        try {
          var sel = JSON.parse(localStorage.getItem('politidex_my_team') || '{}') || {};
          for (var k in sel) { if (sel[k] === pid) { stillPicked = true; break; } }
        } catch (e) {}
        if (!stillPicked) { _myPoliticians.delete(pid); changed = true; }
      }
      if (!changed) return;
      _mypolSave();
      try { _refreshAllHeartUI(); } catch (e) {}
      try { if (typeof chubBuildAll === 'function') chubBuildAll(); } catch (e) {}
      try { if (typeof filterDirectory === 'function') filterDirectory(); } catch (e) {}
    };

    // Smoothly bring the My Voting Team workspace into view — used by the toast's
    // "View team" action so a user can hop from exploring to managing in one tap.
    function _scrollToTeamWorkspace() {
      // Prefer the slot-aware scroll so, right after an add, the toast's "View team"
      // action lands on the freshly-filled slot (with its pulse) rather than the
      // top of the panel.
      if (typeof window._relevantScrollToTeam === 'function') { window._relevantScrollToTeam(); return; }
      var t = document.getElementById('myteam-summary-box') || document.getElementById('my-politicians');
      if (t && t.scrollIntoView) t.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    // Build the contextual guidance shown in the add-to-team toast. Reads the
    // freshly-saved ballot to work out progress, then offers the single most
    // useful next move: fill the next still-open office (the "want to add your
    // State House Rep next?" nudge), compare once a couple of picks exist, or —
    // when every seat is filled — celebrate and point at the finished slate.
    // Returns the opts object _showTeamToast consumes (count/total/complete/actions).
    function _buildTeamToastNextStep(justAddedPid) {
      var positions = window.TEAM_POSITIONS || [];
      var total = positions.length || 6;
      var sel = (typeof _getTeamBallotSelections === 'function')
        ? _getTeamBallotSelections()
        : (window._ballotLoad ? window._ballotLoad() : {});
      var filled = 0, nextOpen = null;
      positions.forEach(function(pos) {
        if (sel[pos.key] && CMP_DATA[sel[pos.key]]) filled++;
        else if (!nextOpen) nextOpen = pos;
      });
      var complete = total > 0 && filled >= total;
      var actions = [];
      var compareAct = function() { if (window.myteamCompareAll) window.myteamCompareAll(); else _scrollToTeamWorkspace(); };

      if (complete) {
        if (filled >= 2) actions.push({ label: '⚖️ Compare your team', kind: 'primary', act: compareAct });
        actions.push({ label: '↑ My Voting Team', kind: 'secondary', act: _scrollToTeamWorkspace });
      } else if (nextOpen) {
        actions.push({
          label: '➕ Add your ' + nextOpen.label,
          kind: 'primary',
          act: (function(k) { return function() {
            if (window.jumpToRelevantAccordion) window.jumpToRelevantAccordion(k);
            else _scrollToTeamWorkspace();
          }; })(nextOpen.key)
        });
        actions.push(filled >= 2
          ? { label: '⚖️ Compare', kind: 'secondary', act: compareAct }
          : { label: '↑ My Voting Team', kind: 'secondary', act: _scrollToTeamWorkspace });
      }
      return { count: filled, total: total, complete: complete, actions: actions };
    }

    window.mypolToggleAnimated = function(btn, pid) {
      var wasOnTeam = _myPoliticians.has(pid);
      if (wasOnTeam) { 
        _myPoliticians.delete(pid);
        var selections = window._ballotLoad ? window._ballotLoad() : {};
        var raceKey = _findRaceKeyForPolitician(pid);
        if (raceKey && selections[raceKey] === pid) {
          delete selections[raceKey];
          if (window._ballotSave) window._ballotSave(selections);
          if (window._ballotRender) window._ballotRender();
        }
      }
      else { 
        _myPoliticians.add(pid); 
        var raceKey = _findRaceKeyForPolitician(pid);
        if (raceKey) {
          var selections = window._ballotLoad ? window._ballotLoad() : {};
          selections[raceKey] = pid;
          if (window._ballotSave) window._ballotSave(selections);
          if (window._ballotRender) window._ballotRender();
        }
      }
      if (!wasOnTeam && btn) {
        btn.classList.add('just-added');
        btn.innerHTML = '✓ Added!';
        setTimeout(function() { btn.classList.remove('just-added'); }, 600);
      }
      // Remember the pick just added so the team grid can pulse exactly that slot
      // when the voter jumps back up — turning the hand-off into a visible result.
      // Cleared on a removal so a stale highlight never lingers.
      window._pdxJustFilledPid = wasOnTeam ? null : pid;
      if (window._pdxJustFilledTimer) { clearTimeout(window._pdxJustFilledTimer); }
      if (!wasOnTeam) {
        window._pdxJustFilledTimer = setTimeout(function() { window._pdxJustFilledPid = null; }, 6000);
      }
      if (typeof window._showTeamToast === 'function') {
        if (wasOnTeam) {
          window._showTeamToast(pid, 'remove', {});
        } else {
          window._showTeamToast(pid, 'add', _buildTeamToastNextStep(pid));
        }
      }
      if (typeof window._popTeamCounter === 'function') window._popTeamCounter();
      if (!wasOnTeam && typeof window._pdxCelebrateAdd === 'function') window._pdxCelebrateAdd(btn || null);
      _mypolSave();
      setTimeout(function() {
        _mypolBuildGrid();
        chubBuildAll();
        _mypolUpdateCount();
        // Keep the "Relevant to Me" district-coverage UI (tracker, chips, office
        // pills) in sync with the pick the voter just made or removed.
        if (window.renderRelevantToMe) { try { window.renderRelevantToMe(); } catch (e) {} }
        // Keep the All Politicians district tree's coverage pills + notes in sync.
        if (window._myteamBrowseRefreshCoverage) { try { window._myteamBrowseRefreshCoverage(); } catch (e) {} }
        // Keep the open profile modal's footer CTA in sync — but only when the
        // toggle came from somewhere else (e.g. the inline thin-profile button),
        // so we never stomp the footer button's own "✓ Added!" flash.
        if (window._pdxCurrentProfileId && typeof window.pdxSyncModalTeamBtn === 'function') {
          var _mb = document.getElementById('modal-addteam-btn');
          if (_mb && _mb !== btn) window.pdxSyncModalTeamBtn(window._pdxCurrentProfileId);
        }
      }, wasOnTeam ? 0 : 350);
    };

    // ── Profile-modal team CTA ────────────────────────────────────────────
    // The deep-dive profile is where most voters decide — so the primary action
    // lives right there in the footer. These helpers keep that button honest:
    // showing the resting state on open, and a light next-step nudge either way.
    // Name the next still-open seat on the visitor's ballot, so the modal can
    // point them at it after they add someone ("now fill your State Senate seat").
    // Read-only: just reads TEAM_POSITIONS against the saved ballot. Returns the
    // position object, or null when every seat is filled (or positions unknown).
    function _pdxNextOpenSeat() {
      var positions = window.TEAM_POSITIONS || [];
      if (!positions.length) return null;
      var sel = (typeof _getTeamBallotSelections === 'function') ? _getTeamBallotSelections() : {};
      for (var i = 0; i < positions.length; i++) {
        var k = positions[i].key;
        if (!sel[k] || (typeof CMP_DATA !== 'undefined' && !CMP_DATA[sel[k]])) return positions[i];
      }
      return null;
    }

    window.pdxSyncModalTeamBtn = function(id) {
      var btn = document.getElementById('modal-addteam-btn');
      if (!btn || !id) return;
      var on = _myPoliticians.has(id);
      btn.classList.toggle('on-team', on);

      // Personal match read, when the visitor has set their Alignment Signature.
      // This is what lets the CTA say "looks like a good match — add them?" right
      // where the decision is made, instead of a generic, value-blind prompt.
      var hasAlign = (typeof _alignIssues !== 'undefined' && _alignIssues && _alignIssues.size > 0);
      var match = (hasAlign && typeof _calcAlignmentScore === 'function') ? _calcAlignmentScore(id) : null;
      var strong = (match !== null && match >= 70);
      // The breathing green halo only fires for a strong, not-yet-added match.
      btn.classList.toggle('match-strong', strong && !on);

      btn.innerHTML = on ? '✓ On Your Team' : '⭐ Add to My Team';

      var hint = document.getElementById('modal-addteam-hint');
      if (!hint) return;

      if (on) {
        // Already on the team — keep momentum by naming the next empty seat, so the
        // voter flows straight from one pick into building the rest of their ballot.
        var next = _pdxNextOpenSeat();
        hint.innerHTML = next
          ? '✓ Saved to <strong style="color:#86efac;">My Team</strong>. Keep going — your <strong style="color:#cbd9ee;">' + next.label + '</strong> seat is still open. Browse that race next.'
          : '🎉 Saved — that fills <strong style="color:#86efac;">every seat</strong> on your ballot. Compare your full team to lock it in.';
        return;
      }

      if (match !== null) {
        var mc = (typeof _alignScoreColor === 'function') ? _alignScoreColor(match) : '#86efac';
        var pct = '<strong style="color:' + mc + ';">' + match + '%</strong>';
        if (match >= 70) {
          hint.innerHTML = '🎯 Looks like a strong match — they\'re with you on ' + pct + ' of your issues. Add them to your team?';
        } else if (match >= 50) {
          hint.innerHTML = '🎯 A solid match at ' + pct + ' on your issues. Add them to claim this seat — swap your pick anytime.';
        } else {
          hint.innerHTML = 'A ' + pct + ' match on your issues. Compare them against the others in this race, or add them to claim the seat.';
        }
      } else {
        hint.innerHTML = 'Claims this seat on your saved 2026 ballot — swap your pick anytime.';
      }
    };
    window.pdxModalToggleTeam = function(btn) {
      var id = window._pdxCurrentProfileId;
      if (!id) return;
      window.mypolToggleAnimated(btn, id);
      // Let the "✓ Added!" flash play, then settle into the resting label/hint.
      setTimeout(function() { window.pdxSyncModalTeamBtn(id); }, 720);
    };

    window.mypolClearAll = function() {
      _myPoliticians.clear();
      _mypolSave();
      try { localStorage.setItem(TEAM_BALLOT_KEY, JSON.stringify({})); } catch(e) {}
      _mypolBuildGrid();
      chubBuildAll();
      _mypolUpdateCount();
      if (typeof ballotClearAll === 'function') ballotClearAll();
    };

    window.mypolResetLocal = function() {
      // Clear the saved team back to a neutral, empty state — no hardcoded
      // Utah/Your City default list.
      _myPoliticians = new Set();
      _mypolSave();
      _mypolBuildGrid();
      chubBuildAll();
      _mypolUpdateCount();
    };

    function _mypolUpdateCount() {
      var allBrowse = Object.keys(CMP_DATA);
      var browseCount = document.getElementById('myteam-browse-count');
      if (browseCount) browseCount.textContent = allBrowse.length;

      // Live "collection depth" summary — surfaces the real substance behind the
      // roster (documented, sourced issue positions and tracked promises) so the
      // header reads as a populated, working database rather than a bare count.
      // Everything here is counted from the loaded records; the line stays hidden
      // until there is something real to show, so it never flashes a placeholder.
      var depthEl = document.getElementById('tracker-depth-line');
      if (depthEl) {
        var nPositions = 0, nWithPositions = 0, nPromises = 0;
        allBrowse.forEach(function(id) {
          var d = CMP_DATA[id]; if (!d) return;
          var sCount = (d.stances && typeof d.stances === 'object' && !Array.isArray(d.stances))
            ? Object.keys(d.stances).length : 0;
          if (sCount > 0) { nPositions += sCount; nWithPositions++; }
          if (Array.isArray(d.promises)) nPromises += d.promises.length;
        });
        if (nPositions > 0 || nPromises > 0) {
          var parts = [];
          if (nPositions > 0) {
            // Express the "profiles with positions" figure as a subset of the full
            // roster ("409 of 787") so it can never read as a second, conflicting
            // total against the headline count beside the section title.
            var totalProfiles = allBrowse.length;
            var profileScope = (nWithPositions < totalProfiles)
              ? nWithPositions.toLocaleString() + '</b> of <b style="color:#cbd5e1;">' + totalProfiles.toLocaleString()
              : nWithPositions.toLocaleString();
            parts.push('<span style="color:#5eead4;">📍 ' + nPositions.toLocaleString() + '</span> documented issue position' + (nPositions === 1 ? '' : 's') +
              ' across <b style="color:#cbd5e1;">' + profileScope + '</b> profile' + (totalProfiles === 1 ? '' : 's'));
          }
          if (nPromises > 0) {
            parts.push('<span style="color:#f5c842;">📋 ' + nPromises.toLocaleString() + '</span> tracked promise' + (nPromises === 1 ? '' : 's'));
          }
          depthEl.innerHTML = parts.join(' &nbsp;·&nbsp; ');
          depthEl.style.display = '';
        } else {
          depthEl.style.display = 'none';
        }
      }
    }
    // Exposed so the post-Firestore-load hook can refresh the live "collection
    // depth" line as soon as the full roster is merged, independent of when the
    // anonymous auth / deferred init paths happen to fire.
    window._mypolUpdateCount = _mypolUpdateCount;

    // _chubScoreColor was removed with the pledge percentage. A green/amber/red
    // ramp over kept ÷ resolved is the percentage with the digits taken off: the
    // reader still gets "70%+ = good" without a denominator to argue with. Pledge
    // receipts now render through _pdxLedgerSlot, which carries counts and no
    // colour. Word vs Action owns the only graded read on the site.

    // Subtle party tag — consistent across every compact card. Accepts either the
    // single-letter codes used in the seed data ('R'/'D'/'I'/'F') or full names
    // ('Republican'/'Democrat'/'Independent'/'Forward'). Returns '' when unknown so
    // the card stays clean rather than showing an empty pill.
    window._pdxPartyChip = function(party) {
      if (!party) return '';
      var p = String(party).trim().toLowerCase();
      var cls, label;
      if (p === 'r' || p === 'republican') { cls = 'pdx-party-r'; label = 'Republican'; }
      else if (p === 'd' || p === 'democrat' || p === 'democratic') { cls = 'pdx-party-d'; label = 'Democrat'; }
      else if (p === 'i' || p === 'independent') { cls = 'pdx-party-i'; label = 'Independent'; }
      else if (p === 'f' || p === 'forward' || p === 'forward party') { cls = 'pdx-party-f'; label = 'Forward'; }
      else { cls = 'pdx-party-i'; label = String(party); }
      return '<span class="pdx-party-chip ' + cls + '">' + label + '</span>';
    };

    // Clean kept / broken / pending / partial pill row, PLUS the honest status
    // prose that stands in when nothing has resolved. Two different jobs share
    // this helper, and only one of them belongs on a summary surface:
    //   the TALLY   — ✓ N Kept / ✗ N Broken / ⏳ N Pending — a pledge ratio
    //   the STATUS  — "Lost primary — not on the November ballot", "2026
    //                 candidate — record starts in office", "Early in term",
    //                 "Former office — record archived"
    // Pass `opts.tally: false` for the status prose WITHOUT the ratio. The
    // unified compact card shell does exactly that: ⚖️ Word vs Action is the one
    // read it publishes, those same pledges are measured inside it, and a
    // kept/broken row one line under the verdict is a second grade for the same
    // evidence. The status prose is not a score and is kept everywhere.
    //
    // Pass the whole record as `opts.record` to pick up partials and the
    // promises[] / promiseBreakdown shapes; the loose kept / broken / pending
    // arguments stay supported for callers that only hold the summary fields.
    window._pdxStatPills = function(kept, broken, pending, opts) {
      opts = opts || {};
      var t = (opts.record && typeof window._pdxPromiseTally === 'function')
        ? window._pdxPromiseTally(opts.record) : null;
      var k, b, pn, pt;
      if (t) { k = t.kept; b = t.broken; pn = t.pending; pt = t.partial; }
      else {
        k = parseInt(kept, 10);    if (isNaN(k)) k = 0;
        b = parseInt(broken, 10);  if (isNaN(b)) b = 0;
        pn = parseInt(pending, 10); if (isNaN(pn)) pn = 0;
        pt = 0;
      }
      var resolved = k + b, unresolved = pn + pt;
      var pill = function(cls, txt) { return '<span class="pdx-statpill pdx-statpill-' + cls + '">' + txt + '</span>'; };
      // Outstanding promises, shown only when they exist — never as a zero.
      var openPills = (pn > 0 ? pill('pending', '⏳ ' + pn + ' Pending') : '')
                    + (pt > 0 ? pill('partial', '~ ' + pt + ' Partial') : '');

      // A candidate who lost at convention or withdrew never took office, so
      // "record starts in office" would be misleading — say so plainly instead,
      // matching the "Out of Race" badge and the profile's honest lede. This wins
      // over every other line, tally or not: those promises can no longer resolve
      // in office, which is true whatever the ledger holds.
      var _cs = String(opts.candidacyStatus || '').toLowerCase();
      var _lostPrimary = (_cs === 'eliminated_primary' || _cs === 'lost_primary');
      var _outOfRace = (_lostPrimary || _cs === 'eliminated' || _cs === 'withdrew' || _cs === 'withdrawn' || _cs === 'lost' || _cs === 'defeated' || _cs === 'suspended' || _cs === 'conceded');
      var outMsg = '';
      if (_outOfRace) outMsg = _lostPrimary ? '✖ Lost primary — not on the November ballot'
        : (_cs === 'withdrew' || _cs === 'withdrawn' || _cs === 'suspended') ? '✖ Withdrew before taking office — no record'
        : '✖ Did not advance — never took office';

      // ── Status-only mode ────────────────────────────────────────────────────
      // No ratio, no open counts, no zeroes. Just the office-status line, and
      // only when there is one worth printing. A politician with a real ledger
      // gets nothing from this row — the rail above already carries the read —
      // so it returns '' rather than inventing a substitute line for them.
      if (opts.tally === false) {
        if (outMsg) return '<div class="pdx-statpills">' + pill('none', outMsg) + '</div>';
        if (resolved > 0 || unresolved > 0) return '';
        var sMsg = '';
        if (opts.status === 'candidate') sMsg = opts.year2026 ? '🗳️ 2026 candidate — record starts in office' : '🗳️ Candidate — no voting record yet';
        else if (opts.status === 'former') sMsg = '⏳ Former office — record archived';
        else if (opts.status === 'office') sMsg = '🌱 Early in term — record being tracked';
        return sMsg ? '<div class="pdx-statpills">' + pill('none', sMsg) + '</div>' : '';
      }

      if (resolved > 0) {
        // A resolved record: "0 Broken" is earned information here, so both sides
        // of the ratio stay put. Outstanding work is appended, not substituted.
        return '<div class="pdx-statpills">' +
          pill('kept', '✓ ' + k + ' Kept') +
          pill('broken', '✗ ' + b + ' Broken') +
          openPills +
        '</div>';
      }

      // Nothing has resolved. Either promises are on file and still open, or the
      // record is genuinely empty — one or the other, and never a row of zeroes.
      var msg = '⏳ No voting record yet';
      if (outMsg) msg = outMsg;
      // Tracked but unresolved: the counts carry the record, so the neutral pill
      // only has to state what is missing from it.
      else if (unresolved > 0) msg = '⊘ None resolved yet';
      else if (opts.status === 'candidate') msg = opts.year2026 ? '🗳️ 2026 candidate — record starts in office' : '🗳️ Candidate — no voting record yet';
      else if (opts.status === 'former') msg = '⏳ Former office — record archived';
      else if (opts.status === 'office') msg = '🌱 Early in term — record being tracked';
      return '<div class="pdx-statpills">' + openPills + pill('none', msg) + '</div>';
    };

    // ── Coverage, as supporting evidence under the one read ──────────────────
    // The sample the ⚖️ Word vs Action verdict rests on: how many of the stated
    // positions on file actually have a recorded action to test them against.
    // Deliberately NOT a grade — it is a fraction of coverage, not of merit, and
    // it wears the neutral pill so nothing on the card reads as a second score.
    // Only ever published beside a publishable read; below the floor the rail's
    // own sub-line is the coverage statement and this would just repeat it.
    window._pdxCoveragePill = function(r) {
      if (!r || !r.publishable || !r.coverage) return '';
      var tested = r.coverage.tested || 0;
      var pool = r.coverage.scorable || r.coverage.word || 0;
      if (!tested || !pool) return '';
      if (pool < tested) pool = tested;
      return '<span class="pdx-statpill pdx-statpill-cov" title="Stated positions with a recorded action to test them against">'
        + '📊 ' + tested + '/' + pool + ' tested</span>';
    };

    // ── The one read, for every non-grid card that has a score slot ──────────
    // Every listing card, slot card, team card and modal header had its own copy
    // of `sc + '%'`, its own colour ramp and its own "No record yet" fallback, so
    // retiring the rate one site at a time was how one of them kept it. This is
    // the single answer they all render instead — and it is now the SAME answer
    // the unified compact card shell renders: ⚖️ Word vs Action.
    //
    // RETIRED, in two steps: first the pledge percentage, then the pledge lane
    // itself. This used to return 🤝 "Pledge record" / ⏳ "N pledges tracked" /
    // 🗳️ "2026 Ballot" / — "Pledges". Those were receipts sitting in the slot a
    // reader treats as the finding, which made a kept/broken ledger the headline
    // on the chub compare card, the My Team slot card and the My Home Team card
    // while the profile page led with the consistency read. A pledge is one form
    // of "said" and word-action.js already tests it against its sourced
    // resolution; the receipts belong on the profile beside their own disclosure,
    // not in a summary slot competing with the read that measures them.
    //
    // Fails closed: PDXWordAction owns `publishable`, and below that floor this
    // returns COVERAGE prose — what is missing — never a verdict and never a
    // number. Returns `tint` (the verdict's own colour) only when there is a
    // verdict to colour; callers must not substitute a ramp of their own.
    //
    // `pct` IS THE PROFILE'S NUMBER, OR NOTHING. Most callers render the prose and
    // ignore this; the few surfaces that are supposed to print a figure (the Home
    // Team onboarding preview) used to reach for the stored `p.score` instead —
    // the retired Promise percentage, frozen at whatever it was when it was last
    // written, so a card could advertise 85% over a profile reading 73%. It is the
    // same all-time PDXWordAction.read() the profile hero prints, off the same
    // read as the prose beside it, and it is null on every unpublishable branch:
    // there is no branch of this function that can return a stale number, because
    // there is no branch that reads a stored one.
    //
    // `opts.pid` is required — without a pid there is no action half to test the
    // word against (PDXConsistency.officialRecord(pid, issueKey)), so a caller that
    // omits it gets the honest "no read" shape rather than a wrong one.
    window._pdxLedgerSlot = function(p, opts) {
      opts = opts || {};
      var r = null;
      try {
        var wa = window.PDXWordAction;
        if (opts.pid && wa && typeof wa.read === 'function') r = wa.read(opts.pid, p);
      } catch (e) { r = null; }
      if (r && r.publishable && r.verdict && r.verdict.label) {
        return { state: 'wa', glyph: r.verdict.ico || '⚖', label: 'Word vs Action', sub: r.verdict.label,
                 tint: r.verdict.color || '', pct: (typeof r.pct === 'number') ? r.pct : null };
      }
      var cov = (r && r.coverage) || null;
      if (opts.status === 'candidate') {
        return { state: 'candidate', glyph: '🗳️', label: 'Word vs Action', sub: 'Record begins in office', tint: '', pct: null };
      }
      if (cov && cov.tested > 0) {
        return { state: 'tracking', glyph: '⏳', label: 'Word vs Action', sub: 'Not enough record yet', tint: '', pct: null };
      }
      if (cov && cov.word > 0) {
        return { state: 'wa', glyph: '…', label: 'Word vs Action', sub: 'No matched votes yet', tint: '', pct: null };
      }
      return { state: 'empty', glyph: '—', label: 'Word vs Action', sub: (opts.status === 'former') ? 'Record archived' : 'No stated positions yet', tint: '', pct: null };
    };

    // Consistent "Office • District • State" line for every compact card. District
    // is trimmed to its short label (the part before any parenthetical) and skipped
    // when it is already implied by the office title, so the line stays clean.
    window._pdxOfficeLine = function(d) {
      if (!d) return '';
      var office = d.office || '';
      var parts = [];
      if (office) parts.push(office);
      if (d.district) {
        var dist = String(d.district).split('(')[0].trim();
        var ol = office.toLowerCase();
        if (dist && ol.indexOf(dist.toLowerCase()) === -1 && ol.indexOf('dist') === -1) parts.push(dist);
      }
      if (d.state) parts.push(d.state);
      return (d.icon ? d.icon + ' ' : '') + parts.join(' • ');
    };

    // ════════════════════════════════════════════════════════════════════════
    // UNIFIED COMPACT CARD BUILDER
    // One canonical snapshot — photo, name, "Office • District • State", the
    // pledge-receipt slot, kept/broken/pending pills, a clear
    // quick-status badge and an optional signature highlight. Every grid listing
    // (All Politicians, Relevant to Me, Search, Compare, Favorites, My
    // Politicians, Watching) renders this exact inner markup, so the site reads
    // consistently. Section-specific badges, controls, extra slots (alignment /
    // accountability) and action buttons are supplied via opts. Rendered inside
    // the existing .chub-card shell so every card behaviour keeps working.
    //
    // AMENDED: the two items struck through above are gone. Because every dense
    // listing draws this markup, whatever occupies the score slot IS the app's
    // headline accountability signal — and it was a pledge tally, under a profile
    // page that leads with ⚖️ Word vs Action. The slot now prints that one read
    // (see the rail in `_pdxCardInner`), and the kept/broken/pending pills are
    // suppressed here via `_pdxStatPills(..., {tally:false})`, which keeps all of
    // that helper's non-score status prose. Coverage takes the pills' place as
    // supporting evidence. No pledge data or ledger logic was removed — the
    // receipts are still published on the profile beside their own disclosure.
    // ════════════════════════════════════════════════════════════════════════
    function _pdxSilhouette() {
      return '<span class="pdx-sil"><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 12.4c2.72 0 4.9-2.2 4.9-4.9S14.72 2.6 12 2.6 7.1 4.8 7.1 7.5 9.28 12.4 12 12.4zm0 2.3c-3.3 0-9.8 1.66-9.8 4.96V21.4h19.6v-1.74c0-3.3-6.5-4.96-9.8-4.96z"/></svg></span>';
    }
    function _pdxCardPhoto(pid, d, status) {
      // Single shared resolver (PROFILES → CMP_DATA → BROWSE_PHOTOS) so edited
      // headshots show immediately and every view stays in sync.
      var url = (typeof window._getPhotoUrl === 'function') ? window._getPhotoUrl(pid) : ((d && d.photo) ? d.photo : ((typeof BROWSE_PHOTOS !== 'undefined' && BROWSE_PHOTOS[pid]) ? BROWSE_PHOTOS[pid] : ''));
      var cls = status === 'office' ? 'pdx-photo--office' : status === 'candidate' ? 'pdx-photo--candidate' : 'pdx-photo--former';
      var img = url ? '<img class="pdx-photo-img" src="' + url + '" alt="' + (d.name || '') + '" loading="lazy" onerror="this.style.display=\'none\'">' : '';
      return '<div class="pdx-photo ' + cls + '">' + _pdxSilhouette() + img + '</div>';
    }
    // Clean "Office • District • State" line WITHOUT the leading office emoji, so
    // the photo carries the visual weight and the line stays typographic. When the
    // record has no district of its own, the resolved district/county (UT-02,
    // Davis County, …) is passed in so every card shows its seat clearly.
    function _pdxCleanOfficeLine(d, resolvedDist) {
      if (!d) return '';
      var office = d.office || '';
      var parts = [];
      if (office) parts.push(office);
      var dist = d.district ? String(d.district) : (resolvedDist || '');
      if (dist) {
        dist = dist.split('(')[0].trim();   // short label; drop any "(County)" tail
        var ol = office.toLowerCase();
        var dl = dist.toLowerCase();
        // Skip when the office title already names the same district, so the line
        // never reads "House District 56 • District 56".
        var redundant = ol.indexOf(dl) !== -1 || (dl.indexOf('district') === 0 && ol.indexOf('district') !== -1);
        if (dist && !redundant) parts.push(dist);
      }
      if (d.state && String(d.state).trim().toLowerCase() !== 'national') parts.push(d.state);
      return parts.join(' • ');
    }
    // Small name-row control buttons (favorite / save / watch). All stop the
    // card's click-through so they never accidentally open the profile.
    function _pdxHeartCtrl(pid) {
      var isFav = (typeof _favoritePids !== 'undefined') && _favoritePids.has(pid);
      return '<button class="pdx-snap-ctrl" onclick="event.stopPropagation();window.toggleFavorite(\'' + pid + '\')" title="' + (isFav ? 'Remove from Favorites' : 'Add to Favorites') + '">' + (isFav ? '❤️' : '🤍') + '</button>';
    }
    function _pdxStarCtrl(pid) {
      var isMy = (typeof _myPoliticians !== 'undefined') && _myPoliticians.has(pid);
      return '<button class="mypol-star ' + (isMy ? 'mypol-saved' : '') + '" onclick="event.stopPropagation();mypolToggle(\'' + pid + '\')" title="' + (isMy ? 'Remove from My Politicians' : 'Add to My Politicians') + '">★</button>';
    }
    function _pdxWatchCtrl(pid) {
      var isP = (typeof _potentialPoliticians !== 'undefined') && _potentialPoliticians.has(pid);
      return '<button class="potential-star-btn ' + (isP ? 'potential-saved' : '') + '" onclick="event.stopPropagation();potentialToggle(\'' + pid + '\')" title="' + (isP ? 'Remove from potential candidates' : 'Add to potential candidates') + '">🌟</button>';
    }
    // Section badges shared across listings.
    function _pdxLocalBadge(pid) {
      return (typeof _pdxIsLocalToUser === 'function' && _pdxIsLocalToUser(pid)) ? '<span class="chub-your-badge">📍 Local</span>' : '';
    }
    function _pdxTeamBadge(pid) {
      return ((typeof _myPoliticians !== 'undefined') && _myPoliticians.has(pid)) ? '<span class="chub-team-badge">✓ On Team</span>' : '';
    }
    // Formerly flagged cards saved in the separate "Home Team" base with a green
    // "🏠 Home Team" pill. With the unified single-team experience that badge was
    // retired — the "✓ On Team" badge above already marks everyone on My Voting
    // Team — so this now renders nothing. Kept as a no-op for its many callers.
    function _pdxHomeBadge(pid) {
      return '';
    }
    // Compact, icon-only Share button reused by the shared browse action rows.
    // Calls the same share sheet used by the pm-card and the profile modal, and
    // stops propagation so it never triggers the card's own open-profile click.
    function _pdxShareBtn(pid) {
      return '<button class="pdx-act-share" onclick="event.stopPropagation();window.pdxSharePolitician(\'' + pid + '\',event)" aria-label="Share this profile" title="Share">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"/></svg></button>';
    }
    // Standard "Compare + View Profile" action row used by most listings.
    function _pdxCompareActions(pid) {
      var sel = (typeof _cmpSelected !== 'undefined') && _cmpSelected.has(pid);
      return '<button class="chub-add-btn' + (sel ? ' chub-added' : '') + '" onclick="event.stopPropagation();chubToggle(\'' + pid + '\')">' + (sel ? '✓ Added' : '+ Compare') + '</button>' +
        '<button onclick="event.stopPropagation();showProfile(\'' + pid + '\')" class="font-condensed text-xs text-steel-400 hover:text-steel-200 tracking-wider uppercase" style="background:none;border:none;padding:0.3rem 0;cursor:pointer;">View Profile</button>' +
        _pdxShareBtn(pid);
    }

    // Unified browse action row — the full, consistent action set every compact
    // card in the browse / district tree / All Politicians sections shares:
    // a primary "Add to My Team" button plus secondary "Compare" and "Profile"
    // buttons. Keeping this in one place guarantees the same buttons, labels and
    // states appear on incumbent, candidate and "other" cards alike, instead of
    // each renderer hand-rolling a different subset.
    function _pdxTeamActions(pid) {
      var sel = (typeof _cmpSelected !== 'undefined') && _cmpSelected.has(pid);
      var isMy = (typeof _myPoliticians !== 'undefined') && _myPoliticians.has(pid);
      // When the visitor has set their Alignment Signature and this candidate is a
      // strong personal match, give the "Add" button the breathing green halo so
      // the best fits in a district browse visibly invite the pick.
      var strongMatch = false;
      if (!isMy && typeof _alignIssues !== 'undefined' && _alignIssues && _alignIssues.size > 0 && typeof _calcAlignmentScore === 'function') {
        var _ms = _calcAlignmentScore(pid);
        strongMatch = (_ms !== null && _ms >= 70);
      }
      var addBtnClass = isMy ? 'myteam-add-btn on-team' : ('myteam-add-btn' + (strongMatch ? ' match-strong' : ''));
      var addBtnText = isMy ? '✓ On Your Team' : '⭐ Add to My Team';
      var addBtnHover = isMy ? ' onmouseover="this.innerHTML=\'✕ Remove from Team\'" onmouseout="this.innerHTML=\'✓ On Your Team\'"' : '';
      // Light, contextual guidance on each action so a browsing voter knows the
      // good next step without extra on-card clutter: add fills a ballot seat,
      // compare weighs them against the others in the race, profile reads the
      // full record first.
      var addTitle = isMy ? 'On your team — click to remove' : (strongMatch ? 'Strong match for your values — add them to claim this seat' : 'Add to your voting team — fills their seat in My Voting Team');
      var cmpTitle = isMy ? 'Compare them against the others in this race' : 'Not sure yet? Compare with others in this race first';
      return '<div class="mypol-card-actions" style="width:100%;">' +
          '<button class="' + addBtnClass + ' mypol-act-add" title="' + addTitle + '" onclick="event.stopPropagation();mypolToggleAnimated(this,\'' + pid + '\')"' + addBtnHover + '>' + addBtnText + '</button>' +
          '<div class="mypol-card-actions-secondary">' +
            '<button class="bp-compare-btn mypol-act-compare' + (sel ? ' added' : '') + '" data-pid="' + pid + '" title="' + cmpTitle + '" onclick="event.stopPropagation();chubToggle(\'' + pid + '\')">⚖️ ' + (sel ? '✓ Comparing' : 'Compare') + '</button>' +
            '<button onclick="event.stopPropagation();showProfile(\'' + pid + '\')" class="mypol-act-profile" title="See their full record and promises first">View Profile</button>' +
            _pdxShareBtn(pid) +
          '</div>' +
        '</div>';
    }

    // Derive a short, clean one-line blurb from a full bio for use as a card's
    // descriptive line. Takes the first sentence (and a second only when the first
    // is very short), collapses whitespace and returns a single tidy line. It only
    // ever excerpts the real, stored bio — it never invents or paraphrases text.
    function _pdxBioBlurb(bio) {
      if (!bio) return '';
      var t = String(bio).replace(/\s+/g, ' ').trim();
      if (!t) return '';
      var m = t.match(/^[^.!?]*[.!?]/);
      var out = m ? m[0].trim() : t;
      if (out.length < 60) {
        var rest = t.slice(out.length).trim();
        var m2 = rest.match(/^[^.!?]*[.!?]/);
        if (m2) out = (out + ' ' + m2[0].trim()).trim();
      }
      return out;
    }
    window._pdxBioBlurb = _pdxBioBlurb;

    window._pdxCardInner = function(pid, opts) {
      opts = opts || {};
      var d = CMP_DATA[pid];
      if (!d) return '';
      var status = (typeof window._pdxOfficeStatus === 'function') ? window._pdxOfficeStatus(d) : 'office';
      // `hasScore` is a DATA predicate — "this record has a closed, itemized
      // pledge ledger" — and nothing more. Nothing below prints it, and no colour
      // scale is derived from it: colouring a slot by a rate is publishing the
      // rate. It survives only to gate the Accountability badge, which needs a
      // record substantial enough to be worth a second read.
      var hasScore = window._pdxDisplayScore(d) !== null && window._pdxDisplayScore(d) !== undefined;

      // Resolve this politician's real district / county so the office line can
      // state the seat clearly even where the card sits outside the browse tree
      // (search, favorites, compare). The 'Statewide' sentinel is suppressed.
      var resolvedDist = '';
      if (!d.district && typeof window._getPoliticianDistrictOrCounty === 'function') {
        var _rd = window._getPoliticianDistrictOrCounty(pid);
        if (_rd && _rd !== 'Statewide' && _rd !== 'Statewide Office') resolvedDist = _rd;
      }

      var statusBadge = (typeof window._pdxStatusBadge === 'function') ? window._pdxStatusBadge(d, { size: 'sm' }) : '';
      // Small, clean "Lost Primary" / "Out of Race" chip for records the office
      // status badge above doesn't already cover — i.e. sitting officeholders who
      // lost their primary or withdrew (the candidate badge already carries this
      // for candidate-status records, so we only add the chip for non-candidates
      // to avoid a duplicate). Keeps browse cards minimal and non-intrusive.
      var _candacy = (typeof window._pdxCandidacyState === 'function') ? window._pdxCandidacyState(d) : null;
      var statusChip = '';
      if (_candacy && status !== 'candidate') {
        var _chipPal = (_candacy.kind === 'inactive')
          ? 'background:rgba(148,163,184,0.14);border:1px solid rgba(148,163,184,0.45);color:#cbd5e1;'
          : 'background:rgba(220,38,38,0.14);border:1px solid rgba(248,113,113,0.45);color:#fca5a5;';
        statusChip = '<span class="pdx-status-badge" style="display:inline-flex;align-items:center;gap:0.25rem;vertical-align:middle;font-family:\'Barlow Condensed\',sans-serif;font-weight:700;letter-spacing:0.07em;text-transform:uppercase;border-radius:999px;white-space:nowrap;line-height:1.15;font-size:0.5rem;padding:0.1rem 0.42rem;' + _chipPal + '">' + _candacy.ico + ' ' + _candacy.short + '</span>';
      }
      // Prominent status banner — only on the "your politicians" surfaces
      // (Relevant to Me / My Home Team), which pass statusEmphasis:'high'. Browse
      // stays minimal with just the small chip/badge above.
      var statusBanner = (opts.statusEmphasis === 'high' && _candacy && typeof window._pdxStatusBanner === 'function')
        ? window._pdxStatusBanner(d, { emphasis: 'high' }) : '';
      var depthBadge = (typeof window._pdxDepthBadge === 'function') ? window._pdxDepthBadge(d, { size: 'sm' }) : '';
      var unopposed = (typeof window._pdxIsUnopposed === 'function' && window._pdxIsUnopposed(d)) ? window._pdxUnopposedBadge({ size: 'sm' }) : '';
      var party = (typeof window._pdxPartyChip === 'function') ? window._pdxPartyChip(d.party) : '';

      // ── The one rail. ⚖️ Word vs Action, on every compact card ──────────────
      //
      // RETIRED: the pledge-receipt rail. This slot used to be a four-state pledge
      // tile — 🤝 "Pledge record" / 🗳️ "2026 Ballot" / ⏳ "N pledges tracked" /
      // — "Promise · No record yet" — tapping through to the pledge-lane
      // explainer. It was the single most-rendered signal in the product: All
      // Politicians, Search, Compare, Favorites, My Politicians, Watching and
      // every Related grid draw this exact markup. So whatever sat here WAS the
      // app's headline accountability read, whatever the profile page said, and
      // what sat here was a pledge tally.
      //
      // A campaign pledge is one FORM OF "said". word-action.js already tests it
      // against its sourced resolution exactly as it tests a floor stance
      // (`testOf`: kept→consistent, broken→contradicts, unresolved→untested), so
      // the pledge lane was never a second system — it was a second PRESENTATION
      // of the one system, competing with it. The rail now prints the read itself.
      //
      // Rules this slot obeys, in order:
      //   1. The label is always "Word vs Action". One slot, one vocabulary.
      //   2. Above the publishing floor: the verdict's own glyph, colour and
      //      words, straight from PDXConsistency.VERDICTS via PDXWordAction.
      //   3. Below it: fail closed to COVERAGE prose — what is missing and why —
      //      never a hollow grade and never a zeroed pledge count dressed as one.
      //      PDXWordAction owns `publishable`; the card applies no floor of its own.
      //   4. No number. There is a percentage on the profile beside its own
      //      disclosure; 62px of dense grid is not where a rate gets explained.
      //
      // The pledge data, `_pdxPromiseTally`, `_pdxPledgeNote`, `_pdxCountsNote`,
      // `_pdxTrackingNote` and the whole kept/broken/pending ledger are untouched
      // and still published on the profile. They just no longer occupy the slot a
      // reader treats as the finding.
      var _waRead = null;
      try {
        var _waMod = window.PDXWordAction;
        if (_waMod && typeof _waMod.read === 'function') _waRead = _waMod.read(pid, d);
      } catch (e) { _waRead = null; }
      var _waSayable = !!(_waRead && _waRead.publishable && _waRead.verdict && _waRead.verdict.label);
      var _waCov = (_waRead && _waRead.coverage) || null;
      // The tile is tappable everywhere — it opens the explainer for the read it
      // is actually showing. It used to open the pledge-lane explainer, which is
      // now the wrong document for this slot.
      var scoreClick = ' role="button" tabindex="0"' +
        ' onclick="event.stopPropagation();window._pdxScoreCompareInfo(event,\'' + pid + '\')"' +
        ' onkeydown="if(event.key===\'Enter\'||event.key===\' \'){event.preventDefault();event.stopPropagation();window._pdxScoreCompareInfo(event,\'' + pid + '\');}"' +
        ' title="How does ⚖️ Word vs Action work?"';
      var infoHint = '<div class="pdx-score-info">ⓘ How?</div>';
      var waGlyph, waSub, waVariant, waTint;
      if (_waSayable) {
        // The verdict speaks for itself, in its own palette. Nothing here invents
        // a colour: a second ramp on this slot would be a second score.
        waGlyph = _waRead.verdict.ico || '⚖';
        waSub = _waRead.verdict.label;
        waTint = _waRead.verdict.color || '#cbd9ec';
        waVariant = 'wa';
      } else if (status === 'candidate') {
        // A candidate has no governing record to test yet, and saying so is the
        // honest coverage line — not "no record", which reads as a failing grade.
        // Keeps the blue 2026 identity the rail already carried.
        waGlyph = '🗳️';
        waSub = 'Record begins in office';
        waTint = '';
        waVariant = 'cand';
      } else if (_waCov && _waCov.tested > 0) {
        // Stated positions matched to real actions, but under the floor. The one
        // thing that must not happen here is a verdict on too little evidence.
        waGlyph = '⏳';
        waSub = 'Not enough record yet';
        waTint = '';
        waVariant = 'tracking';
      } else if (_waCov && _waCov.word > 0) {
        // We have their word; we have not matched an action to it yet. Name the
        // gap rather than implying the person has no positions.
        waGlyph = '…';
        waSub = 'No matched votes yet';
        waTint = '';
        waVariant = 'wa';
      } else {
        waGlyph = '—';
        waSub = (status === 'former') ? 'Record archived' : 'No stated positions yet';
        waTint = '';
        waVariant = 'wa';
      }
      var _waTintStyle = waTint ? ' style="color:' + waTint + ';"' : '';
      var scoreBlock =
        '<div class="pdx-snap-score pdx-snap-score-empty pdx-snap-score-' + waVariant + ' pdx-snap-score-click"' + scoreClick + '>' +
          '<div class="pdx-snap-score-num pdx-snap-score-num-empty pdx-snap-score-num-' + waVariant + '"' + _waTintStyle + '>' + waGlyph + '</div>' +
          '<div class="pdx-snap-score-lbl pdx-snap-score-lbl-' + waVariant + '">Word vs Action</div>' +
          '<div class="pdx-snap-score-na pdx-snap-score-na-' + waVariant + '"' + _waTintStyle + '>' + waSub + '</div>' +
          infoHint +
        '</div>';

      // `tally:false` — the kept/broken/pending pills are suppressed on this
      // shell. They were the rail's echo: a reader who saw "✓ 27 Kept ✗ 8 Broken"
      // under a card was reading a pledge ratio as the card's grade, one line
      // below the read that already measures those same pledges. Every non-score
      // status line the helper owns ("Lost primary — not on the November ballot",
      // "2026 candidate — record starts in office", "Early in term", "Former
      // office — record archived") is preserved verbatim; only the tally goes.
      var pills = (typeof window._pdxStatPills === 'function') ? window._pdxStatPills(d.kept, d.broken, d.pending, { record: d, status: status, year2026: (typeof window._pdx2026Candidate === 'function' && window._pdx2026Candidate(d)), candidacyStatus: d.candidacyStatus, tally: false }) : '';
      // Coverage, as supporting evidence under the primary read — the sample the
      // verdict rests on, never a grade. Only published when the read is, because
      // below the floor the rail's own sub-line is already the coverage statement.
      var covPill = (_waSayable && typeof window._pdxCoveragePill === 'function') ? window._pdxCoveragePill(_waRead) : '';
      var acct = (opts.acct !== false && hasScore && typeof window._acctCardBadge === 'function')
        ? '<span id="acctbadge-' + pid + '" style="display:inline-flex;">' + window._acctCardBadge(pid) + '</span>' : '';
      var commentChip = (typeof window._pdxCommentChip === 'function') ? window._pdxCommentChip(pid) : '';
      var voteChip = (typeof window._pdxVoteChip === 'function') ? window._pdxVoteChip(pid) : '';
      // Compact People's Mandate cue — shows the count of connected reforms and,
      // on tap, opens this card's medium modal focused on the connected-reforms
      // cue. Same reverse lookup as the profile, so the count always matches.
      var mandateChip = (opts.mandate !== false && typeof window._pdxMandateCardChip === 'function')
        ? window._pdxMandateCardChip(pid) : '';
      // Coverage leads the supporting row — it qualifies the rail directly above
      // it, so it reads as the read's sample size rather than a separate metric.
      var metrics = (covPill || pills || acct || commentChip || voteChip || mandateChip) ? '<div class="pdx-snap-metrics">' + covPill + pills + acct + commentChip + voteChip + mandateChip + '</div>' : '';

      var issues = '';
      // Prefer the politician's REAL documented positions (support / oppose /
      // mixed, drawn from ISSUE_STANCE_DATA) over the bare topic tags: a stance
      // chip carries the same issue label PLUS where they actually stand, so a
      // voter reads what someone is for or against without opening the modal.
      // This is the main lever that makes the issue-position work visible while
      // browsing, and it gives thin / Limited-Record profiles real substance.
      var stanceRow = (opts.stances !== false && typeof window._pdxStanceChips === 'function')
        ? window._pdxStanceChips(pid, d, { max: opts.maxStances || opts.maxIssues || 3 })
        : '';
      if (stanceRow) {
        issues = stanceRow;
      } else if (opts.issues !== false && d.issues && d.issues.length) {
        // No documented support/oppose record yet, but the politician DOES have
        // stated campaign priorities / focus areas. Rather than floating these as
        // bare, unlabeled tags (which read ambiguously — are they positions? topics?),
        // give them the same eyebrow treatment as stance chips so the card explains
        // what the tags mean and reads as intentional. This is the main lever that
        // makes a thin / new-candidate card feel informative: a voter sees, at a
        // glance, the issues the campaign actually leads with. Labeled honestly as
        // priorities (not voting positions) so nothing is overstated.
        var nIssues = opts.maxIssues || 3;
        var moreIssues = d.issues.length - nIssues;
        var issueLbl = (status === 'candidate') ? 'Campaign priorities' : 'Focus areas';
        issues = '<div class="pdx-snap-stances pdx-snap-issues-wrap">' +
          '<div class="pdx-stance-eyebrow"><span class="pdx-stance-eyebrow-ico">🎯</span>' +
            '<span class="pdx-stance-eyebrow-txt">' + issueLbl + ' · <b>' + d.issues.length + '</b></span></div>' +
          '<div class="pdx-snap-issues">' +
            d.issues.slice(0, nIssues).map(function(i) { return '<span class="pdx-snap-issue">' + i + '</span>'; }).join('') +
            (moreIssues > 0 ? '<span class="pdx-stance-more">+' + moreIssues + ' more</span>' : '') +
          '</div>' +
        '</div>';
      } else if (opts.issues !== false) {
        // No documented positions and no campaign-priority tags. Rather than leave
        // a blank gap on the card — which read as half-built and inconsistent next
        // to neighbours that DO carry a positions row — fill the slot with the
        // clean, muted "Focus areas being compiled" note. _pdxFocusEmptyNote picks
        // honest copy for the record (candidate / inactive / officeholder) and
        // returns '' when there is nothing appropriate to say, so this never
        // overstates. Applies to every card now, not just thin/candidate ones, so
        // a full officeholder who simply has no stances yet still reads finished.
        var emptyNote = (typeof window._pdxFocusEmptyNote === 'function') ? window._pdxFocusEmptyNote(d) : '';
        if (emptyNote) issues = '<div class="pdx-snap-issues pdx-snap-issues-empty">' + emptyNote + '</div>';
      }

      // Signature highlight: explicit opts.highlight string, or derived from the
      // record's "why this matters" blurb. opts.highlight === false suppresses it.
      // For candidates the highlight is tinted blue and led with a ballot icon, so
      // a thin challenger card still carries a clear, intentional line about who they
      // are and why they're running — its main source of content weight.
      var highlight = '';
      if (opts.highlight !== false) {
        var hl = (typeof opts.highlight === 'string') ? opts.highlight : (d.why || '');
        // No "why this matters" blurb, but the profile carries a real signature
        // quote — surface it on the card as a pull-quote. A human, sourced quote
        // reads as far more alive than a blank slot, and it makes the quote work
        // visible while browsing instead of only inside the modal.
        var hlIsQuote = false;
        if (!hl && d.quote && String(d.quote).trim()) { hl = String(d.quote).trim(); hlIsQuote = true; }
        // 2026 candidates almost never carry a "why this matters" blurb yet, which
        // left their cards with no descriptive line at all — the main reason they
        // read as thin. Fall back to a clean one-line excerpt of their real, stored
        // bio so the card carries honest, verifiable context instead of a blank gap.
        if (!hl && status === 'candidate' && d.bio) hl = _pdxBioBlurb(d.bio);
        if (hl) {
          if (hl.length > 150) hl = hl.slice(0, 147).replace(/\s+\S*$/, '') + '…';
          var isCand = (status === 'candidate');
          if (hlIsQuote) {
            // Quote variant — italic with an opening quotation mark, distinct from
            // the ★/🗳️ "why" highlight so it reads unmistakably as their own words.
            // When the quote carries a documented attribution, surface it as a
            // small cite right on the card (the modal already does this) so the
            // sourced-quote work reads as finished and trustworthy while browsing
            // rather than only inside the profile. Quotes without a source simply
            // omit the line — no empty "— " stub.
            var qSrc = (d.quoteSource && String(d.quoteSource).trim()) ? String(d.quoteSource).trim() : '';
            highlight = '<div class="pdx-snap-highlight pdx-snap-highlight--quote"><span class="pdx-snap-highlight-ico">“</span>' +
              '<span class="pdx-snap-highlight-body"><span>' + hl + '</span>' +
              (qSrc ? '<span class="pdx-snap-quote-cite">' + qSrc + '</span>' : '') +
              '</span></div>';
          } else {
            var hlCls = isCand ? 'pdx-snap-highlight pdx-snap-highlight--candidate' : 'pdx-snap-highlight';
            var hlIco = isCand ? '🗳️' : '★';
            highlight = '<div class="' + hlCls + '"><span class="pdx-snap-highlight-ico">' + hlIco + '</span><span>' + hl + '</span></div>';
          }
        }
      }

      return '<div class="pdx-snap-head">' +
          _pdxCardPhoto(pid, d, status) +
          '<div class="pdx-snap-id">' +
            '<div class="pdx-snap-nameline">' +
              '<span class="pdx-snap-name font-display" onclick="event.stopPropagation();openMediumModal(\'' + pid + '\')">' + d.name + '</span>' +
              (opts.controls || '') +
            '</div>' +
            '<div class="pdx-snap-office">' + _pdxCleanOfficeLine(d, resolvedDist) + '</div>' +
            (function(){ var tp = (typeof window._pdxTenurePill === 'function') ? window._pdxTenurePill(d) : ''; return tp ? '<div class="pdx-snap-tenure">' + tp + '</div>' : ''; })() +
            '<div class="pdx-snap-badges">' + statusBadge + statusChip + depthBadge + unopposed + party + (opts.badges || '') + '</div>' +
          '</div>' +
          (opts.hideScore ? '' : scoreBlock) +
        '</div>' +
        statusBanner +
        metrics +
        (opts.topExtra ? '<div class="pdx-snap-extra">' + opts.topExtra + '</div>' : '') +
        issues +
        highlight +
        (opts.extra ? '<div class="pdx-snap-extra">' + opts.extra + '</div>' : '') +
        ((opts.evidence !== false && typeof window._pdxEvidenceRow === 'function') ? window._pdxEvidenceRow(pid) : '') +
        (opts.actions ? '<div class="pdx-snap-actions">' + opts.actions + '</div>' : '');
    };

    // Wrap the unified inner card in the .chub-card shell with click-to-profile.
    window._pdxCardShell = function(pid, opts) {
      opts = opts || {};
      var inner = window._pdxCardInner(pid, opts);
      if (!inner) return '';
      // Glanceable "already on your team" state — one chokepoint so the same
      // mint rail + glow appears on every browse surface (district tree, All
      // Politicians, Relevant to Me, Favorites, Compare hub) the moment a pick
      // is added, and persists so it's obvious what's already on the team.
      var onTeam = (typeof _myPoliticians !== 'undefined') && _myPoliticians.has(pid);
      var cls = 'chub-card pdx-card' + (opts.cardClass ? ' ' + opts.cardClass : '') + (onTeam ? ' pdx-on-team' : '');
      var style = 'cursor:pointer;' + (opts.cardStyle || '');
      var idAttr = opts.cardId ? ' id="' + opts.cardId + '"' : '';
      return '<div class="' + cls + '" data-pid="' + pid + '"' + idAttr +
        ' style="' + style + '" onclick="openMediumModal(\'' + pid + '\')">' + inner + '</div>';
    };


    function _mypolRenderPrimaryCard(pid) {
      const d = CMP_DATA[pid];
      if (!d) return '';
      // ⚖️ Word vs Action — the one read, via window._pdxLedgerSlot.
      const slot = window._pdxLedgerSlot(d, { pid: pid, status: (typeof window._pdxOfficeStatus === 'function') ? window._pdxOfficeStatus(d) : 'office' });
      const sel = _cmpSelected.has(pid);
      const meta = _getPrimaryRepMeta()[pid];
      if (!meta) return '';
      const isSaved = _myPoliticians.has(pid);
      const isPotential = _potentialPoliticians.has(pid);
      const isFav = _favoritePids.has(pid);
      const photoUrl = meta && meta.photo ? meta.photo : '';
      const photoHtml = photoUrl
        ? '<div style="width:52px;height:52px;border-radius:50%;overflow:hidden;flex-shrink:0;border:2px solid rgba(245,158,11,0.35);background:rgba(30,53,96,0.5);box-shadow:0 2px 8px rgba(0,0,0,0.3);"><img loading="lazy" decoding="async" src="' + photoUrl + '" alt="' + d.name + '" style="width:100%;height:100%;object-fit:cover;object-position:top center;" onerror="this.style.display=\'none\';this.parentElement.innerHTML=\'<div style=\\\'display:flex;align-items:center;justify-content:center;width:100%;height:100%;font-size:1.5rem\\\'>🏛</div>\'"></div>'
        : '<div style="width:52px;height:52px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,rgba(30,53,96,0.7),rgba(10,15,30,0.8));border:2px solid rgba(245,158,11,0.35);font-size:1.5rem;flex-shrink:0;">🏛</div>';
      const descHtml = meta && meta.desc ? '<p class="font-condensed text-xs text-steel-500 tracking-wide mb-1.5" style="font-size:0.65rem;line-height:1.4;">' + meta.desc + '</p>' : '';
      const heartHtml = '<button class="heart-btn-circle" onclick="event.stopPropagation();window.toggleFavorite(\'' + pid + '\')" title="' + (isFav ? 'Remove from Favorites' : 'Add to Favorites') + '" style="font-size:1.1rem;background:none;border:none;cursor:pointer;transition:transform 0.2s;padding:0 2px;" onmouseover="this.style.transform=\'scale(1.2)\'" onmouseout="this.style.transform=\'scale(1)\'">' + (isFav ? '❤️' : '🤍') + '</button>';
      // Documented positions for this saved representative. When present they
      // replace the bare topic tags (same info, plus where they stand) and sit on
      // their own row so the card reads cleanly.
      const primStances = (typeof window._pdxStanceChips === 'function') ? window._pdxStanceChips(pid, d, { max: 3 }) : '';

      return '<div class="chub-card mypol-primary-card" data-pid="' + pid + '">' +
        '<div class="flex items-start gap-3">' +
          photoHtml +
          '<div class="flex-1 min-w-0">' +
            '<div class="flex items-center gap-2 flex-wrap mb-1">' +
              '<span class="font-display text-base tracking-wider text-white leading-tight">' + d.name + '</span>' +
              '<button class="mypol-star ' + (isSaved ? 'mypol-saved' : '') + '" onclick="event.stopPropagation();mypolToggle(\'' + pid + '\')" title="' + (isSaved ? 'Remove from My Politicians' : 'Add to My Politicians') + '">★</button>' +
              '<button class="potential-star-btn ' + (isPotential ? 'potential-saved' : '') + '" onclick="event.stopPropagation();potentialToggle(\'' + pid + '\')" title="' + (isPotential ? 'Remove from potential candidates' : 'Add to potential candidates') + '">🌟</button>' +
              heartHtml +
            '</div>' +
            '<div class="mb-1.5"><span class="' + meta.badgeClass + '">' + (meta.badgeClass === 'mypol-house-badge' ? '⚡ ' : '') + meta.badge + '</span>' + (typeof window._pdxDepthBadge === 'function' ? ' ' + window._pdxDepthBadge(d, { size: 'sm' }) : '') + '</div>' +
            // Prominent "lost primary / withdrew" banner so a voter sees at a
            // glance when one of their real representatives is no longer in the
            // 2026 race. Renders nothing for active officeholders/candidates.
            ((typeof window._pdxStatusBanner === 'function') ? window._pdxStatusBanner(d, { emphasis: 'high' }) : '') +
            '<p class="font-condensed text-xs text-steel-400 tracking-wide mb-1">' + d.icon + ' ' + meta.sublabel + '</p>' +
            descHtml +
            '<div class="flex items-center gap-3">' +
              '<div style="flex-shrink:0;">' +
                '<div class="chub-score" style="color:' + (slot.tint || '#9fb4d4') + ';font-size:1.3rem;">' + slot.glyph + '</div>' +
                '<div class="font-condensed text-xs text-steel-500 tracking-wider uppercase text-center" style="font-size:0.5rem;">' + slot.label + '</div>' +
                '<div class="font-condensed tracking-wider uppercase text-center" style="font-size:0.46rem;color:' + (slot.tint || '#647a9c') + ';margin-top:0.1rem;">' + slot.sub + '</div>' +
              '</div>' +
              (typeof _alignScoreHtml === 'function' ? _alignScoreHtml(pid, 'ring') : '') +
              '<div class="flex flex-wrap gap-1">' +
                (primStances
                  ? ''
                  : (d.issues && d.issues.length
                    ? d.issues.slice(0,3).map(function(i) { return '<span class="inline-block bg-navy-900/60 border border-white/5 rounded-full px-2 py-0.5 font-condensed text-steel-500" style="font-size:0.55rem;letter-spacing:0.05em;">' + i + '</span>'; }).join('')
                    : (typeof window._pdxFocusEmptyNote === 'function' ? window._pdxFocusEmptyNote(d) : ''))) +
              '</div>' +
            '</div>' +
            primStances +
            '<div class="flex items-center gap-2 mt-2">' +
              '<button class="chub-add-btn ' + (sel ? 'chub-added' : '') + '" onclick="chubToggle(\'' + pid + '\')">' + (sel ? '✓ Added' : '+ Compare') + '</button>' +
              '<button onclick="showProfile(\'' + pid + '\')" class="font-condensed text-xs text-steel-500 hover:text-steel-300 tracking-wider uppercase transition-colors cursor-pointer" style="background:none;border:none;padding:0.3rem 0;">View Profile</button>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>';
    }

    function _mypolRenderCard(pid) {
      const d = CMP_DATA[pid];
      if (!d) return '';
      const sel = _cmpSelected.has(pid);
      const isMy = _myPoliticians.has(pid);
      const isPotential = _potentialPoliticians.has(pid);
      const savedBadge = isMy ? '<span style="display:inline-flex;align-items:center;gap:0.2rem;background:rgba(245,158,11,0.12);border:1px solid rgba(245,158,11,0.3);color:#fbbf24;font-family:\'Barlow Condensed\',sans-serif;font-weight:700;font-size:0.55rem;letter-spacing:0.06em;text-transform:uppercase;padding:0.12rem 0.4rem;border-radius:999px;">★ Saved</span>' : '';
      const potentialBadge = isPotential ? '<span class="potential-badge">🌟 Watching</span>' : '';
      const alignBar = (typeof _alignCardBar === 'function') ? _alignCardBar(pid) : '';
      return window._pdxCardShell(pid, {
        cardClass: sel ? 'chub-selected' : '',
        controls: _pdxStarCtrl(pid) + _pdxWatchCtrl(pid) + _pdxHeartCtrl(pid),
        badges: _pdxLocalBadge(pid) + savedBadge + potentialBadge,
        extra: alignBar,
        actions: _pdxCompareActions(pid)
      });
    }

    if (!window.TEAM_POSITIONS) {
      window.TEAM_POSITIONS = [
        { key: 'senate', label: 'U.S. Senate', icon: '\u{1F3DB}', color: '#818cf8', emptyIcon: '\u{1F3DB}' },
        { key: 'house', label: 'U.S. House', icon: '\u{1F3DB}', color: '#60a5fa', emptyIcon: '\u{1F3DB}' },
        { key: 'governor', label: 'Governor', icon: '\u{1F985}', color: '#34d399', emptyIcon: '\u{1F985}' },
        { key: 'statesenate', label: 'State Senate', icon: '\u{1F3DB}', color: '#a78bfa', emptyIcon: '\u{1F3DB}' },
        { key: 'statehouse', label: 'State House Rep', icon: '\u{1F3DB}', color: '#2dd4bf', emptyIcon: '\u{1F3DB}' },
        { key: 'local', label: 'Local Office', icon: '\u{1F3D9}', color: '#fbbf24', emptyIcon: '\u{1F3D9}' }
      ];
    }
    var TEAM_BALLOT_KEY = 'politidex_my_team';

    function _getTeamBallotSelections() {
      // Phase 2: read the ballot from the unified team source (organized per seat)
      // via the PDXTeamView adapter. The adapter itself falls back to the legacy
      // ballot store when the v2 source is unavailable or empty, so this is a pure
      // routing change with no behavior difference in steady state. The direct
      // localStorage read below is kept as a last-resort fallback for the brief
      // window before the adapter is defined (or if it is ever absent).
      try {
        if (window.PDXTeamView && typeof window.PDXTeamView.ballotSelections === 'function') {
          return window.PDXTeamView.ballotSelections();
        }
      } catch (e) {}
      try { var s = localStorage.getItem(TEAM_BALLOT_KEY); if (s) return JSON.parse(s); } catch(e) {}
      return {};
    }

    // Section-level "Personalized Alignment" prompt for the team builder. It gives
    // the saved Alignment Signature a home inside My Voting Team:
    //   • no issues chosen  → a prominent purple CTA inviting the visitor to set up
    //     their signature and unlock a "Your Match %" on every candidate;
    //   • issues chosen      → a compact confirmation that personalized match is on,
    //     showing how many positions drive it, the save state (saved to account vs
    //     sign-in-to-save), and a quick "Adjust Issues" link back to the picker.
    // Pulls live from the same _alignIssues / Firebase-backed signature the rest of
    // the tool uses, so it can never drift from the scores shown on the cards.
    function _myteamRenderAlignPrompt() {
      var el = document.getElementById('myteam-align-prompt');
      if (!el) return;
      var n = (typeof window._alignIssueCount === 'function') ? window._alignIssueCount()
            : ((typeof _alignIssues !== 'undefined' && _alignIssues && _alignIssues.size) || 0);
      var signedIn = false;
      try { signedIn = !!(typeof auth !== 'undefined' && auth && auth.currentUser && !auth.currentUser.isAnonymous); } catch (e) {}

      if (!n) {
        el.style.display = '';
        el.innerHTML =
          '<div style="display:flex;align-items:center;gap:0.9rem;flex-wrap:wrap;background:linear-gradient(135deg, rgba(88,28,135,0.30) 0%, rgba(139,92,246,0.08) 100%);border:1px solid rgba(139,92,246,0.42);border-radius:1rem;padding:0.9rem 1.1rem;margin-bottom:1.5rem;box-shadow:inset 0 1px 0 rgba(255,255,255,0.04), 0 0 24px rgba(139,92,246,0.08);">' +
            '<div style="width:42px;height:42px;border-radius:0.75rem;background:linear-gradient(135deg,#8b5cf6,#6d28d9);display:flex;align-items:center;justify-content:center;font-size:1.4rem;flex-shrink:0;box-shadow:0 0 16px rgba(139,92,246,0.4);">🎯</div>' +
            '<div style="flex:1;min-width:200px;">' +
              '<div class="font-condensed" style="font-weight:700;letter-spacing:0.04em;color:#d8b4fe;font-size:0.95rem;text-transform:uppercase;">Build your team by values, not party</div>' +
              '<div class="font-condensed" style="color:#c4b5fd;font-size:0.82rem;line-height:1.42;margin-top:0.15rem;">Set up your <strong style="color:#e9d5ff;">Alignment Signature</strong> to see a <strong style="color:#e9d5ff;">Your Match&nbsp;%</strong> on every candidate — and fill your ballot based on who actually fits your values, regardless of party.</div>' +
            '</div>' +
            '<button type="button" onclick="if(window._krAlignGuideToPicker)window._krAlignGuideToPicker();" class="font-condensed" style="white-space:nowrap;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;font-size:0.78rem;color:#fff;background:linear-gradient(135deg,#7c3aed,#6d28d9);border:1px solid rgba(167,139,250,0.5);border-radius:0.75rem;padding:0.6rem 1.1rem;cursor:pointer;box-shadow:0 4px 16px rgba(139,92,246,0.3);transition:transform 0.15s ease, box-shadow 0.2s ease;" onmouseover="this.style.transform=\'translateY(-1px)\';this.style.boxShadow=\'0 6px 22px rgba(139,92,246,0.45)\'" onmouseout="this.style.transform=\'\';this.style.boxShadow=\'0 4px 16px rgba(139,92,246,0.3)\'">🎯 Set Up Match</button>' +
          '</div>';
        return;
      }

      el.style.display = '';
      var saveNote = signedIn
        ? '<span style="color:#86efac;">✅ Saved to your account</span>'
        : '<span style="color:#fcd34d;">💾 <button type="button" onclick="(window.openAuthModal||function(){})()" style="background:none;border:none;padding:0;cursor:pointer;font:inherit;color:#fcd34d;text-decoration:underline;">Sign in to save across devices</button></span>';
      el.innerHTML =
        '<div style="display:flex;align-items:center;gap:0.8rem;flex-wrap:wrap;background:linear-gradient(135deg, rgba(88,28,135,0.20) 0%, rgba(139,92,246,0.05) 100%);border:1px solid rgba(139,92,246,0.32);border-radius:1rem;padding:0.7rem 1rem;margin-bottom:1.5rem;">' +
          '<div style="width:34px;height:34px;border-radius:0.6rem;background:rgba(139,92,246,0.18);border:1px solid rgba(139,92,246,0.4);display:flex;align-items:center;justify-content:center;font-size:1.1rem;flex-shrink:0;">🎯</div>' +
          '<div style="flex:1;min-width:180px;">' +
            '<div class="font-condensed" style="font-weight:700;letter-spacing:0.03em;color:#d8b4fe;font-size:0.86rem;">Personalized Match is on — every candidate shows <span style="color:#e9d5ff;">Your Match&nbsp;%</span></div>' +
            '<div class="font-condensed" style="color:#9fb4d4;font-size:0.74rem;margin-top:0.12rem;">Based on your <strong style="color:#c4b5fd;">' + n + ' saved position' + (n > 1 ? 's' : '') + '</strong> · ' + saveNote + '</div>' +
          '</div>' +
          '<button type="button" onclick="if(window._krAlignGuideToPicker)window._krAlignGuideToPicker();" class="font-condensed" style="white-space:nowrap;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;font-size:0.72rem;color:#c4b5fd;background:rgba(139,92,246,0.12);border:1px solid rgba(139,92,246,0.4);border-radius:0.6rem;padding:0.45rem 0.85rem;cursor:pointer;transition:background 0.2s ease;" onmouseover="this.style.background=\'rgba(139,92,246,0.22)\'" onmouseout="this.style.background=\'rgba(139,92,246,0.12)\'">⚙ Adjust Issues</button>' +
        '</div>';
    }
    window._myteamRenderAlignPrompt = _myteamRenderAlignPrompt;

    // Maps a ballot slot key to its level of government, so each slot can show a
    // clear Federal / State / Local eyebrow above the specific office. Keeps the
    // grouping logic in one place across every ballot configuration.
    function _slotTier(key) {
      if (key === 'president' || key === 'senate' || key === 'house' ||
          key === 'defense' || key === 'intel') return 'Federal';
      if (key === 'local') return 'Local';
      return 'State';
    }
    window._slotTier = _slotTier;

    // One-line, plain-language description of what each office actually does, keyed
    // by slot. Surfaced on the empty slots (and as a tooltip on filled ones) so a
    // visitor never has to guess what "State Senate" or "Lt. Governor" means before
    // they pick. Keyed so it covers every state-specific TEAM_POSITIONS variant.
    function _slotBlurb(key) {
      var map = {
        president: 'Leads the country & sets the national agenda',
        senate: 'Represents your whole state in Washington',
        house: "Your district's voice in the U.S. House",
        governor: "Runs your state's government",
        ltgovernor: 'Second-in-command for your state',
        statesenate: 'Your district in the state senate',
        statehouse: 'Your district in the state house',
        secstate: 'Oversees your elections & state records',
        secretaryofstate: 'Oversees your elections & state records',
        attorneygeneral: "Your state's top law-enforcement lawyer",
        chiefjustice: "Sits on your state's highest court",
        defense: 'Leads the nation’s military & defense',
        intel: 'Heads the national intelligence community',
        local: 'Mayor, council & the leaders closest to home'
      };
      return map[key] || 'A key office on your 2026 ballot';
    }
    window._slotBlurb = _slotBlurb;

    function _renderSlotCard(pos, pid) {
      var d = CMP_DATA[pid];
      if (!d) return '';
      // ⚖️ Word vs Action — the one read, via window._pdxLedgerSlot. `pid` is
      // required: without it there is no action half to test the word against.
      var slot = window._pdxLedgerSlot(d, { pid: pid, status: (typeof window._pdxOfficeStatus === 'function') ? window._pdxOfficeStatus(d) : 'office' });
      var sel = _cmpSelected.has(pid);
      var photoUrl = (typeof window._getPhotoUrl === 'function') ? window._getPhotoUrl(pid) : (BROWSE_PHOTOS[pid] || '');
      var photoHtml = photoUrl
        ? '<div class="myteam-slot-photo" style="border-color:' + pos.color + '80;"><img loading="lazy" decoding="async" src="' + photoUrl + '" alt="' + d.name + '" onerror="this.style.display=\'none\';this.parentElement.innerHTML=\'<div style=\\\'display:flex;align-items:center;justify-content:center;width:100%;height:100%;font-size:2.2rem;color:#9fb4d4\\\'>' + (d.icon || '\u{1F3DB}') + '</div>\'"></div>'
        : '<div class="myteam-slot-photo" style="display:flex;align-items:center;justify-content:center;font-size:2.2rem;color:#9fb4d4;border-color:' + pos.color + '80;">' + (d.icon || '\u{1F3DB}') + '</div>';
      var matchBand = typeof _slotMatchBand === 'function' ? _slotMatchBand(pid) : '';
      var partyLabel = d.party ? (d.party === 'R' ? 'Republican' : d.party === 'D' ? 'Democrat' : d.party === 'I' ? 'Independent' : (d.party === 'F' || d.party === 'Forward') ? 'Forward Party' : '') : '';
      var partyColor = d.party === 'R' ? '#f87171' : d.party === 'D' ? '#60a5fa' : (d.party === 'F' || d.party === 'Forward') ? '#22d3ee' : '#a78bfa';
      var partyBadge = partyLabel ? '<span class="font-condensed" style="font-size:0.52rem;letter-spacing:0.07em;text-transform:uppercase;color:' + partyColor + 'cc;background:' + partyColor + '10;border:1px solid ' + partyColor + '24;padding:0.08rem 0.4rem;border-radius:999px;font-weight:500;opacity:0.8;">' + partyLabel + '</span>' : '';

      // RETIRED: `keptBrokenHtml` — a green "✓ N Kept" / red "✕ N Broken" pair
      // painted directly under the slot's score rail. Those same pledges are
      // measured inside ⚖️ Word vs Action, which the rail above now prints, so
      // this was the one system's own evidence re-scored in a second palette.
      // (It was also unreachable: it gated on `sc`, an undeclared identifier left
      // behind when the pledge percentage was retired, so this whole function
      // threw a ReferenceError before it could return. Removing the tally removes
      // the last reader of `sc`.) The counts still live on the profile.
      // Accountability of Truth chip — the integrity signal for this teammate, shown
      // front-and-center on the slot so a voter can weigh how well they keep their word.
      var acctBadgeHtml = (typeof window._acctCardBadge === 'function')
        ? '<div class="myteam-slot-acct" style="display:flex;justify-content:center;margin:0.1rem 0 0.5rem;" onclick="event.stopPropagation();">' + window._acctCardBadge(pid) + '</div>' : '';

      // Keyboard + screen-reader access: the card is a clickable summary, so
      // expose it as a focusable button with a descriptive label and Enter/Space
      // activation. The guard keeps the nested action buttons (which handle their
      // own keys and stop propagation) from double-firing the card's own open.
      var _slotAria = _medEsc((d.name || 'This pick') + ' — your ' + (pos.label || 'ballot') + ' pick. Open summary.');
      return '<div class="myteam-slot' + (window._pdxJustFilledPid === pid ? ' myteam-slot--just-filled' : '') + '" data-pid="' + pid + '" role="button" tabindex="0" aria-label="' + _slotAria + '" style="--slot-color:' + pos.color + ';animation-delay:' + (TEAM_POSITIONS.indexOf(pos) * 0.07) + 's" onclick="openMediumModal(\'' + pid + '\')" onkeydown="if((event.key===\'Enter\'||event.key===\' \')&&event.target===this){event.preventDefault();openMediumModal(\'' + pid + '\')}">' +
        '<button class="myteam-slot-clear-btn" aria-label="Remove ' + _slotAria.split(' — ')[0] + ' from your team" onclick="event.stopPropagation();myteamClearSlot(\'' + pos.key + '\', this)" title="Remove from your team">&times;</button>' +
        '<div class="myteam-slot-tier" style="color:' + pos.color + ';">' + _slotTier(pos.key) + '</div>' +
        '<div class="myteam-slot-position" title="' + _slotBlurb(pos.key) + '" style="background:' + pos.color + '1a;border:1px solid ' + pos.color + '45;color:' + pos.color + ';">' + pos.icon + ' ' + pos.label + '</div>' +
        '<div class="myteam-slot-scope">' + (typeof _myteamSeatScope === 'function' ? _myteamSeatScope(pos.key) : '') + '</div>' +
        photoHtml +
        '<div class="font-display text-xl tracking-wider text-white leading-tight" style="margin-bottom:0.2rem;text-shadow:0 1px 8px rgba(0,0,0,0.3);">' + d.name + '</div>' +
        '<p class="myteam-slot-office font-condensed text-xs text-steel-400 tracking-wide" style="font-size:0.68rem;margin-bottom:0.15rem;">' + d.icon + ' ' + d.office + '</p>' +
        '<div class="myteam-slot-badges" style="display:flex;justify-content:center;align-items:center;gap:0.3rem;flex-wrap:wrap;margin-bottom:0.35rem;">' + window._pdxStatusBadge(d, { size: 'sm' }) + (typeof window._pdxDepthBadge === 'function' ? window._pdxDepthBadge(d, { size: 'sm' }) : '') + (typeof window._pdxIsUnopposed === 'function' && window._pdxIsUnopposed(d) ? window._pdxUnopposedBadge({ size: 'sm' }) : '') + '</div>' +
        (partyBadge ? '<div class="myteam-slot-party" style="margin-bottom:0.45rem;">' + partyBadge + '</div>' : '<div class="myteam-slot-party" style="margin-bottom:0.3rem;"></div>') +
        '<div class="myteam-slot-info-row">' +
          '<div style="display:flex;flex-direction:column;align-items:center;line-height:1;">' +
            '<div class="chub-score" style="color:' + (slot.tint || '#c8d7ee') + ';font-size:2rem;font-family:\'Bebas Neue\',sans-serif;">' + slot.glyph + '</div>' +
            '<div class="myteam-slot-score-label" style="color:#9fb4d4;">' + slot.label + '</div>' +
            '<div class="font-condensed" style="font-size:0.55rem;letter-spacing:0.06em;text-transform:uppercase;color:' + (slot.tint || '#7d97bd') + ';">' + slot.sub + '</div>' +
          '</div>' +
        '</div>' +
        acctBadgeHtml +
        matchBand +
        '<div class="myteam-slot-issues flex flex-wrap gap-1 justify-center mb-2" style="margin-top:0.4rem;">' +
          (d.issues && d.issues.length
            ? d.issues.slice(0,3).map(function(i) { return '<span class="inline-block bg-navy-900/60 border border-white/5 rounded-full px-2.5 py-0.5 font-condensed text-steel-500" style="font-size:0.58rem;">' + i + '</span>'; }).join('')
            : (typeof window._pdxFocusEmptyNote === 'function' ? window._pdxFocusEmptyNote(d, { center: true }) : '')) +
        '</div>' +
        '<div class="myteam-slot-actions">' +
          '<button class="myteam-slot-profile-btn" onclick="event.stopPropagation();showProfile(\'' + pid + '\')">📋 Profile</button>' +
          '<button class="myteam-slot-compare-btn ' + (sel ? 'chub-added' : '') + '" onclick="event.stopPropagation();chubToggle(\'' + pid + '\')">' + (sel ? '✓ Comparing' : '⚖️ Compare') + '</button>' +
          '<button class="myteam-slot-jump-btn" onclick="event.stopPropagation();window.jumpToRelevantAccordion(\'' + pos.key + '\')" title="Swap this pick — browse the other candidates running for this seat">🔄 Swap</button>' +
          // While researching, offer a one-tap copy of this pick into the
          // protected Home Team (returns '' in Home mode / when already saved).
          (typeof window._homeSlotActionBtn === 'function' ? window._homeSlotActionBtn(pos.key, pid) : '') +
        '</div>' +
      '</div>';
    }

    function _renderSlotEmpty(pos) {
      // Preview the REAL field for this seat wherever we can — the person who
      // holds it now and how many are on record — so an unfilled seat shows who
      // currently has power near the voter instead of a blank "Open Seat" card.
      // Uses the same location-aware matcher the Home Team builds from; degrades
      // gracefully to the plain prompt when the area has no record for the office.
      var field = [];
      try { if (typeof window._ballotCandidates === 'function') field = window._ballotCandidates(pos.key) || []; } catch (e) { field = []; }
      // Collect EVERY sitting officeholder for this seat, not just the first. Some
      // seats are held by more than one person at once — e.g. a state's two U.S.
      // Senators — and previewing only one made the Federal section read as empty
      // / incomplete (only one senator shown, the other buried below). We show all
      // of them so both Senate seats appear clearly.
      var holders = [];
      for (var i = 0; i < field.length; i++) {
        if (typeof window._homeIsOfficeholder === 'function' && window._homeIsOfficeholder(field[i].pid)) holders.push(field[i]);
      }
      var holder = holders[0] || null;

      // Fallback: when the live CMP_DATA office-scan finds no sitting officeholder
      // for this seat, pull the curated incumbent(s) from the authoritative Key
      // Races data so the card still shows WHO HOLDS IT NOW instead of a bare,
      // near-blank "Open Seat" placeholder. This is what keeps reference seats that
      // aren't on the 2026 ballot (e.g. U.S. Senate, held by two sitting senators)
      // — and any seat the scan happens to miss — from rendering as an empty card
      // under the "Now representing you" header. Only runs when nothing was found,
      // so seats that already resolve an officeholder are untouched.
      if (!holders.length) {
        var _fbPids = [];
        var _addFb = function(pid) {
          if (pid && typeof CMP_DATA !== 'undefined' && CMP_DATA[pid] && _fbPids.indexOf(pid) === -1) _fbPids.push(pid);
        };
        try {
          var _krLists = [];
          if (window.KEY_RACES_STATEWIDE) _krLists.push(window.KEY_RACES_STATEWIDE);
          try {
            var _krd = (typeof window.keyRacesRelevantData === 'function') ? window.keyRacesRelevantData() : null;
            var _locId = _krd && _krd.locId;
            if (_locId && window.KEY_RACES_BY_LOCATION && window.KEY_RACES_BY_LOCATION[_locId]) {
              _krLists.push(window.KEY_RACES_BY_LOCATION[_locId]);
            }
          } catch (e) {}
          _krLists.forEach(function(list) {
            (list || []).forEach(function(r) {
              if (!r || r.raceKey !== pos.key) return;
              (r.incumbentPids || []).forEach(_addFb);
              _addFb(r.incumbentPid);
            });
          });
        } catch (e) {}
        // Last resort: the seat's derived "represents me" officeholder.
        if (!_fbPids.length) {
          try { if (typeof _seatOfficeholderPid === 'function') _addFb(_seatOfficeholderPid(pos)); } catch (e) {}
        }
        _fbPids.forEach(function(pid) {
          var cd = CMP_DATA[pid];
          holders.push({ pid: pid, name: cd.name, office: cd.office, score: (typeof window._pdxDisplayScore === 'function') ? window._pdxDisplayScore(cd) : null, icon: cd.icon });
        });
        holder = holders[0] || null;
      }

      var scope = (typeof _myteamSeatScope === 'function' ? _myteamSeatScope(pos.key) : '');
      var head =
        '<div class="myteam-slot-tier" style="color:' + pos.color + ';">' + _slotTier(pos.key) + '</div>' +
        '<div class="myteam-slot-position" style="background:' + pos.color + '0f;border:1px dashed ' + pos.color + '45;color:' + pos.color + 'cc;">' + pos.icon + ' ' + pos.label + '</div>' +
        '<div class="myteam-slot-scope">' + scope + '</div>';
      var keyJs = String(pos.key).replace(/\\/g, '\\\\').replace(/'/g, "\\'");

      if (holder && holder.pid) {
        // Render a "who holds it now" row for EACH sitting officeholder (both
        // senators, etc.), each opening its own profile. The "Start with…" CTA
        // and the compare link stay tied to the top-scored holder as before.
        var _holderRow = function(h) {
          var hd = (typeof CMP_DATA !== 'undefined') ? CMP_DATA[h.pid] : null;
          var hnm = (hd && hd.name) ? hd.name : (h.name || 'Current officeholder');
          var hpidJs = String(h.pid).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
          var hphotoUrl = (typeof window._getPhotoUrl === 'function') ? (window._getPhotoUrl(h.pid) || '') : '';
          var hico = (hd && hd.icon) || pos.emptyIcon || '\u{1F3DB}';
          var hphoto = hphotoUrl
            ? '<img loading="lazy" decoding="async" src="' + _medEsc(hphotoUrl) + '" alt="' + _medEsc(hnm) + '" onerror="this.style.display=\'none\';this.parentElement.textContent=\'' + hico + '\'">'
            : '<span class="myteam-holder-ico">' + hico + '</span>';
          var hbadge = (typeof window._pdxStatusBadge === 'function' && hd) ? window._pdxStatusBadge(hd, { size: 'sm' }) : '';
          return '<div class="myteam-holder" onclick="event.stopPropagation();showProfile&&showProfile(\'' + hpidJs + '\')" title="See ' + _medEsc(hnm) + '\'s full profile">' +
              '<span class="myteam-holder-photo">' + hphoto + '</span>' +
              '<span class="myteam-holder-info">' +
                '<span class="myteam-holder-name">' + _medEsc(hnm) + '</span>' +
                hbadge +
              '</span>' +
            '</div>';
        };
        var holdersHtml = holders.map(_holderRow).join('');
        var topD = (typeof CMP_DATA !== 'undefined') ? CMP_DATA[holder.pid] : null;
        var topNm = (topD && topD.name) ? topD.name : (holder.name || 'Current officeholder');
        var pidJs = String(holder.pid).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
        var multi = holders.length > 1;
        // Only mention a "running" count when there are more people on record than
        // the sitting officeholder(s) already shown — otherwise it just restates
        // what's on screen.
        var extra = field.length - holders.length;
        var runningTxt = extra > 0 ? extra + ' more on record for this seat' : '';
        var firstNm = String(topNm).split(' ')[0];
        return '<div class="myteam-slot-empty has-holder" style="--slot-color:' + pos.color + ';" title="' + (multi ? 'Held by ' + _medEsc(holders.map(function(h){ var cd = CMP_DATA && CMP_DATA[h.pid]; return (cd && cd.name) || h.name || ''; }).filter(Boolean).join(' & ')) : 'Currently held by ' + _medEsc(topNm)) + '. Start here, then keep, swap, or add your own pick — nothing is locked in.">' +
            head +
            '<div class="myteam-holder-tag" style="color:' + pos.color + 'e0;">📍 ' + (multi ? 'Who holds these seats now' : 'Who holds it now') + '</div>' +
            holdersHtml +
            (runningTxt ? '<div class="myteam-holder-run">🗳️ ' + runningTxt + '</div>' : '') +
            '<div class="myteam-empty-cta myteam-holder-start" onclick="event.stopPropagation();window.homeStartSeat&&window.homeStartSeat(\'' + keyJs + '\',\'' + pidJs + '\', event)" title="Add the current officeholder as a starting point for this seat">' +
              '➕ Start with ' + _medEsc(firstNm) +
            '</div>' +
            '<div class="myteam-empty-find" onclick="event.stopPropagation();window.jumpToRelevantAccordion(\'' + keyJs + '\')" style="cursor:pointer;">🔍 Or compare everyone running for this seat →</div>' +
          '</div>';
      }

      // Candidates on record but no sitting officeholder we can name — still show
      // the field size and route the voter straight to it (a true open race).
      if (field.length) {
        return '<div class="myteam-slot-empty" style="--slot-color:' + pos.color + ';" role="button" tabindex="0" aria-label="Open race for ' + _medEsc(pos.label) + ' — ' + field.length + ' running. Compare candidates." onclick="window.jumpToRelevantAccordion(\'' + keyJs + '\')" onkeydown="if(event.key===\'Enter\'||event.key===\' \'){event.preventDefault();window.jumpToRelevantAccordion(\'' + keyJs + '\')}" title="' + field.length + ' on record for ' + _medEsc(pos.label) + '. ' + _medEsc(_slotBlurb(pos.key)) + '">' +
            head +
            '<div class="myteam-empty-ring" style="width:84px;height:84px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:radial-gradient(circle at 50% 35%, ' + pos.color + '18, rgba(30,53,96,0.06));border:2.5px dashed ' + pos.color + '55;font-size:1.9rem;margin:0.65rem auto 0.7rem;color:' + pos.color + 'b0;">🗳️</div>' +
            '<div class="myteam-empty-tag" style="color:' + pos.color + 'e0;">Open race · ' + field.length + ' running</div>' +
            '<div class="myteam-empty-desc">' + _slotBlurb(pos.key) + '</div>' +
            '<div class="myteam-empty-cta">' +
              '<svg style="width:0.85rem;height:0.85rem;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5l7 7-7 7"/></svg>' +
              'Compare the ' + field.length + ' running →' +
            '</div>' +
          '</div>';
      }

      // No record for this office yet — keep the original honest prompt.
      return '<div class="myteam-slot-empty" style="--slot-color:' + pos.color + ';" role="button" tabindex="0" aria-label="Fill your ' + _medEsc(pos.label) + ' seat — find candidates in Relevant to Me." onclick="window.jumpToRelevantAccordion(\'' + keyJs + '\')" onkeydown="if(event.key===\'Enter\'||event.key===\' \'){event.preventDefault();window.jumpToRelevantAccordion(\'' + keyJs + '\')}" title="Find your match for ' + _medEsc(pos.label) + ' — the candidate who best represents your values. ' + _medEsc(_slotBlurb(pos.key)) + '">' +
        head +
        '<div class="myteam-empty-ring" style="width:84px;height:84px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:radial-gradient(circle at 50% 35%, ' + pos.color + '18, rgba(30,53,96,0.06));border:2.5px dashed ' + pos.color + '55;font-size:1.9rem;margin:0.65rem auto 0.7rem;color:' + pos.color + 'b0;transition:all 0.3s;">' + pos.emptyIcon + '</div>' +
        '<div class="myteam-empty-tag" style="color:' + pos.color + 'e0;">Open Seat</div>' +
        '<div class="myteam-empty-desc">' + _slotBlurb(pos.key) + '</div>' +
        '<div class="myteam-empty-find">👇 Find candidates for this seat in <strong>Relevant to Me</strong> below</div>' +
        '<div class="myteam-empty-cta">' +
          '<svg style="width:0.85rem;height:0.85rem;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4"/></svg>' +
          'Fill this seat' +
        '</div>' +
      '</div>';
    }

    // ── Seat model + unified seat card (Option B, Phase 1) ───────────────────
    // The seat — one ballot office — is the unit My Voting Team is being
    // reorganized around. A seat card shows, in one place: who currently holds
    // the office ("Now representing you"), the voter's committed pick, and anyone
    // else they're tracking who's running for that same seat. This first pass
    // WRAPS the existing pick / empty cards (which remain the source of every
    // per-pick visual and behavior) with that seat context, so nothing about the
    // committed-pick card regresses — the section simply reads as a set of seats.
    //
    // All context comes from the unified PDXTeamView adapter where possible: the
    // current officeholder via representsMe(), the tracked roster via roster().
    // Every piece degrades to '' when its source is missing, and the whole path
    // is gated behind window.PDX_SEAT_CARDS (default on) with a try/catch fallback
    // to the plain card in the grid builder — full fallback behavior preserved.

    // Current officeholder pid for a seat. Prefers the PDXTeamView adapter's
    // derived "represents me" and falls back to the same sitting-officeholder scan
    // the empty card uses, so the two surfaces can never disagree. null when unknown.
    function _seatOfficeholderPid(pos) {
      if (!pos) return null;
      try {
        if (window.PDXTeamView && typeof window.PDXTeamView.representsMe === 'function') {
          var rep = window.PDXTeamView.representsMe(window._currentVoterLocation || null) || [];
          for (var i = 0; i < rep.length; i++) {
            if (rep[i] && rep[i].seat === pos.key && rep[i].pid) return String(rep[i].pid);
          }
        }
      } catch (e) {}
      // Fallback: scan the seat's candidate field for a sitting officeholder.
      try {
        var field = (typeof window._ballotCandidates === 'function') ? (window._ballotCandidates(pos.key) || []) : [];
        for (var j = 0; j < field.length; j++) {
          if (field[j] && field[j].pid && typeof window._homeIsOfficeholder === 'function' && window._homeIsOfficeholder(field[j].pid)) {
            return String(field[j].pid);
          }
        }
      } catch (e2) {}
      return null;
    }

    // Roster pids the voter is tracking who are ALSO running for this seat — the
    // "others tracked for this seat" the seat card surfaces. Read from
    // PDXTeamView.roster() intersected with the seat's candidate field, minus the
    // committed pick and the current officeholder (each already shown on the card).
    function _seatOtherTracked(pos, pickPid, holderPid) {
      var out = [];
      if (!pos) return out;
      try {
        var roster = (window.PDXTeamView && typeof window.PDXTeamView.roster === 'function') ? (window.PDXTeamView.roster() || []) : [];
        if (!roster.length) return out;
        var fieldSet = {};
        try {
          var field = (typeof window._ballotCandidates === 'function') ? (window._ballotCandidates(pos.key) || []) : [];
          field.forEach(function (c) { if (c && c.pid) fieldSet[String(c.pid)] = 1; });
        } catch (e) {}
        var seen = {};
        roster.forEach(function (pid) {
          pid = String(pid);
          if (seen[pid]) return;
          if (pid === String(pickPid || '') || pid === String(holderPid || '')) return;
          if (!fieldSet[pid]) return;
          if (typeof CMP_DATA === 'undefined' || !CMP_DATA[pid]) return;
          seen[pid] = 1;
          out.push(pid);
        });
      } catch (e) {}
      return out;
    }

    // Compact "Now representing you" holder eyebrow for a FILLED seat, so a voter
    // who has committed a pick can still see who currently holds the office. (The
    // empty card already shows the holder prominently, so it's only added on top of
    // filled seats.) '' when no officeholder is known or the holder IS the pick.
    function _seatHolderStrip(pos, pickPid, holderPid) {
      if (!holderPid || String(holderPid) === String(pickPid || '')) return '';
      var d = (typeof CMP_DATA !== 'undefined') ? CMP_DATA[holderPid] : null;
      if (!d) return '';
      var nm = d.name || 'Current officeholder';
      var pidJs = String(holderPid).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
      var ico = d.icon || '\u{1F3DB}';
      var photoUrl = (typeof window._getPhotoUrl === 'function') ? (window._getPhotoUrl(holderPid) || '') : '';
      var photo = photoUrl
        ? '<img loading="lazy" decoding="async" src="' + _medEsc(photoUrl) + '" alt="' + _medEsc(nm) + '" onerror="this.style.display=\'none\';this.parentElement.textContent=\'' + _medEsc(ico) + '\'">'
        : _medEsc(ico);
      return '<div class="pdxseat-holder" role="button" tabindex="0" aria-label="' + _medEsc(nm) + ' currently represents you — open profile" onclick="event.stopPropagation();showProfile&&showProfile(\'' + pidJs + '\')" onkeydown="if(event.key===\'Enter\'||event.key===\' \'){event.preventDefault();event.stopPropagation();showProfile&&showProfile(\'' + pidJs + '\')}" title="' + _medEsc(nm) + ' currently holds this seat — tap for their profile">' +
          '<span class="pdxseat-holder-photo">' + photo + '</span>' +
          '<span class="pdxseat-holder-txt">' +
            '<span class="pdxseat-holder-lbl">📍 Now representing you</span>' +
            '<span class="pdxseat-holder-name">' + _medEsc(nm) + '</span>' +
          '</span>' +
          '<span class="pdxseat-holder-go" aria-hidden="true">View ›</span>' +
        '</div>';
    }

    // "Also tracking for this seat" chip strip — the other people the voter is
    // following who are in the running for this office. Each chip opens the medium
    // modal. '' when there are none.
    function _seatOthersStrip(others) {
      if (!others || !others.length) return '';
      var chips = others.slice(0, 4).map(function (pid) {
        var d = CMP_DATA[pid];
        var nm = (d && d.name) ? d.name : 'Tracked';
        var ico = (d && d.icon) || '\u{1F464}';
        var pty = d && d.party;
        var pcol = pty === 'R' ? '#f87171' : pty === 'D' ? '#60a5fa' : (pty === 'F' || pty === 'Forward') ? '#22d3ee' : pty === 'I' ? '#a78bfa' : '';
        var pidJs = String(pid).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
        var photoUrl = (typeof window._getPhotoUrl === 'function') ? (window._getPhotoUrl(pid) || '') : '';
        var photo = photoUrl
          ? '<img loading="lazy" decoding="async" src="' + _medEsc(photoUrl) + '" alt="' + _medEsc(nm) + '" onerror="this.style.display=\'none\';this.parentElement.textContent=\'' + _medEsc(ico) + '\'">'
          : _medEsc(ico);
        var chipStyle = pcol ? ' style="border-left:3px solid ' + pcol + '99;"' : '';
        return '<button type="button" class="pdxseat-chip"' + chipStyle + ' onclick="event.stopPropagation();openMediumModal&&openMediumModal(\'' + pidJs + '\')" title="You\'re tracking ' + _medEsc(nm) + ' for this seat — tap to review">' +
            '<span class="pdxseat-chip-photo">' + photo + '</span>' +
            '<span class="pdxseat-chip-name">' + _medEsc(nm) + '</span>' +
          '</button>';
      }).join('');
      var more = others.length > 4 ? '<span class="pdxseat-chip-more">+' + (others.length - 4) + ' more</span>' : '';
      return '<div class="pdxseat-others">' +
          '<span class="pdxseat-others-lbl">👀 Also tracking for this seat</span>' +
          '<div class="pdxseat-chip-row">' + chips + more + '</div>' +
        '</div>';
    }

    // Unified seat card: seat context (holder eyebrow + others strip) wrapped
    // around the existing pick / empty card. Returns '' to signal "fall back to
    // the plain card" so the grid builder's try/catch can degrade cleanly.
    function _renderSeatCard(pos, pid) {
      if (!pos) return '';
      var holderPid = _seatOfficeholderPid(pos);
      var body = pid ? _renderSlotCard(pos, pid) : _renderSlotEmpty(pos);
      if (!body) return '';
      // Holder eyebrow ("Now representing you: <name>"). On a FILLED seat it sits
      // above the pick. On an OPEN seat (no pick yet) show it too, so a located
      // voter sees who currently represents them above the "Fill this seat"
      // prompt instead of a bare open-seat card — the one real "Your Districts"
      // display gap. Skip it when the empty body already surfaces its own holder
      // (the has-holder variant) so the strip never doubles up.
      var holderStrip = '';
      try {
        if (pid || body.indexOf('has-holder') === -1) {
          holderStrip = _seatHolderStrip(pos, pid, holderPid);
        }
      } catch (e) { holderStrip = ''; }
      var othersStrip = _seatOthersStrip(_seatOtherTracked(pos, pid, holderPid));
      var stateCls = pid ? 'is-filled' : 'is-open';
      // Explicit "your pick" band on a filled seat. With the incumbent shown above
      // ("Now representing you") and anyone else tracked below ("Also tracking"),
      // this middle label makes the three-band hierarchy unmistakable: who holds
      // the seat now → the one candidate you've committed to → others you're
      // weighing. Shown only when a pick exists so open seats stay uncluttered.
      var pickLabel = pid ? '<div class="pdxseat-picklabel">★ Your pick for this seat</div>' : '';
      return '<div class="pdxseat ' + stateCls + '" data-seat="' + _medEsc(pos.key) + '" style="--seat-color:' + (pos.color || '#f59e0b') + ';">' +
          holderStrip + pickLabel + body + othersStrip +
        '</div>';
    }
    window._renderSeatCard = _renderSeatCard;

    // ══════════════════════════════════════════════════════════════════════
    // MEDIUM MODAL — middle information layer (small card → MEDIUM → full
    // profile). Renders a focused, summarized read of one politician: office
    // + district, pledge receipts, Your Match % breakdown, key documented
    // positions, a record-highlights strip and a short bio. Detail is kept
    // deliberately light; the full deep-dive is one tap away. Lives in this
    // scope so it can reuse the card/team helpers directly.
    // ══════════════════════════════════════════════════════════════════════
    // _medScoreColor was removed with the pledge percentage — see the tombstone
    // above _chubScoreColor.
    function _medEsc(s) {
      return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }
    // Office + district line, preferring this politician's own ballot-seat scope
    // ("District 2", "Your community", "Statewide") so the modal stays tied to
    // the voter's actual districts.
    function _medOfficeLine(id, d) {
      var base = (typeof _pdxCleanOfficeLine === 'function') ? _pdxCleanOfficeLine(d, null) : (d.office || '');
      return base || (d.office || '');
    }
    // Accountability of Truth Score for the dual-score header — the INTEGRITY
    // read (consistency between words and actions, public conduct), distinct
    // from the formal in-office Promise %. Returns the analysis object only when
    // there is enough verified record to show an honest number; null otherwise,
    // so the card can fall back to a "builds as record grows" state.
    function _medAcctScore(id, p) {
      var a = (p && p.accountability) || null;
      if (!(a && typeof a.overallScore === 'number') && typeof window._acctEnsureScore === 'function') {
        try { a = window._acctEnsureScore(id, p) || a; } catch (e) {}
      }
      var explainable = (typeof window._pdxScoreExplainable === 'function') ? window._pdxScoreExplainable(p, id) : true;
      return (a && typeof a.overallScore === 'number' && explainable) ? a : null;
    }

    // "Why this might fit you" — a short, plain-language read of the strongest
    // agreements (and the sharpest disagreement) between this official's record
    // and the visitor's own selected issues. Returned only when the visitor has
    // built an alignment signature AND there's enough evidence to ground it;
    // otherwise '' so the Match bar's own "set up your match" prompt covers the
    // empty state. Keeps the medium modal's personal-fit story to one scannable
    // sentence instead of a long list.
    window._medWhyFit = function(id) {
      if (typeof _alignIssues === 'undefined' || !_alignIssues || !_alignIssues.size) return '';
      if (typeof _calcAlignmentBreakdown !== 'function') return '';
      var bd = _calcAlignmentBreakdown(id);
      if (!bd || !bd.issues || !bd.issues.length) return '';
      var agree = bd.issues.filter(function(i){ return i.hasEvidence && i.score >= 65; })
                           .sort(function(a, b){ return b.score - a.score; });
      var clash = bd.issues.filter(function(i){ return i.hasEvidence && i.score <= 35; })
                           .sort(function(a, b){ return a.score - b.score; });
      if (!agree.length && !clash.length) return '';
      var labels = agree.slice(0, 3).map(function(i){ return _medEsc(i.label); });
      var lead;
      if (labels.length) {
        var joined = labels.length === 1 ? '<b>' + labels[0] + '</b>'
          : labels.length === 2 ? '<b>' + labels[0] + '</b> and <b>' + labels[1] + '</b>'
          : '<b>' + labels[0] + '</b>, <b>' + labels[1] + '</b> and <b>' + labels[2] + '</b>';
        var strength = bd.overall >= 85 ? 'Lines up closely with you'
          : bd.overall >= 70 ? 'A strong fit on what you care about'
          : 'Some common ground with you';
        lead = strength + ' — you agree on ' + joined + '.';
      } else {
        lead = 'Little common ground on the issues you picked.';
      }
      var clashTxt = clash.length ? ' Differs on <b>' + _medEsc(clash[0].label) + '</b>.' : '';
      return '<div class="pdx-med-whyfit"><span class="pdx-med-whyfit-ico">💡</span>' +
        '<span class="pdx-med-whyfit-txt"><span class="pdx-med-whyfit-lead">Why this might fit you</span>' +
        lead + clashTxt + '</span></div>';
    };

    // Compact election / status strip for the quick-view modal — the summarized
    // echo of the full profile's election banner and tenure line. It surfaces the
    // same structured facts (the next election's timing, and a retiring /
    // "not seeking re-election" note when the record says so) so the modal tells
    // the same status story as the full profile, just tighter. Returns '' when
    // there is nothing meaningful to show, so a settled officeholder stays clean.
    window._pdxMedStatusStrip = function(rec) {
      if (!rec) return '';
      var chips = [];
      // Retiring / not-seeking-re-election is carried in the full profile's bio
      // prose; mirror it here as a compact pill so the quick-view never quietly
      // drops a status the full profile makes prominent.
      var hay = String(rec.bio || '').toLowerCase();
      if (/not seek(ing)? re-?election|not running for re-?election|will not run again|will not seek another|stepping down|will retire|announced (his|her|their)? ?retirement/.test(hay)) {
        chips.push('<span class="pdx-med-status-chip" style="background:rgba(245,158,11,0.14);border:1px solid rgba(245,158,11,0.45);color:#fbbf24;">🏁 Not seeking re-election</span>');
      }
      // Next election timing — uses the SAME urgency colors as the full profile's
      // election banner (red ≤90 days, gold ≤1 year, green beyond).
      if (rec.nextElection) {
        var el = new Date(String(rec.nextElection) + 'T00:00:00');
        if (!isNaN(el.getTime())) {
          var diffDays = Math.ceil((el - new Date()) / 86400000);
          if (diffDays >= 0) {
            var c = diffDays <= 90 ? '#f87171' : diffDays <= 365 ? '#f5c842' : '#4ade80';
            var dot = diffDays <= 90 ? '🔴' : diffDays <= 365 ? '🟡' : '🟢';
            var when = diffDays === 0 ? 'today' : diffDays === 1 ? 'tomorrow'
              : diffDays < 365 ? ('in ' + diffDays + ' days')
              : ('in ' + (diffDays / 365.25).toFixed(diffDays < 695 ? 1 : 0) + ' yrs');
            var dstr = el.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
            var label = _medEsc(rec.electionLabel || 'Next election');
            chips.push('<span class="pdx-med-status-chip" style="background:' + c + '14;border:1px solid ' + c + '55;color:' + c + ';">' + dot + ' ' + label + ' · ' + dstr + ' (' + when + ')</span>');
          }
        }
      }
      if (!chips.length) return '';
      return '<div class="pdx-med-status-strip">' + chips.join('') + '</div>';
    };

    window.openMediumModal = function(id, ev) {
      if (ev && ev.stopPropagation) ev.stopPropagation();
      if (!id) return;
      // The Compare My Team overlay sits above this quick-view modal — close it
      // first so the card the voter tapped isn't hidden behind it.
      if (typeof window.homeCompareClose === 'function') { try { window.homeCompareClose(); } catch (e) {} }
      var d = (typeof CMP_DATA !== 'undefined') ? CMP_DATA[id] : null;
      // No compact record for this id — fall back to the full profile so the tap
      // is never a dead end.
      if (!d) { if (typeof window.openFullProfile === 'function') window.openFullProfile(id); return; }
      var p = (window.PROFILES && window.PROFILES[id]) || {};
      window._pdxMediumId = id;

      // Render the quick-view's key stats and identity from the SAME record the
      // full profile uses, so Promise %, status (in office / candidate / former),
      // party, office/district and photo read identically across both views. The
      // live, Firestore-merged profile (PROFILES) wins; the bundled static record
      // fills anything it lacks. On a cold open `p` is still an empty stub, so we
      // fall back to `d` until the lazy-load below swaps in the full document.
      var rec = (p && Object.keys(p).length) ? Object.assign({}, d, p) : d;

      // The header used to lead with a Promise Follow-Through percentage, then
      // with the pledge receipts. It now leads with ⚖️ Word vs Action, because
      // that is the one read this modal is a preview of — and receipts in the
      // headline slot competed with it just as the rate did.
      var slot = window._pdxLedgerSlot(rec, { pid: id, status: (typeof window._pdxOfficeStatus === 'function') ? window._pdxOfficeStatus(rec) : 'office' });

      // ── Header (photo · name · office+district · badges) ──
      var photoUrl = (typeof window._getPhotoUrl === 'function') ? window._getPhotoUrl(id) : ((typeof BROWSE_PHOTOS !== 'undefined' && BROWSE_PHOTOS[id]) || '');
      var ico = rec.icon || d.icon || '\u{1F3DB}\u{FE0F}';
      var photoHtml = photoUrl
        ? '<div class="pdx-med-photo"><img loading="lazy" decoding="async" src="' + photoUrl + '" alt="' + _medEsc(rec.name || d.name) + '" onerror="this.style.display=\'none\';this.parentElement.classList.add(\'pdx-med-photo--ico\');this.parentElement.textContent=\'' + ico + '\'"></div>'
        : '<div class="pdx-med-photo pdx-med-photo--ico">' + ico + '</div>';
      var pw = document.getElementById('pdx-med-photo-wrap'); if (pw) pw.innerHTML = photoHtml;
      var nameEl = document.getElementById('pdx-med-name'); if (nameEl) nameEl.textContent = rec.name || d.name || '';
      var offEl = document.getElementById('pdx-med-office'); if (offEl) offEl.textContent = _medOfficeLine(id, rec);
      var badges = '';
      if (typeof window._pdxStatusBadge === 'function') badges += window._pdxStatusBadge(rec, { size: 'sm' });
      if (typeof window._pdxDepthBadge === 'function') badges += window._pdxDepthBadge(rec, { size: 'sm' });
      if (typeof window._pdxPartyChip === 'function' && rec.party) badges += window._pdxPartyChip(rec.party);
      var badgesEl = document.getElementById('pdx-med-badges'); if (badgesEl) badgesEl.innerHTML = badges;

      // ── Lazy-load the FULL profile before rendering the body ─────────────
      // The header above renders entirely from the lightweight index (name,
      // photo, office, badges) so it shows instantly. The body sections below
      // (Promise Track Record, Accountability Spotlight, bio, stances) need the
      // full document. If we only have a lite stub for this id, show the header +
      // a body skeleton immediately, fetch the full doc, then re-render. Re-
      // calling openMediumModal once the data is cached skips this branch and
      // renders the complete modal.
      if (window._pdxFullIds && typeof window._pdxEnsureFullProfile === 'function' && !window._pdxFullIds.has(id)) {
        var skelEl = document.getElementById('pdx-medium-content');
        if (skelEl) {
          skelEl.scrollTop = 0;
          skelEl.innerHTML = '<div class="pdx-med-skel">' +
            '<span class="pdx-skel skeleton" style="height:3.4rem;border-radius:0.8rem;"></span>' +
            '<span class="pdx-skel skeleton" style="height:1rem;width:55%;"></span>' +
            '<span class="pdx-skel skeleton" style="height:6rem;border-radius:0.8rem;"></span>' +
            '<span class="pdx-skel skeleton" style="height:6rem;border-radius:0.8rem;"></span>' +
            '<span class="pdx-skel skeleton" style="height:1rem;width:80%;"></span>' +
          '</div>';
        }
        var ovEarly = document.getElementById('pdx-medium-overlay');
        if (ovEarly) ovEarly.style.setProperty('display', 'flex', 'important');
        document.body.style.overflow = 'hidden';
        window._medSyncTeamBtn(id);
        window._medSyncCmpBtn(id);
        window._pdxEnsureFullProfile(id).then(function () {
          // Only re-render if this is still the modal the visitor is looking at.
          if (window._pdxMediumId === id) window.openMediumModal(id);
        });
        return;
      }

      // ── Body sections ──
      var html = '';

      // ── Quick-jump nav (Scores · Evidence · Actions) ─────────────────────
      // A minimal, sticky pill rail directly under the name/district header so a
      // voter can jump straight to the two scored dimensions, the evidence, or
      // the action footer without hunting. The Evidence pill only renders when
      // there's an evidence banner to reach, so it never points at nothing.
      var _medEvidenceHtml = (typeof window._pdxEvidenceBanner === 'function') ? window._pdxEvidenceBanner(id) : '';
      html += '<nav class="pdx-med-qnav" aria-label="Jump to a section of this profile">' +
          '<button type="button" class="pdx-med-qnav-pill is-active" data-medjump="scores" onclick="window._pdxMedJump(\'scores\', this)"><span class="pdx-med-qnav-ico" aria-hidden="true">📊</span>Scores</button>' +
          (_medEvidenceHtml ? '<button type="button" class="pdx-med-qnav-pill" data-medjump="evidence" onclick="window._pdxMedJump(\'evidence\', this)"><span class="pdx-med-qnav-ico" aria-hidden="true">🔗</span>Evidence</button>' : '') +
          '<button type="button" class="pdx-med-qnav-pill" data-medjump="actions" onclick="window._pdxMedJump(\'actions\', this)"><span class="pdx-med-qnav-ico" aria-hidden="true">⚡</span>Actions</button>' +
        '</nav>';

      // Candidacy status banner — leads the quick-view with the same clear
      // "still running / out of the race" read the full profile shows up top,
      // driven only by the structured candidacyStatus flag.
      if (typeof window._pdxStatusBanner === 'function') html += window._pdxStatusBanner(rec, { emphasis: 'high', showActive: true });

      // Compact election / status strip — the summarized echo of the full
      // profile's election banner + retiring note, kept at the very top so the
      // quick-view leads with the same status context as the full profile.
      if (typeof window._pdxMedStatusStrip === 'function') html += window._pdxMedStatusStrip(rec);

      // ── Dual score header — two deliberately distinct metrics ────────────
      // Promise %      = the FORMAL, in-office record — what they did with their
      //                  power (votes, bills, official promises). Framed gold.
      // Accountability = the INTEGRITY read — consistency between words and
      //                  actions and conduct beyond formal power (statements,
      //                  rhetoric vs. reality). Framed purple. The contrasting
      //                  color + label + one-line descriptor make it instantly
      //                  clear the two scores measure different things.
      var acctA = _medAcctScore(id, p);
      var acctHasScore = !!(acctA && typeof acctA.overallScore === 'number');
      var acctS = acctHasScore ? acctA.overallScore : null;
      var acctRatingTxt = acctHasScore && acctA.rating ? String(acctA.rating) : '';
      var acctCol = acctHasScore ? (acctA.color || '#c4b5fd') : '#9fb4d4';
      var safeId = _medEsc(id);
      html += '<div class="pdx-med-scores" id="pdxmed-scores">' +
          '<button type="button" class="pdx-med-sc pdx-med-sc--promise" onclick="window._mediumViewFull()" ' +
            'title="Pledge receipts — the kept and broken promises on file. No rate is published for this lane. Tap for the full record.">' +
            '<span class="pdx-med-sc-tag">🤝 Pledge receipts</span>' +
            '<span class="pdx-med-sc-num pdx-med-sc-num--glyph" style="color:' + (slot.tint || '#c8d7ee') + ';">' + slot.glyph + '</span>' +
            '<span class="pdx-med-sc-lab">' + slot.label + '</span>' +
            '<span class="pdx-med-sc-desc">' + slot.sub + '</span>' +
          '</button>' +
        '</div>' +
        '<p class="pdx-med-scores-note">PolitiDex publishes one integrity read — <strong class="pdx-med-note-prom">⚖️ Word vs Action</strong>. Kept and broken pledges are receipts that feed it, not a score of their own.</p>';

      // Evidence banner — the gold All-Seeing Eye + a direct "Watch" jump to the
      // strongest clip + a one-tap "See Evidence" into the pre-filtered Evidence
      // Locker, placed right under the headline scores so the receipts are the
      // first thing offered. Renders only when there's a watchable clip or a
      // lockable on-record file, so it never shows empty.
      if (_medEvidenceHtml) html += '<div id="pdxmed-evidence" class="pdx-med-ev-anchor">' + _medEvidenceHtml + '</div>';

      // ── Section order mirrors the dual-score header so each headline number
      // sits right above the evidence that earns it: Promise Track Record (the
      // formal in-office ledger → Promise %) first, then the Accountability
      // Spotlight (integrity drivers → Accountability). The personal-fit context
      // (Your Match, Where They Stand) and Bio follow as a lighter supporting
      // tier. This keeps the two scored dimensions paired and unmistakable, and
      // the most important read scannable from the top. ──

      // Promise Track Record — the FORMAL ledger that feeds Promise %: kept /
      // broken / pending counts plus the one or two most telling tracked
      // promises. Summarized highlights only; the full list is one tap away.
      var proms = (p.promises && p.promises.length) ? p.promises : (Array.isArray(d.promises) ? d.promises : []);
      if (proms.length) {
        var kept = proms.filter(function(r) { return r.verdict === 'kept'; });
        var broken = proms.filter(function(r) { return r.verdict === 'broken'; });
        var pending = proms.filter(function(r) { return (r.verdict || 'pending') === 'pending'; });
        var counts = '<div class="pdx-med-record-counts">' +
            '<span class="pdx-med-rc is-kept">✓ ' + kept.length + ' Kept</span>' +
            '<span class="pdx-med-rc is-broken">✕ ' + broken.length + ' Broken</span>' +
            '<span class="pdx-med-rc is-pending">⏳ ' + pending.length + ' Pending</span>' +
          '</div>';
        // Lead with the strongest contrast available — one kept and one broken —
        // so the record reads honestly at a glance (max two items).
        var leads = [];
        if (kept[0]) leads.push(kept[0]);
        if (broken[0]) leads.push(broken[0]);
        if (!leads.length && proms[0]) leads.push(proms[0]);
        var leadHtml = leads.slice(0, 2).map(function(lead) {
          if (!lead || !lead.title) return '';
          var lv = lead.verdict || 'pending';
          var lc = lv === 'kept' ? '#4ade80' : lv === 'broken' ? '#f87171' : '#f5c842';
          var lvLab = lv === 'kept' ? '✓ Kept' : lv === 'broken' ? '✕ Broken' : '⏳ Pending';
          var _medLeadVid = (typeof window._pdxPromiseVideo === 'function') ? window._pdxPromiseVideo(id, p, lead) : null;
          var _medLeadEye = (_medLeadVid && typeof window._pdxVideoEye === 'function')
            ? window._pdxVideoEye(_medLeadVid, { cls: 'sag-eye' }) : '';
          return '<div class="pdx-med-record-lead" style="border-left-color:' + lc + '88;">' +
              '<div class="pdx-med-record-lead-v" style="color:' + lc + ';">' + lvLab + _medLeadEye + '</div>' +
              '<div class="pdx-med-record-lead-t">' + _medEsc(lead.title) + '</div>' +
              (lead.detail ? '<div class="pdx-med-record-lead-d">' + _medEsc(String(lead.detail).slice(0, 130)) + (String(lead.detail).length > 130 ? '…' : '') + '</div>' : '') +
            '</div>';
        }).join('');
        html += '<div class="pdx-med-section pdx-med-section--promise">' +
            '<div class="pdx-med-sec-title pdx-med-sec-title--promise">📋 Promise Track Record</div>' +
            '<div class="pdx-med-sec-sub">What they did with their power, in office</div>' +
            counts + leadHtml +
          '</div>';
      }

      // Accountability Spotlight — the INTEGRITY read that feeds the
      // Accountability Score. Absorbs the old standalone "In the Spotlight"
      // section: the top flagged drivers (public statements, conduct, rhetoric
      // vs. record), each marked as strengthening or weighing on the score.
      // Summarized to the top three; the full analysis is one tap away.
      var slDrivers = (typeof window._slComputeDrivers === 'function') ? window._slComputeDrivers(p, id) : [];
      var slThemeMed = (typeof window._slThemeBanner === 'function') ? window._slThemeBanner(p, id) : '';
      if (slDrivers.length) {
        var slRows = slDrivers.slice(0, 3).map(function(it) {
          var pos = it.impact === 'positive';
          var c = pos ? '#4ade80' : '#f87171';
          var sym = pos ? '▲' : '▼';
          var lab = pos ? 'Strengthens' : 'Weighs on';
          var catLab = (it.category && typeof window._slCatLabel === 'function') ? window._slCatLabel(it.category) : '';
          var metaChips = '';
          if (catLab) metaChips += '<span class="pdx-med-spot-cat">' + _medEsc(catLab) + '</span>';
          if (Array.isArray(it.tags)) it.tags.slice(0, 2).forEach(function(t){ metaChips += '<span class="pdx-med-spot-tag">' + _medEsc(t) + '</span>'; });
          return '<div class="pdx-med-spot" style="border-left-color:' + c + ';">' +
              '<div class="pdx-med-spot-h">' +
                '<span class="pdx-med-spot-impact" style="color:' + c + ';background:' + c + '1a;border-color:' + c + '55;">' + sym + ' ' + lab + '</span>' +
                (it.date ? '<span class="pdx-med-spot-date">' + _medEsc(it.date) + '</span>' : '') +
              '</div>' +
              '<div class="pdx-med-spot-t">' + _medEsc(it.headline) + '</div>' +
              (metaChips ? '<div class="pdx-med-spot-meta">' + metaChips + '</div>' : '') +
              (it.source && it.source.url ? '<a class="pdx-med-spot-src" href="' + _medEsc(it.source.url) + '" target="_blank" rel="noopener" onclick="event.stopPropagation();">🔗 ' + _medEsc(it.source.label || 'Source') + ' ↗</a>' : '') +
            '</div>';
        }).join('');
        var slPatternMed = (typeof window._slPatternBar === 'function') ? window._slPatternBar(slDrivers, 'med') : '';
        html += '<div class="pdx-med-section pdx-med-section--acct">' +
            '<div class="pdx-med-sec-title pdx-med-sec-title--acct">🛡️ Accountability Spotlight</div>' +
            '<div class="pdx-med-sec-sub">Personal integrity &amp; consistency — words vs. actions and public conduct, beyond the formal record</div>' +
            slThemeMed +
            slPatternMed +
            slRows +
            // SCORING CLEANUP: the "View full accountability analysis →" button used
            // to open #accountability-overlay, which prints an Accountability Score
            // of N/100 — a second composite competing with Direction Match. The badge
            // and the profile ring were retired earlier; this was the last reader-facing
            // door into the overlay from the medium card. The sourced Spotlight rows
            // above stay: they are evidence, not a score.
          '</div>';
      } else if (slThemeMed) {
        // Theme authored but no individual drivers tagged yet — show the overall
        // read honestly instead of dropping the section, so the integrity layer
        // never looks broken or empty.
        html += '<div class="pdx-med-section pdx-med-section--acct">' +
            '<div class="pdx-med-sec-title pdx-med-sec-title--acct">🛡️ Accountability Spotlight</div>' +
            '<div class="pdx-med-sec-sub">Personal integrity &amp; consistency — words vs. actions and public conduct, beyond the formal record</div>' +
            slThemeMed +
            '<p class="pdx-med-spot-thin">Individual integrity highlights are still being gathered for this official.</p>' +
            // SCORING CLEANUP: second door into #accountability-overlay, removed with
            // the one above. The trailing "the overall read above reflects their record
            // so far" went with it — it referred to the retired composite.
          '</div>';
      }

      // ── Supporting context (lighter tier) ────────────────────────────────
      // Personal fit and documented positions sit below the two scored
      // dimensions as plain-divider sections, so the colored Promise /
      // Accountability panels stay the visual anchors of the modal.

      // Your Match % breakdown — reuses the shared match bar (tappable → full
      // issue-by-issue breakdown), or a "set up your match" prompt when the
      // visitor hasn't picked their issues yet.
      var matchBar = (typeof window._alignCardBar === 'function') ? window._alignCardBar(id) : '';
      if (matchBar) {
        var whyFit = (typeof window._medWhyFit === 'function') ? window._medWhyFit(id) : '';
        html += '<div class="pdx-med-section pdx-med-match">' +
            '<div class="pdx-med-sec-title">🎯 Your Match</div>' + matchBar + whyFit +
          '</div>';
      }

      // Your Stance vs Their Record — for the issues where the visitor has taken a
      // position AND this official has a documented one, line the two up with an
      // Agree / Partial / Differ read. Rendered by My Stances (neutral, notes-free)
      // and empty until the visitor has saved overlapping positions.
      var vsRecord = (window.PDXStances && typeof window.PDXStances.vsRecordHtml === 'function') ? window.PDXStances.vsRecordHtml(id, { max: 6 }) : '';
      if (vsRecord) {
        html += '<div class="pdx-med-section pdx-med-vsrecord">' + vsRecord + '</div>';
      }

      // Key issue positions — the documented stances (marked against the
      // visitor's own issues when set). Falls back to key-issue / topic pills.
      var stances = (typeof window._pdxStanceChips === 'function') ? window._pdxStanceChips(id, d, { max: 4, label: true, evidence: { id: id, p: p } }) : '';
      var issuesHtml = stances;
      if (!issuesHtml) {
        var ki = (p.keyIssues && p.keyIssues.length) ? p.keyIssues : (d.issues || []);
        if (ki && ki.length) {
          issuesHtml = '<div class="pdx-med-pills">' + ki.slice(0, 5).map(function(i) {
            return '<span class="pdx-med-pill">' + _medEsc(i) + '</span>';
          }).join('') + '</div>';
        }
      }
      if (issuesHtml) {
        html += '<div class="pdx-med-section">' +
            '<div class="pdx-med-sec-title">🧭 Where They Stand</div>' + issuesHtml +
          '</div>';
      }

      // People's Mandate connections — the compact, secondary cue showing which
      // reforms this official has a documented position or on-record evidence for,
      // each a tap into The People's Mandate. Mirrors the Stance-at-a-Glance cue
      // and respects the broader Evidence Locker roster, so federal officials and
      // 2026 candidates surface their reform ties here too. Renders only when
      // there's a connection, so it never shows an empty section.
      var medMandateCue = (typeof window._pdxMandateProfileCue === 'function')
        ? window._pdxMandateProfileCue(id, rec, { section: true, scope: 'med' }) : '';
      if (medMandateCue) {
        html += '<div class="pdx-med-section" data-pdx-mandate-section="1">' +
            '<div class="pdx-med-sec-title">📜 People’s Mandate</div>' + medMandateCue +
          '</div>';
      }

      // Short bio summary — trimmed to a couple of lines.
      var bio = (p.bio && String(p.bio).trim()) || (d.bio && String(d.bio).trim()) || '';
      if (bio) {
        var bioShort = bio.length > 180 ? bio.slice(0, 177).replace(/\s+\S*$/, '') + '…' : bio;
        html += '<div class="pdx-med-section">' +
            '<div class="pdx-med-sec-title">👤 Bio</div>' +
            '<p class="pdx-med-bio">' + _medEsc(bioShort) + '</p>' +
          '</div>';
      }

      var contentEl = document.getElementById('pdx-medium-content');
      if (contentEl) { contentEl.innerHTML = html; contentEl.scrollTop = 0; }
      if (typeof window._pdxMedSpyInit === 'function') window._pdxMedSpyInit();

      // Sync the action buttons to current state.
      window._medSyncTeamBtn(id);
      window._medSyncCmpBtn(id);

      var ov = document.getElementById('pdx-medium-overlay');
      if (ov) ov.style.setProperty('display', 'flex', 'important');
      document.body.style.overflow = 'hidden';
    };

    window._medSyncTeamBtn = function(id) {
      var btn = document.getElementById('pdx-med-team-btn');
      if (!btn) return;
      var on = (typeof _myPoliticians !== 'undefined') && _myPoliticians.has(id);
      btn.classList.toggle('on-team', on);
      btn.innerHTML = on ? '✓ On Your Team' : '⭐ Add to My Team';
    };
    window._medSyncCmpBtn = function(id) {
      var btn = document.getElementById('pdx-med-cmp-btn');
      if (!btn) return;
      var sel = (typeof _cmpSelected !== 'undefined') && _cmpSelected.has(id);
      btn.classList.toggle('is-on', sel);
      btn.innerHTML = sel ? '✓ Comparing' : '⚖️ Compare';
    };
    window._mediumToggleTeam = function(btn) {
      var id = window._pdxMediumId; if (!id) return;
      if (typeof window.mypolToggleAnimated === 'function') window.mypolToggleAnimated(btn, id);
      setTimeout(function() { window._medSyncTeamBtn(id); }, 720);
    };
    window._mediumToggleCompare = function(btn) {
      var id = window._pdxMediumId; if (!id) return;
      if (typeof window.chubToggle === 'function') window.chubToggle(id);
      window._medSyncCmpBtn(id);
    };
    window._mediumViewFull = function() {
      var id = window._pdxMediumId;
      window.closeMediumModal();
      setTimeout(function() { if (typeof window.openFullProfile === 'function') window.openFullProfile(id); }, 180);
    };
    // ── Medium-modal quick-jump nav ───────────────────────────────────────
    // Smooth-scrolls the quick-view body to the Scores or Evidence section, or
    // nudges attention to the always-visible action footer. Deliberately small
    // and calm — it just moves the reader, it never restyles the content.
    window._pdxMedJump = function(key, btn) {
      var content = document.getElementById('pdx-medium-content');
      if (!content) return;
      var nav = content.querySelector('.pdx-med-qnav');
      var navH = nav ? nav.offsetHeight : 0;
      // Briefly suppress the scroll-spy so it doesn't fight the animated jump.
      window._pdxMedNavJumping = true;
      clearTimeout(window._pdxMedNavJumpT);
      window._pdxMedNavJumpT = setTimeout(function() { window._pdxMedNavJumping = false; }, 650);
      if (key === 'actions') {
        // The action footer sits outside the scroll area and is always visible,
        // so scroll the body to its end and give the footer a soft pulse.
        try { content.scrollTo({ top: content.scrollHeight, behavior: 'smooth' }); }
        catch (e) { content.scrollTop = content.scrollHeight; }
        var foot = document.querySelector('#pdx-medium-panel .pdx-med-foot');
        if (foot) {
          foot.classList.remove('pdx-med-foot--pulse');
          void foot.offsetWidth;
          foot.classList.add('pdx-med-foot--pulse');
          setTimeout(function() { foot.classList.remove('pdx-med-foot--pulse'); }, 1300);
        }
      } else {
        var el = document.getElementById('pdxmed-' + key);
        if (el) {
          var top = content.scrollTop + el.getBoundingClientRect().top - content.getBoundingClientRect().top - navH - 10;
          try { content.scrollTo({ top: Math.max(0, top), behavior: 'smooth' }); }
          catch (e) { content.scrollTop = Math.max(0, top); }
        }
      }
      if (btn && btn.parentElement) {
        Array.prototype.forEach.call(btn.parentElement.children, function(c) { if (c.classList) c.classList.remove('is-active'); });
        btn.classList.add('is-active');
      }
    };
    // Light scroll-spy: highlight the pill for whichever section is under the rail.
    window._pdxMedSpyInit = function() {
      var content = document.getElementById('pdx-medium-content');
      if (!content) return;
      var nav = content.querySelector('.pdx-med-qnav');
      if (!nav) { content.onscroll = null; return; }
      var pills = Array.prototype.slice.call(nav.querySelectorAll('.pdx-med-qnav-pill'));
      content.onscroll = function() {
        if (window._pdxMedNavJumping) return;
        var navH = nav.offsetHeight;
        var ref = content.getBoundingClientRect().top + navH + 18;
        var current = 'scores';
        var scores = document.getElementById('pdxmed-scores');
        var evidence = document.getElementById('pdxmed-evidence');
        if (scores && scores.getBoundingClientRect().top <= ref) current = 'scores';
        if (evidence && evidence.getBoundingClientRect().top <= ref) current = 'evidence';
        if (content.scrollHeight - content.clientHeight > 40 && content.scrollTop + content.clientHeight >= content.scrollHeight - 6) current = 'actions';
        pills.forEach(function(pl) {
          pl.classList.toggle('is-active', pl.getAttribute('data-medjump') === current);
        });
      };
    };
    window.closeMediumModal = function() {
      var ov = document.getElementById('pdx-medium-overlay');
      if (ov) ov.style.setProperty('display', 'none', 'important');
      window._pdxMediumId = null;
      // Only release the body scroll lock if the full profile modal isn't open.
      var full = document.getElementById('modal-overlay');
      var fullOpen = full && window.getComputedStyle(full).display !== 'none';
      if (!fullOpen) document.body.style.overflow = '';
    };
    // Alias so explicit "View Full Profile" actions (and the medium modal) reach
    // the deep-dive profile renderer regardless of which script scope they're in.
    window.openFullProfile = function(id, ev) {
      if (ev && ev.stopPropagation) ev.stopPropagation();
      if (typeof openModal === 'function') openModal(id);
      else if (typeof window.openModal === 'function') window.openModal(id);
    };
    // Escape closes the medium modal first (before the full modal / share sheet).
    document.addEventListener('keydown', function(e) {
      if (e.key !== 'Escape') return;
      var ov = document.getElementById('pdx-medium-overlay');
      if (ov && window.getComputedStyle(ov).display !== 'none') { e.stopPropagation(); window.closeMediumModal(); }
    }, true);

    // Per-office picks summary — a compact, scannable roster that answers, at a
    // glance, how many picks the visitor has made and for which offices. Each of
    // the ballot's offices renders as a chip: a filled chip shows the chosen
    // teammate's name with a one-tap ✕ to remove them; an open chip invites a pick
    // and jumps to that office's candidates. Complements the larger slot tiles
    // below with a tight, list-style read of the whole team.
    function _renderTeamOfficeSummary(ballotSelections, filledCount) {
      var box = document.getElementById('myteam-office-summary');
      if (!box) return;
      // Consolidation: the grouped team grid now lists every office with its pick
      // (or open state) and a one-tap jump, so this chip roster duplicated it. It
      // is kept hidden to remove the repetition and shorten the section. The
      // function body below is retained for reference but never renders.
      box.style.display = 'none'; box.innerHTML = '';
      return;
    }

    function _renderTeamOfficeSummary_legacy(ballotSelections, filledCount) {
      var box = document.getElementById('myteam-office-summary');
      if (!box) return;
      if (!filledCount) { box.style.display = 'none'; box.innerHTML = ''; return; }

      var total = TEAM_POSITIONS.length;
      var chips = TEAM_POSITIONS.map(function(pos) {
        var pid = ballotSelections[pos.key];
        var d = pid ? CMP_DATA[pid] : null;
        var ico = pos.icon || '🏛';
        if (d) {
          var name = (d.name || 'Selected').replace(/"/g, '&quot;');
          return '<span class="myteam-office-chip is-filled" title="' + pos.label + ' — ' + name + '">' +
              '<span class="moc-ico">' + ico + '</span>' +
              '<span class="moc-text"><span class="moc-office">' + pos.label + '</span>' +
              '<span class="moc-name">' + name + '</span></span>' +
              '<button class="moc-remove" title="Remove ' + name + ' from your team" ' +
                'onclick="event.stopPropagation();window.myteamClearSlot(\'' + pos.key + '\', this)">✕</button>' +
            '</span>';
        }
        return '<span class="myteam-office-chip is-open" title="Pick your ' + pos.label + '" ' +
            'onclick="window.jumpToRelevantAccordion(\'' + pos.key + '\')">' +
            '<span class="moc-ico">' + ico + '</span>' +
            '<span class="moc-text"><span class="moc-office">' + pos.label + '</span>' +
            '<span class="moc-name">+ Add a pick</span></span>' +
          '</span>';
      }).join('');

      box.innerHTML =
        '<div class="myteam-office-summary-head">' +
          '<span class="myteam-office-summary-title">⭐ Your Picks by Office</span>' +
          '<span class="myteam-office-summary-count">' + filledCount + ' of ' + total + ' offices filled</span>' +
        '</div>' +
        '<div class="myteam-office-chips">' + chips + '</div>';
      box.style.display = '';
    }

    // Persistence reassurance pill. Anonymous/guest visitors are told their team
    // is saved on this device (the localStorage that now reliably persists across
    // refreshes); signed-in members are told it is synced to their account. Hidden
    // until at least one pick exists so an empty team stays clean.
    function _renderTeamSaveStatus(filledCount) {
      var el = document.getElementById('myteam-save-status');
      if (!el) return;
      if (!filledCount) { el.style.display = 'none'; el.innerHTML = ''; return; }
      var signedIn = false;
      try { signedIn = !!(typeof auth !== 'undefined' && auth && auth.currentUser && !auth.currentUser.isAnonymous); } catch (e) {}
      el.classList.toggle('is-synced', signedIn);
      el.innerHTML = signedIn
        ? '<span class="mss-dot"></span><span>Synced to your account</span><span class="mss-sub">— available on all your devices</span>'
        : '<span class="mss-dot"></span><span>Saved on this device</span><span class="mss-sub">— sign in to sync everywhere</span>';
      el.style.display = '';
    }

    // Returns the ballot key of the first office the visitor hasn't filled yet, so
    // the guide's CTA can drop them straight onto the right race. Falls back to the
    // Senate accordion if everything is somehow filled or state is unavailable.
    function _myteamFirstOpenOffice() {
      try {
        var sel = _getTeamBallotSelections();
        for (var i = 0; i < TEAM_POSITIONS.length; i++) {
          var k = TEAM_POSITIONS[i].key;
          if (!(sel[k] && CMP_DATA[sel[k]])) return k;
        }
      } catch (e) {}
      return TEAM_POSITIONS && TEAM_POSITIONS[0] ? TEAM_POSITIONS[0].key : 'senate';
    }

    // Single entry point for the guided checklist's "do this" buttons. Each branch
    // routes to the tool that completes that step — keeping the onclick markup tiny.
    window._myteamGuideGo = function(which) {
      try {
        if (which === 'loc') {
          if (window.toggleChangeLocation) window.toggleChangeLocation();
        } else if (which === 'align') {
          if (window.alignTogglePanel) window.alignTogglePanel(true);
          var ap = document.getElementById('alignment-panel');
          if (ap && ap.scrollIntoView) ap.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else if (which === 'compare') {
          if (window.myteamCompareAll) window.myteamCompareAll();
        } else { // 'pick' / 'fill' — jump to the next open race
          if (window.jumpToRelevantAccordion) window.jumpToRelevantAccordion(_myteamFirstOpenOffice());
        }
      } catch (e) {}
    };

    // "What to do next" guided checklist. Surfaces the build journey as four
    // milestones — set location, add a first pick, match values, fill the ballot —
    // marks the ones already done, and highlights the single next action with a
    // clear CTA. Once the ballot is full it flips to a celebratory "ready" state
    // that points at Compare. This is the section's primary hand-holding for a
    // first-time visitor who otherwise wouldn't know where to begin.
    function _renderTeamNextStep(filledCount) {
      // Expose the live pick count so the Voter Hub "Your Path" spine can reflect
      // build progress without re-deriving it from storage.
      window._myteamFilledCount = filledCount;
      try { if (typeof window._vhSyncPathSteps === 'function') window._vhSyncPathSteps(); } catch (e) {}
      try { if (typeof window._pdxFirstRunSync === 'function') window._pdxFirstRunSync(); } catch (e) {}
      var box = document.getElementById('myteam-next-step');
      if (!box) return;
      // Prefer the live seat total the builder just computed for this location
      // (fixed offices + the voter's real local seats) so this tracker's "X of N"
      // matches the header exactly; fall back to the raw slate length only before
      // the first builder paint has published one.
      var total = (typeof window._myteamSeatTotal === 'number' && window._myteamSeatTotal > 0)
        ? window._myteamSeatTotal
        : ((window.TEAM_POSITIONS && window.TEAM_POSITIONS.length) || 6);

      var locDone = !!window._hasUserLocation;
      var pickDone = filledCount >= 1;
      var alignDone = !!(window._alignIssues && window._alignIssues.size > 0);
      var teamComplete = filledCount >= total;

      // Keep the persistent Team Builder dock in sync with every team change. The
      // dock lives outside this section's markup, so we compute its state here —
      // where the live pick count and the seat helpers are already in scope — and
      // push it through window._paintTeamDock() (guarded; the dock script may load
      // after the first render). Names the single next open seat, with its real
      // district number when we know it, so the dock can say "Next: State Senate
      // (District 8)" rather than a generic prompt.
      try {
        var _dockNextKey = teamComplete ? null : (typeof _myteamFirstOpenOffice === 'function' ? _myteamFirstOpenOffice() : null);
        var _dockNextLabel = '';
        if (_dockNextKey && window.TEAM_POSITIONS) {
          for (var _dpi = 0; _dpi < window.TEAM_POSITIONS.length; _dpi++) {
            if (window.TEAM_POSITIONS[_dpi].key === _dockNextKey) { _dockNextLabel = window.TEAM_POSITIONS[_dpi].label; break; }
          }
        }
        window._teamDockState = {
          filled: filledCount,
          total: total,
          complete: teamComplete,
          nextKey: _dockNextKey,
          nextLabel: _dockNextLabel,
          nextScope: (_dockNextKey && typeof _myteamSeatScope === 'function') ? _myteamSeatScope(_dockNextKey) : ''
        };
        if (typeof window._paintTeamDock === 'function') window._paintTeamDock();
      } catch (_de) {}

      // The visible "While building your team" guidance block was removed from the
      // builder to cut repetition with the persistent "Your Voting Team" progress
      // shown at the top of Relevant to Me. The side-effects above (Team Builder
      // dock + Voter Hub "Your Path" sync) still run on every repaint; only the
      // checklist/progress block this function used to paint is intentionally gone.
      box.style.display = 'none';
      box.innerHTML = '';
      return;

      var remaining = Math.max(0, total - filledCount);
      var steps = [
        { key: 'loc', icon: '📍', go: 'loc', done: locDone,
          label: 'Set your location',
          desc: 'See the exact races on your ballot — your real Senate, House &amp; local seats.',
          cta: 'Set location' },
        { key: 'pick', icon: '⭐', go: 'pick', done: pickDone,
          label: 'Add your first pick',
          desc: 'Find a candidate who earns it and tap <strong>➕ Add to My Team</strong>.',
          cta: 'Add a pick' },
        { key: 'align', icon: '🎯', go: 'align', done: alignDone,
          label: 'Match your values',
          desc: 'Use the <strong>Alignment Tool</strong> to see who actually fits what you believe.',
          cta: 'Match values' },
        { key: 'fill', icon: '🗳️', go: 'fill', done: teamComplete,
          label: 'Fill all ' + total + ' ballot seats',
          desc: pickDone && !teamComplete
            ? '<strong>' + remaining + '</strong> ' + (remaining === 1 ? 'seat' : 'seats') + ' left — one pick per office, swap anytime.'
            : 'One pick per office, from U.S. Senate down to local — swap anytime.',
          cta: 'Fill a seat' }
      ];

      // Everything done → compact celebratory "ready" banner.
      if (teamComplete && locDone && alignDone) {
        box.innerHTML =
          '<div class="myteam-guide is-complete">' +
            '<div class="myteam-guide-head">' +
              '<span class="myteam-guide-title">🎉 Your ballot team is ready</span>' +
              '<span class="myteam-guide-count">' + total + '/' + total + ' seats filled</span>' +
            '</div>' +
            '<p class="myteam-guide-sub">Every seat is filled with someone who reflects <strong>your values</strong>, and it\'s <strong>saved on this device</strong> for election day. View your finished ballot to print or share it, compare your slate, or keep refining.</p>' +
            '<div class="myteam-guide-steps">' +
              '<div class="myteam-guide-step is-active"><span class="myteam-guide-marker">📋</span><span class="myteam-guide-txt"><span class="myteam-guide-label">See your finished ballot</span><span class="myteam-guide-desc">Your whole slate on one card — print it or copy it to take to the polls.</span></span><button type="button" class="myteam-guide-go" onclick="window.openBallotSummary && window.openBallotSummary()">📋 My Ballot</button></div>' +
              (filledCount >= 2
                ? '<div class="myteam-guide-step is-active"><span class="myteam-guide-marker">✓</span><span class="myteam-guide-txt"><span class="myteam-guide-label">Compare your team</span><span class="myteam-guide-desc">See all your picks head-to-head on record &amp; values.</span></span><button type="button" class="myteam-guide-go" onclick="window._myteamGuideGo(\'compare\')">⚖️ Compare</button></div>'
                : '') +
            '</div>' +
          '</div>';
        box.style.display = '';
        return;
      }

      // Once the voter is clearly underway, the full four-step checklist is just
      // noise — they already know how this works. Collapse it to a single progress
      // line that names the next open seat (with its real district when known) and
      // offers a one-tap jump. Triggers as soon as a first pick lands once location
      // is set (nothing important is lost — the values nudge persists above), or by
      // the second pick regardless. This is the main de-cluttering of the builder
      // once building is in motion.
      if (pickDone && !teamComplete && (filledCount >= 2 || locDone)) {
        var _nextKey = (typeof _myteamFirstOpenOffice === 'function') ? _myteamFirstOpenOffice() : null;
        var _nextLabel = '';
        if (_nextKey && window.TEAM_POSITIONS) {
          for (var _nci = 0; _nci < window.TEAM_POSITIONS.length; _nci++) {
            if (window.TEAM_POSITIONS[_nci].key === _nextKey) { _nextLabel = window.TEAM_POSITIONS[_nci].label; break; }
          }
        }
        var _nextScope = (_nextKey && typeof _myteamSeatScope === 'function') ? _myteamSeatScope(_nextKey) : '';
        box.innerHTML =
          '<div class="myteam-guide is-compact">' +
            '<div class="myteam-guide-head">' +
              '<span class="myteam-guide-title">⭐ ' + filledCount + ' of ' + total + ' seats filled</span>' +
              '<span class="myteam-guide-count">' + remaining + ' to go</span>' +
            '</div>' +
            '<div class="myteam-guide-compact-row">' +
              '<span class="myteam-guide-compact-next">Next up: <strong>' + (_nextLabel || 'your next seat') + '</strong>' + (_nextScope ? ' · ' + _nextScope : '') + '. Add a pick — or jump to <strong>My Ballot</strong> to review your slate.</span>' +
              '<button type="button" class="myteam-guide-go" onclick="window._myteamGuideGo(\'pick\')">➕ Add this pick →</button>' +
            '</div>' +
          '</div>';
        box.style.display = '';
        return;
      }

      // Otherwise → the journey checklist, highlighting the first incomplete step.
      var doneCount = steps.filter(function(s) { return s.done; }).length;
      var activeFound = false;
      var rows = steps.map(function(s) {
        var state, marker;
        if (s.done) { state = 'is-done'; marker = '✓'; }
        else if (!activeFound) { state = 'is-active'; marker = '▶'; activeFound = true; }
        else { state = 'is-todo'; marker = '○'; }
        var btn = state === 'is-active'
          ? '<button type="button" class="myteam-guide-go" onclick="window._myteamGuideGo(\'' + s.go + '\')">' + s.cta + ' →</button>'
          : '';
        return '<div class="myteam-guide-step ' + state + '">' +
            '<span class="myteam-guide-marker">' + marker + '</span>' +
            '<span class="myteam-guide-txt">' +
              '<span class="myteam-guide-label">' + s.icon + ' ' + s.label + '</span>' +
              '<span class="myteam-guide-desc">' + s.desc + '</span>' +
            '</span>' + btn +
          '</div>';
      }).join('');

      box.innerHTML =
        '<details class="myteam-guide myteam-guide-collapsible">' +
          '<summary class="myteam-guide-head myteam-guide-summary">' +
            '<span class="myteam-guide-title">🧭 While building your team</span>' +
            '<span class="myteam-guide-count">' + doneCount + '/' + steps.length + ' done</span>' +
            '<span class="myteam-guide-chev" aria-hidden="true">⌄</span>' +
          '</summary>' +
          '<p class="myteam-guide-sub">A few optional steps if you want them — your slate <strong>saves automatically</strong> as you go.</p>' +
          '<div class="myteam-guide-steps">' + rows + '</div>' +
        '</details>';
      box.style.display = '';
    }

    // ── "Your Districts" coverage map ──────────────────────────────────────────
    // Turns the abstract "6 of N picks" count into a concrete map of the voter's
    // OWN ballot: every seat on their slate (their U.S. House, State Senate &
    // State House districts, plus the statewide and local seats) is shown as
    // covered ✓ or still open, labelled with the real district number when we
    // know it. The guidance line always names the single next gap, and every
    // row — plus the CTA — jumps straight to that race so adding the missing
    // pick is one tap away. Same green/amber coverage language used elsewhere.
    var _MYTEAM_DISTRICT_KEYS = { house: 1, statesenate: 1, statehouse: 1 };

    // The voter's real district number for a slate seat when their ballot area is
    // known, else null. Resolved with the SAME priority the "Relevant to Me"
    // recommendation engine uses (see _relevantVoterDistricts / renderRelevantToMe)
    // so a seat card labelled "District 6" always opens the District 6 field — the
    // two surfaces can never disagree. Priority: the voter's own explicitly saved
    // district (the congressional seat for U.S. House; the map-pinpointed State
    // Senate / State House seat for those chambers) wins, then the curated area's
    // roster district fills in.
    function _myteamDistrictNum(key) {
      var loc = window._currentVoterLocation || {};
      var saved = '';
      if (key === 'house')            saved = loc.district || '';
      else if (key === 'statesenate') saved = loc.stateSenateDistrict || '';
      else if (key === 'statehouse')  saved = loc.stateHouseDistrict || '';
      saved = String(saved).replace(/[^0-9]/g, '');
      if (saved) return saved;
      try {
        var kr = (typeof window.keyRacesRelevantData === 'function') ? window.keyRacesRelevantData() : null;
        if (kr && kr.matched && kr.byRace && kr.byRace[key] && kr.byRace[key].district) {
          return String(kr.byRace[key].district);
        }
      } catch (e) {}
      return null;
    }

    // Short, office-appropriate scope label for a seat row.
    function _myteamSeatScope(key) {
      if (_MYTEAM_DISTRICT_KEYS[key]) {
        var n = _myteamDistrictNum(key);
        return n ? 'District ' + n : 'Your district';
      }
      if (key === 'local') return 'Your community';
      return 'Statewide';
    }

    // Location-aware headline for the ballot board. Speaks to the voter's own
    // place and districts ("Fill your Layton ballot", "Choose your District 2
    // team who deserves your vote") so the section reads as personal and tied to
    // their actual ballot — not a generic builder. Falls back to a "set your
    // location" nudge when no place is saved, and a "team is set" line when full.
    function _myteamFocusLine(filledCount, total) {
      total = total || ((window.TEAM_POSITIONS && window.TEAM_POSITIONS.length) || 6);
      var loc = window._currentVoterLocation || {};
      var hasLoc = window._hasUserLocation && (loc.state || '').trim();
      var city = (loc.city || '').trim();
      var county = (loc.county || '').trim().replace(/\s*county$/i, '');
      var state = (loc.state || '').trim();
      var place = city || (county ? county + ' County' : '') || state;
      var distNum = null;
      if (typeof _myteamDistrictNum === 'function') {
        distNum = _myteamDistrictNum('house') || _myteamDistrictNum('statehouse') || _myteamDistrictNum('statesenate');
      }

      if (!hasLoc || !place) {
        return 'Your ' + total + ' ballot slots — <strong>one pick per office.</strong> ' +
          '<button type="button" onclick="if(window.openLocationModal)window.openLocationModal();" style="background:none;border:none;padding:0;margin:0;cursor:pointer;color:#ffe9c2;font:inherit;text-decoration:underline;">Set your location</button> to tie them to your own districts.';
      }
      if (filledCount >= total) {
        return 'Your <strong>' + place + '</strong> team is set — all ' + total + ' seats filled. Swap any pick anytime.';
      }
      var lead = distNum
        ? 'Choose your <strong>District ' + distNum + '</strong> team who deserves your vote'
        : 'Fill your <strong>' + place + '</strong> ballot';
      return lead + ' — <strong>one pick per office.</strong> These are the ' + total + ' seats ' + place + ' voters choose; add the candidate who earns each below.';
    }

    // Ballot "level" for a slate seat — the tier a voter naturally reasons about:
    // a federal office (U.S. Senate/House, President), a state office (Governor,
    // State Senate/House, AG, etc.), or a local office. Lets the coverage view group
    // seats the way a ballot actually reads and lets the guidance speak in those
    // terms ("complete your federal coverage"). The National cabinet slate has no
    // state/local seats, so its offices all count as federal.
    var _MYTEAM_FED_KEYS = { senate: 1, house: 1, president: 1, vicepresident: 1, defense: 1, intel: 1, treasury: 1, homeland: 1 };
    function _myteamSeatLevel(key) {
      if (key === 'local') return 'local';
      if (_MYTEAM_FED_KEYS[key]) return 'federal';
      var st = (window._currentVoterLocation && window._currentVoterLocation.state) || '';
      if (st === 'National') return 'federal';
      return 'state';
    }
    var _MYTEAM_LEVELS = [
      { id: 'federal', title: '\u{1F1FA}\u{1F1F8} Federal', word: 'federal' },
      { id: 'state',   title: '\u{1F3DB}\u{FE0F} State',    word: 'state' },
      { id: 'local',   title: '\u{1F3D9}\u{FE0F} Local',    word: 'local' }
    ];

    // Which builder group a seat belongs to. The authoritative team grid splits the
    // ballot into the four buckets a voter naturally reasons about — Federal,
    // Statewide, Your Districts (the geographically specific seats only this address
    // elects), and Local — so the grid reads as an organized ballot, not a flat list.
    // Reuses _MYTEAM_DISTRICT_KEYS / _slotTier so the grouping can never drift from
    // the rest of the builder.
    function _slotGroup(key) {
      if (_MYTEAM_DISTRICT_KEYS[key]) return 'districts';
      if (key === 'local') return 'local';
      if (_slotTier(key) === 'Federal') return 'federal';
      return 'statewide';
    }
    window._slotGroup = _slotGroup;
    // Each group is a LEVEL-OF-GOVERNMENT band. `eyebrow` is the small "who votes
    // on these" kicker, `title` is the scannable level name, and `accent` is the
    // band's colour — used for the header accent bar and the panel's left edge so a
    // voter can tell the levels apart at a glance and read the ballot top-to-bottom.
    var _MYTEAM_GROUPS = [
      { id: 'federal',   ico: '\u{1F1FA}\u{1F1F8}', eyebrow: 'The nation &amp; your state', title: 'Federal',           accent: '#60a5fa' },
      { id: 'statewide', ico: '\u{1F3DB}\u{FE0F}',  eyebrow: 'Shared by every voter',       title: 'Statewide',         accent: '#34d399' },
      { id: 'districts', ico: '\u{1F4CD}',          eyebrow: 'Only your address elects',    title: 'Your District Seats', accent: '#fbbf24' },
      { id: 'local',     ico: '\u{1F3D9}\u{FE0F}',  eyebrow: 'The offices closest to home', title: 'Your Local Seats',  accent: '#c084fc' }
    ];

    // ── Sidebar + stage "cockpit" ────────────────────────────────────────────
    // The builder is navigated as four clear ballot LEVELS in a left-hand nav;
    // the main stage shows only the seats for the selected level. Federal /
    // Statewide / State Legislative reuse the existing seat cards; Local expands
    // into the voter's real municipal seats (Mayor, City Council, School Board,
    // County …) resolved from the same authoritative ballot the rest of the app
    // uses. The polished per-pick card visuals are untouched — this only changes
    // how seats are organized and reached.
    var _MYTEAM_COCKPIT_LEVELS = [
      { id: 'federal',   group: 'federal',   ico: '\u{1F1FA}\u{1F1F8}', label: 'Federal Races',    sub: 'President, U.S. Senate &amp; House',   accent: '#60a5fa' },
      { id: 'statewide', group: 'statewide', ico: '\u{1F3DB}\u{FE0F}',  label: 'Statewide Races',  sub: 'Governor &amp; state offices',         accent: '#34d399' },
      { id: 'districts', group: 'districts', ico: '\u{1F4CD}',          label: 'State Legislative', sub: 'Your State Senate &amp; House seats', accent: '#fbbf24' },
      { id: 'local',     group: 'local',     ico: '\u{1F3D9}\u{FE0F}',  label: 'Local / Municipal', sub: 'Mayor, council, school &amp; county', accent: '#c084fc' }
    ];

    // The voter's real local seats for their current area, id-resolved from the
    // same authoritative ballot (_pdxVoterBallot) the district seats use, so a
    // name is never invented. Returns [] when the area has no curated local slate.
    function _myteamLocalSeats() {
      try {
        var vb = (typeof window._pdxVoterBallot === 'function') ? window._pdxVoterBallot() : null;
        // Only surface real local seats for an area we actually resolved to THIS
        // voter's location. _pdxVoterBallot falls back to a default Utah area
        // (Davis) when it can't place the voter, so without the `matched` guard an
        // out-of-Utah — or not-yet-located — visitor would see Layton / Davis
        // County seats presented as if they were their own. When unmatched, return
        // [] so the honest "local seats are specific to where you live" empty state
        // shows instead, and the seat count falls back to the single generic slot.
        if (vb && vb.matched && vb.local && vb.local.seats) return vb.local.seats.slice();
      } catch (e) {}
      return [];
    }
    // raceKey → curated local record (district / chamber / ballot label / note),
    // for the richer seat headings. Reads window.KEY_RACES_LOCAL_BY_LOCATION.
    function _myteamLocalMeta() {
      var map = {};
      try {
        var vb = (typeof window._pdxVoterBallot === 'function') ? window._pdxVoterBallot() : null;
        var locId = vb && vb.locId;
        var lr = (locId && window.KEY_RACES_LOCAL_BY_LOCATION && window.KEY_RACES_LOCAL_BY_LOCATION[locId])
          ? window.KEY_RACES_LOCAL_BY_LOCATION[locId] : [];
        lr.forEach(function(r) { map[r.raceKey] = r; });
      } catch (e) {}
      return map;
    }
    // Each real local office gets its OWN independent ballot key — derived from the
    // seat's curated raceKey — so a voter can hold a separate pick for Mayor, City
    // Council, School Board, County, etc. at the same time (just like Federal and
    // State seats), instead of the whole Local level sharing one generic "local"
    // slot. e.g. { raceKey:'mayor' } → 'local_mayor', 'county_commission' →
    // 'local_county_commission'.
    function _myteamLocalSeatKey(seat) {
      var rk = seat && seat.raceKey;
      return rk ? ('local_' + String(rk).toLowerCase()) : 'local';
    }
    window._myteamLocalSeatKey = _myteamLocalSeatKey;

    // The per-seat ballot key a specific politician belongs to, resolved by which
    // local seat's roster (incumbents + candidates) actually contains them. This is
    // the single routing point every write path uses to send a local pick to its
    // own slot rather than the shared generic 'local' key. Returns null for anyone
    // who isn't on a curated local roster (i.e. non-local people are untouched).
    window._myteamLocalKeyForPid = function(pid) {
      if (!pid) return null;
      try {
        var seats = _myteamLocalSeats();
        for (var i = 0; i < seats.length; i++) {
          if ((seats[i].pids || []).indexOf(pid) !== -1) return _myteamLocalSeatKey(seats[i]);
        }
      } catch (e) {}
      return null;
    };

    // The pick saved for ONE local seat (its own key), if any and still a real
    // person. Empty seats return null so they render their officeholder preview.
    function _myteamLocalSeatPick(seat, sel) {
      try {
        var pid = sel && sel[_myteamLocalSeatKey(seat)];
        return (pid && CMP_DATA[pid]) ? pid : null;
      } catch (e) { return null; }
    }

    // First committed local pick across every per-seat key (with the legacy generic
    // 'local' key as a final fallback) — used to keep the single "Local" slot on the
    // overall progress bar counting once the voter has ANY local pick.
    function _myteamFirstLocalPid(sel) {
      try {
        if (!sel) return null;
        if (sel.local && CMP_DATA[sel.local]) return sel.local;
        var seats = _myteamLocalSeats();
        for (var i = 0; i < seats.length; i++) {
          var pid = sel[_myteamLocalSeatKey(seats[i])];
          if (pid && CMP_DATA[pid]) return pid;
        }
      } catch (e) {}
      return null;
    }
    window._myteamFirstLocalPid = _myteamFirstLocalPid;

    // One-time, self-terminating migration: an existing team saved under the old
    // shared 'local' key is moved to the specific per-seat key its pick belongs to
    // (matched by the candidate's local roster). Safe to call on every render — it
    // only touches storage when it can confidently place the legacy pick, and once
    // moved there is no 'local' key left to migrate. The unified read layer
    // (PDXTeamV2) preserves a seat already on a pid's mirror record, so the moved
    // seat is also patched there directly — otherwise the v2-first read would keep
    // returning the old 'local' seat.
    function _myteamMigrateLocalPick() {
      try {
        var load = window._ballotLoad, save = window._ballotSave;
        if (typeof load !== 'function' || typeof save !== 'function') return;
        var sel = load() || {};
        var legacyPid = sel.local;
        if (!legacyPid || !CMP_DATA[legacyPid]) return;   // nothing (real) to migrate
        var target = window._myteamLocalKeyForPid(legacyPid);
        if (!target || target === 'local') return;        // seats not resolved / no home yet
        if (!sel[target]) sel[target] = legacyPid;
        delete sel.local;
        save(sel);
        try {
          if (window.PDXTeamV2 && typeof window.PDXTeamV2.read === 'function') {
            var recs = window.PDXTeamV2.read(), changed = false;
            recs.forEach(function(r) {
              if (r && String(r.pid) === String(legacyPid) && r.seat === 'local') { r.seat = target; changed = true; }
            });
            if (changed && typeof window.PDXTeamV2.write === 'function') window.PDXTeamV2.write(recs);
          }
        } catch (e) {}
      } catch (e) {}
    }
    window._myteamMigrateLocalPick = _myteamMigrateLocalPick;

    // Filled / total across the VISIBLE local seats, now that each seat has its own
    // independent key: a seat counts as filled when it has its own saved pick. Drives
    // the Local nav badge and panel header so both reflect every individual office.
    function _myteamLocalCounts(seats, sel) {
      var list = seats || [];
      var filled = 0;
      list.forEach(function(s) { if (_myteamLocalSeatPick(s, sel)) filled++; });
      return { filled: filled, total: list.length };
    }

    // The voter's TRUE ballot size and how many seats they've filled. The fixed
    // TEAM_POSITIONS slate carries a single generic "Local Office" slot, but the
    // builder's Local level actually expands into the voter's REAL local seats
    // (Mayor, City Council, County, School Board …) resolved from their location —
    // the very seats the cockpit's Local panel already shows. This swaps that one
    // generic slot for those real seats so every "X of N" readout (the header
    // badge, picks meter, progress bar + pips, and the Voter Hub path tracker)
    // reflects the ballot the voter is actually looking at, and all of them move
    // together the instant the location — and therefore the ballot — changes.
    // Areas with no curated local slate keep the single generic Local slot, so the
    // count degrades gracefully to TEAM_POSITIONS.length. This is the single source
    // of truth the seat-count surfaces read from, so they can never disagree.
    // Returns { total, filled, pids, seats:[{ key, label, color, on }] }.
    function _myteamBallotCounts(sel) {
      sel = sel || _getTeamBallotSelections();
      var positions = window.TEAM_POSITIONS || [];
      var out = { total: 0, filled: 0, pids: [], seats: [] };
      var hasGenericLocal = false;
      positions.forEach(function(pos) {
        if (pos.key === 'local') { hasGenericLocal = true; return; }
        var pid = sel[pos.key];
        var on = !!(pid && typeof CMP_DATA !== 'undefined' && CMP_DATA[pid]);
        out.total++;
        if (on) { out.filled++; out.pids.push(pid); }
        out.seats.push({ key: pos.key, label: pos.label, color: pos.color || '#9fb4d4', on: on });
      });
      var localSeats = (typeof _myteamLocalSeats === 'function') ? _myteamLocalSeats() : [];
      if (localSeats.length) {
        var lmeta = (typeof _myteamLocalMeta === 'function') ? _myteamLocalMeta() : {};
        localSeats.forEach(function(seat) {
          var m = lmeta[seat.raceKey] || null;
          var pid = _myteamLocalSeatPick(seat, sel);
          var on = !!pid;
          out.total++;
          if (on) { out.filled++; out.pids.push(pid); }
          out.seats.push({
            key: _myteamLocalSeatKey(seat),
            label: (m && (m.short || m.district)) || seat.short || 'Local Office',
            color: (m && m.color) || '#c084fc',
            on: on
          });
        });
      } else if (hasGenericLocal) {
        // No curated local slate for this area — keep the single generic Local slot
        // exactly as before so the count stays honest for states we don't yet have
        // municipal rosters for.
        out.total++;
        var lp = (typeof _myteamFirstLocalPid === 'function') ? _myteamFirstLocalPid(sel) : (sel.local || null);
        var lpOn = !!(lp && typeof CMP_DATA !== 'undefined' && CMP_DATA[lp]);
        if (lpOn) { out.filled++; out.pids.push(lp); }
        out.seats.push({ key: 'local', label: 'Local Office', color: '#fbbf24', on: lpOn });
      }
      return out;
    }
    window._myteamBallotCounts = _myteamBallotCounts;

    // Which calm sub-heading a local seat belongs under (Mayor · City Council ·
    // School Board · County …), derived from its level and office wording.
    function _myteamLocalSubhead(seat, meta) {
      var lvl = seat.level || (meta && meta.level) || 'local';
      var s = ((seat.short || '') + ' ' + ((meta && meta.district) || '') + ' ' + ((meta && meta.chamber) || '')).toLowerCase();
      if (lvl === 'school' || /school|education/.test(s)) return { key: 'school', label: '\u{1F3EB} School Board / Board of Education' };
      if (/mayor/.test(s)) return { key: 'mayor', label: '\u{1F3D9}\u{FE0F} Mayor' };
      if (/council/.test(s)) return { key: 'council', label: '\u{1F3DB}\u{FE0F} City Council' };
      if (lvl === 'city') return { key: 'city', label: '\u{1F3D9}\u{FE0F} City Offices' };
      if (lvl === 'county' || /county|sheriff|commission|clerk|auditor|attorney|executive/.test(s)) return { key: 'county', label: '\u{1F3DB}\u{FE0F} County' };
      return { key: 'other', label: '\u{1F4CD} Other Local Offices' };
    }
    // One local seat card: office title + chamber, the current officeholder(s)
    // (each opening their profile), a short context note and a jump into the
    // full field. '★ Your pick' marks a saved local choice.
    function _myteamLocalSeatCard(seat, meta, sel) {
      var accent = (meta && meta.color) || '#c084fc';
      var title = (meta && meta.district) || seat.short || 'Local Office';
      var chamber = (meta && meta.chamber) || '';
      var ballotLbl = (meta && meta.ballot && meta.ballot.label) || '';
      var pids = (seat.pids || []).filter(function(p) { return typeof CMP_DATA !== 'undefined' && CMP_DATA[p]; });
      // This seat's OWN independent pick (read from its per-seat key). When present
      // the card renders as filled with the "★ Your pick" badge; otherwise it
      // previews the sitting officeholder as an empty seat still worth acting on.
      var seatPick = _myteamLocalSeatPick(seat, sel);

      // One person row — photo + name + office — opening the full profile on tap.
      // The committed pick carries the "★ Your pick" badge.
      function _holderRow(pid) {
        var d = CMP_DATA[pid]; if (!d) return '';
        var nm = _medEsc(d.name || '');
        var ico = d.icon || '\u{1F3DB}';
        var pidJs = String(pid).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
        var photoUrl = (typeof window._getPhotoUrl === 'function') ? (window._getPhotoUrl(pid) || '') : '';
        var ph = photoUrl
          ? '<img loading="lazy" decoding="async" src="' + _medEsc(photoUrl) + '" alt="' + nm + '" onerror="this.style.display=\'none\';this.parentElement.textContent=\'' + _medEsc(ico) + '\'">'
          : _medEsc(ico);
        var isPick = pid === seatPick;
        return '<button type="button" class="myteam-local-holder' + (isPick ? ' is-pick' : '') + '" onclick="showProfile&&showProfile(\'' + pidJs + '\')" title="View ' + nm + '’s full profile">' +
            '<span class="myteam-local-holder-photo">' + ph + '</span>' +
            '<span class="myteam-local-holder-info">' +
              '<span class="myteam-local-holder-name">' + nm + (isPick ? ' <span class="myteam-local-pickbadge">★ Your pick</span>' : '') + '</span>' +
              '<span class="myteam-local-holder-office">' + _medEsc(d.office || '') + '</span>' +
            '</span>' +
          '</button>';
      }

      // Body + the pid the Profile / Compare actions target. A committed pick leads;
      // otherwise the current officeholder(s) preview so an unfilled seat still shows
      // who holds power right now — the same idea as _renderSlotEmpty's holder card.
      var tagHtml = '', bodyHtml, actionPid = null;
      if (seatPick) {
        actionPid = seatPick;
        tagHtml = '<div class="myteam-local-seat-tag is-pick">★ Your pick for this seat</div>';
        bodyHtml = '<div class="myteam-local-holders">' + _holderRow(seatPick) + '</div>';
      } else if (pids.length) {
        actionPid = (seat.incumbentPid && CMP_DATA[seat.incumbentPid]) ? seat.incumbentPid : pids[0];
        tagHtml = '<div class="myteam-local-seat-tag">\u{1F4CD} Who holds it now</div>';
        bodyHtml = '<div class="myteam-local-holders">' + pids.slice(0, 3).map(_holderRow).join('') + '</div>';
      } else {
        bodyHtml = '<div class="myteam-local-pending">' + _medEsc((meta && meta.extraNote) || 'Officeholder and candidate records for this seat are being confirmed and will appear here.') + '</div>';
      }
      var note = (pids.length && !seatPick && meta && meta.extraNote) ? '<p class="myteam-local-note">' + _medEsc(meta.extraNote) + '</p>' : '';

      // Standard seat actions — Profile / Compare / Swap — mirroring _renderSlotCard.
      // Each seat now owns its ballot key (local_<raceKey>): Profile/Compare target
      // this seat's own pick, and Swap opens the local field where any chosen
      // candidate is routed back to THIS seat's key (see _myteamLocalKeyForPid).
      var actions;
      if (actionPid) {
        var apJs = String(actionPid).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
        var isComparing = (typeof _cmpSelected !== 'undefined' && _cmpSelected && _cmpSelected.has) ? _cmpSelected.has(actionPid) : false;
        actions = '<div class="myteam-local-seat-actions myteam-local-seat-actions--row">' +
            '<button type="button" class="myteam-local-seat-btn" onclick="event.stopPropagation();showProfile&&showProfile(\'' + apJs + '\')">\u{1F4CB} Profile</button>' +
            '<button type="button" class="myteam-local-seat-btn' + (isComparing ? ' is-comparing' : '') + '" onclick="event.stopPropagation();chubToggle&&chubToggle(\'' + apJs + '\')">' + (isComparing ? '✓ Comparing' : '⚖️ Compare') + '</button>' +
            '<button type="button" class="myteam-local-seat-btn" onclick="event.stopPropagation();window.jumpToRelevantAccordion&&window.jumpToRelevantAccordion(\'local\')" title="Swap this pick — browse everyone running for this seat">\u{1F504} Swap</button>' +
          '</div>';
      } else {
        actions = '<div class="myteam-local-seat-actions">' +
            '<button type="button" class="myteam-local-seat-btn" onclick="window.jumpToRelevantAccordion&&window.jumpToRelevantAccordion(\'local\')">\u{1F50D} Explore &amp; compare candidates</button>' +
          '</div>';
      }

      return '<div class="myteam-local-seat' + (seatPick ? ' is-pick' : '') + '" style="--seat-color:' + accent + ';">' +
          '<div class="myteam-local-seat-head">' +
            '<span class="myteam-local-seat-title">' + _medEsc(title) + '</span>' +
            (ballotLbl ? '<span class="myteam-local-seat-ballot">' + _medEsc(ballotLbl) + '</span>' : '') +
          '</div>' +
          (chamber ? '<div class="myteam-local-seat-chamber">' + _medEsc(chamber) + '</div>' : '') +
          tagHtml + bodyHtml + note + actions +
        '</div>';
    }
    // The full Local stage: real seats grouped under sub-headings, or a graceful
    // "set your location / coming soon" state when there is no curated slate.
    function _myteamLocalStageHtml(seats) {
      if (!seats || !seats.length) {
        var hasLoc = !!window._hasUserLocation;
        return '<div class="myteam-cockpit-seats"><div class="myteam-local-empty">' +
            '<div class="myteam-local-empty-ico">\u{1F3D9}\u{FE0F}</div>' +
            '<div class="myteam-local-empty-title">Local seats are specific to where you live</div>' +
            '<p class="myteam-local-empty-txt">' + (hasLoc
              ? 'Your Mayor, City Council, School Board and County seats are being confirmed for your area and will appear here as records are added.'
              : 'Set your location to see your Mayor, City Council, School Board and County seats.') + '</p>' +
            (hasLoc ? '' : '<button type="button" class="myteam-local-empty-btn" onclick="window.toggleChangeLocation&&window.toggleChangeLocation()">\u{1F4CD} Set your location</button>') +
          '</div></div>';
      }
      var meta = _myteamLocalMeta();
      var sel = _getTeamBallotSelections();
      var order = ['mayor', 'council', 'city', 'school', 'county', 'other'];
      var groups = {};
      seats.forEach(function(seat) {
        var m = meta[seat.raceKey] || null;
        var sh = _myteamLocalSubhead(seat, m);
        if (!groups[sh.key]) groups[sh.key] = { label: sh.label, seats: [] };
        groups[sh.key].seats.push({ seat: seat, meta: m });
      });
      var html = '';
      // Render the known subheads in their curated order, then any other group a
      // curated seat produced. Every subhead _myteamLocalSubhead returns today is in
      // `order`, but appending the leftovers guarantees a curated local office (e.g.
      // a Mayor) can never be silently dropped from the Local level just because a
      // new/edited race maps to a subhead key that isn't in the fixed list.
      var renderKeys = order.slice();
      Object.keys(groups).forEach(function(k) { if (renderKeys.indexOf(k) === -1) renderKeys.push(k); });
      renderKeys.forEach(function(k) {
        var g = groups[k];
        if (!g) return;
        var cards = g.seats.map(function(o) { return _myteamLocalSeatCard(o.seat, o.meta, sel); }).join('');
        html += '<div class="myteam-local-sub">' +
            '<div class="myteam-local-subhead">' + g.label + '<span class="myteam-local-subcount">' + g.seats.length + '</span></div>' +
            '<div class="myteam-cockpit-seats">' + cards + '</div>' +
          '</div>';
      });
      return html;
    }
    function _myteamCockpitPanelHead(lv, c) {
      var frac = c
        ? '<span class="myteam-cockpit-panelcount ' + (c.total > 0 && c.filled >= c.total ? 'is-full' : (c.filled > 0 ? 'is-partial' : '')) + '">' + c.filled + ' of ' + c.total + ' filled</span>'
        : '';
      return '<div class="myteam-cockpit-panelhead" style="--panel-accent:' + lv.accent + ';">' +
          '<span class="myteam-cockpit-panelico">' + lv.ico + '</span>' +
          '<span class="myteam-cockpit-paneltitle">' + lv.label + '</span>' +
          frac +
        '</div>';
    }
    // ── The office-category strip, on a phone ────────────────────────────────
    // At ≤880px the level sidebar folds into one horizontal row. On a phone that
    // row is wider than the screen, and it used to show one full chip plus a
    // clipped sliver of the next with nothing saying the sliver was reachable —
    // so a first-time voter could work the Federal seats and never learn that
    // Statewide, State Legislative and Local groups were sitting off-screen.
    //
    // Three affordances fix that, and all three are driven from the strip's own
    // scroll metrics rather than assumed: the chips are sized to a fraction of
    // the visible track so the next one is always half-shown, a chevron sits on
    // each side, and a dot per group states how many groups there are. The whole
    // affordance row only appears when the strip genuinely overflows — on a
    // desktop, where the nav is a vertical sidebar, `scrollWidth` never exceeds
    // `clientWidth`, so nothing here shows and nothing about that layout moves.
    function _myteamNavEl() { return document.getElementById('myteam-cockpit-nav'); }

    // One place that moves the strip, so the OS "reduce motion" setting is
    // honoured on every route in — CSS scroll-behavior cannot reach a
    // programmatic scrollTo that asks for smooth explicitly.
    function _myteamNavGo(nav, to, instant) {
      // Clamp rather than trusting the scroller to: the non-smooth fallback below
      // assigns scrollLeft straight, and the arrows' dead/live state is read back
      // off this number a frame later.
      var max = Math.max(0, (nav.scrollWidth || 0) - (nav.clientWidth || 0));
      to = Math.max(0, Math.min(max, to));
      var calm = !!instant;
      try { calm = calm || !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) {}
      try { nav.scrollTo({ left: to, behavior: calm ? 'auto' : 'smooth' }); }
      catch (e2) { nav.scrollLeft = to; }
    }

    // Read the strip and tell the chrome what it found. This is the single place
    // that decides whether the arrows exist, which of them is live, and which dot
    // is lit — every other function below just calls it.
    function _myteamNavSync() {
      var nav = _myteamNavEl();
      if (!nav) return;
      var wrap = (nav.closest && nav.closest('.myteam-cockpit-navwrap')) ||
        (nav.parentNode && nav.parentNode.parentNode);
      // A strip that fits needs no chevrons: showing them dead would be chrome
      // promising a move it cannot make.
      var max = (nav.scrollWidth || 0) - (nav.clientWidth || 0);
      var can = max > 4;
      if (wrap && wrap.classList) wrap.classList.toggle('is-scroll', can);
      var x = nav.scrollLeft || 0;
      var arrows = document.querySelectorAll('.myteam-cockpit-navarrow');
      for (var i = 0; i < arrows.length; i++) {
        var back = arrows[i].getAttribute('data-dir') === '-1';
        var dead = !can || (back ? x <= 2 : x >= max - 2);
        arrows[i].disabled = dead;
        arrows[i].setAttribute('aria-disabled', dead ? 'true' : 'false');
      }
    }
    // Scroll listeners fire far faster than layout can answer, and every sync
    // reads scrollWidth — so coalesce to one read per frame.
    var _myteamNavRaf = 0;
    function _myteamNavSyncSoon() {
      if (_myteamNavRaf) return;
      // Claim the slot before scheduling, not after: a scheduler that runs the
      // callback synchronously would otherwise clear the flag first and have it
      // set right back, wedging every later sync out.
      _myteamNavRaf = 1;
      var raf = window.requestAnimationFrame || function (f) { return setTimeout(f, 16); };
      raf(function () { _myteamNavRaf = 0; _myteamNavSync(); });
    }
    // One chevron press moves most of a screen but deliberately not all of it:
    // leaving a chip behind keeps the reader oriented instead of teleporting them
    // into an unfamiliar stretch of the row.
    window._myteamNavPage = function(dir) {
      var nav = _myteamNavEl();
      if (!nav) return;
      var step = Math.max(140, Math.round((nav.clientWidth || 0) * 0.8));
      var to = (nav.scrollLeft || 0) + (dir < 0 ? -step : step);
      _myteamNavGo(nav, to);
      _myteamNavSyncSoon();
    };
    // Bring a chip fully into view without touching the page's own scroll — the
    // strip is nudged by hand rather than with scrollIntoView, which on a nested
    // horizontal scroller also drags the whole document sideways.
    function _myteamNavReveal(id, instant) {
      var nav = _myteamNavEl();
      if (!nav || !nav.querySelector) return;
      var chip = nav.querySelector('.myteam-cockpit-navitem[data-level="' + id + '"]');
      if (!chip) return;
      var pad = 12;
      var left = chip.offsetLeft - pad;
      var right = chip.offsetLeft + chip.offsetWidth + pad;
      var view = nav.scrollLeft || 0;
      var to = view;
      if (left < view) to = left;
      else if (right > view + nav.clientWidth) to = right - nav.clientWidth;
      if (to !== view) _myteamNavGo(nav, to, instant);
      _myteamNavSyncSoon();
    }
    // The cockpit is rebuilt with innerHTML on every pick, so the listeners hang
    // off the grid that survives those rebuilds. Scroll does not bubble; the
    // capture phase is how one handler covers a strip it will outlive.
    function _myteamNavArm() {
      if (window._myteamNavArmed) return;
      var root = document.getElementById('myteam-slots-grid');
      if (!root || !root.addEventListener) return;
      window._myteamNavArmed = true;
      root.addEventListener('scroll', function(e) {
        var t = e && e.target;
        if (t && t.classList && t.classList.contains('myteam-cockpit-nav')) _myteamNavSyncSoon();
      }, true);
      if (window.addEventListener) {
        window.addEventListener('resize', function() { _myteamNavSyncSoon(); });
        window.addEventListener('orientationchange', function() { _myteamNavSyncSoon(); });
      }
    }
    // Called by the renderer once the strip is actually in the document.
    window._myteamNavBoot = function() {
      _myteamNavArm();
      _myteamNavSync();
      // The strip is brand new on every repaint, so restoring the voter's group
      // is a jump, not a journey — animating a rebuild reads as the row moving
      // by itself.
      try { _myteamNavReveal(window._myteamActiveLevel, true); } catch (e) {}
      // One more read after the frame settles. Web fonts and the section's
      // fade-in can both land after this call, and a strip measured mid-settle
      // can report itself as fitting when it does not.
      try { setTimeout(_myteamNavSync, 300); } catch (e2) {}
    };

    // Switch the visible level. Toggles nav highlight + panel visibility without a
    // full rebuild, and remembers the choice so repaints keep the voter's place.
    window._myteamSelectLevel = function(id) {
      window._myteamActiveLevel = id;
      var root = document.getElementById('myteam-slots-grid');
      if (!root) return;
      root.querySelectorAll('.myteam-cockpit-navitem').forEach(function(b) {
        var on = b.getAttribute('data-level') === id;
        b.classList.toggle('is-active', on);
        b.setAttribute('aria-selected', on ? 'true' : 'false');
      });
      root.querySelectorAll('.myteam-cockpit-panel').forEach(function(p) {
        var on = p.getAttribute('data-level') === id;
        p.hidden = !on;
        p.classList.toggle('is-active', on);
      });
      // The pager is a second way in, so it has to answer to the first: picking a
      // chip lights its dot, and picking a dot scrolls its chip back into view.
      root.querySelectorAll('.myteam-cockpit-navdot').forEach(function(d) {
        var on = d.getAttribute('data-level') === id;
        d.classList.toggle('is-on', on);
        d.setAttribute('aria-current', on ? 'true' : 'false');
      });
      _myteamNavReveal(id);
    };
    // Build the whole cockpit (nav + stage) from the already-bucketed seat groups.
    function _myteamRenderCockpit(slotsByGroup) {
      // Move any legacy single-"local" pick onto its real per-seat key before we
      // read selections, so every Local badge/header/card below sees the new shape.
      _myteamMigrateLocalPick();
      var localSel = _getTeamBallotSelections();
      var levels = _MYTEAM_COCKPIT_LEVELS.map(function(lv) {
        var items = (slotsByGroup && slotsByGroup[lv.group]) || [];
        var localSeats = (lv.id === 'local') ? _myteamLocalSeats() : [];
        return { lv: lv, items: items, localSeats: localSeats, present: (lv.id === 'local') || items.length > 0 };
      }).filter(function(x) { return x.present; });
      if (!levels.length) return '';

      var active = window._myteamActiveLevel;
      if (!levels.some(function(x) { return x.lv.id === active; })) {
        active = levels[0].lv.id;
        window._myteamActiveLevel = active;
      }

      var nav = levels.map(function(x) {
        var badge, cls;
        if (x.lv.id === 'local') {
          var lc = _myteamLocalCounts(x.localSeats, localSel);
          badge = lc.total ? (lc.filled + '/' + lc.total) : 'Soon';
          cls = lc.total && lc.filled >= lc.total ? 'is-full' : (lc.filled > 0 ? 'is-partial' : '');
        } else {
          var filled = x.items.filter(function(it) { return it.pid; }).length;
          badge = filled + '/' + x.items.length;
          cls = (x.items.length > 0 && filled >= x.items.length) ? 'is-full' : (filled > 0 ? 'is-partial' : '');
        }
        var on = x.lv.id === active;
        return '<button type="button" role="tab" aria-selected="' + (on ? 'true' : 'false') + '" ' +
            'class="myteam-cockpit-navitem' + (on ? ' is-active' : '') + '" data-level="' + x.lv.id + '" ' +
            'style="--nav-accent:' + x.lv.accent + ';" onclick="window._myteamSelectLevel(\'' + x.lv.id + '\')">' +
            '<span class="myteam-cockpit-navico">' + x.lv.ico + '</span>' +
            '<span class="myteam-cockpit-navtxt">' +
              '<span class="myteam-cockpit-navlabel">' + x.lv.label + '</span>' +
              '<span class="myteam-cockpit-navsub">' + x.lv.sub + '</span>' +
            '</span>' +
            '<span class="myteam-cockpit-navcount ' + cls + '">' + badge + '</span>' +
          '</button>';
      }).join('');

      var panels = levels.map(function(x) {
        var on = x.lv.id === active;
        var head, body;
        if (x.lv.id === 'local') {
          var lpc = _myteamLocalCounts(x.localSeats, localSel);
          head = _myteamCockpitPanelHead(x.lv, lpc.total ? lpc : null);
          body = _myteamLocalStageHtml(x.localSeats);
        } else {
          var filled = x.items.filter(function(it) { return it.pid; }).length;
          head = _myteamCockpitPanelHead(x.lv, { filled: filled, total: x.items.length });
          var cards = x.items.map(function(it) {
            if (window.PDX_SEAT_CARDS !== false && typeof _renderSeatCard === 'function') {
              try { var seat = _renderSeatCard(it.pos, it.pid); if (seat) return seat; } catch (e) {}
            }
            return it.pid ? _renderSlotCard(it.pos, it.pid) : _renderSlotEmpty(it.pos);
          }).join('');
          // On phones the seats become a horizontal swipe strip (see the
          // ≤640px cockpit CSS). Cue the gesture when the level holds more than
          // one seat; hidden on wider screens where the grid shows them all.
          var swipe = x.items.length > 1
            ? '<div class="myteam-cockpit-swipe" aria-hidden="true"><span>←</span> Swipe seats <span>→</span></div>'
            : '';
          body = swipe + '<div class="myteam-cockpit-seats">' + cards + '</div>';
        }
        return '<section class="myteam-cockpit-panel' + (on ? ' is-active' : '') + '" data-level="' + x.lv.id + '" ' +
            'role="tabpanel"' + (on ? '' : ' hidden') + ' style="--panel-accent:' + x.lv.accent + ';">' +
            head + body +
          '</section>';
      }).join('');

      return '<div class="myteam-cockpit">' +
          _myteamNavShellHtml(nav, levels, active) +
          '<div class="myteam-cockpit-stage">' + panels + '</div>' +
        '</div>';
    }

    // The strip plus the three things that say it is a strip. On desktop the wrap
    // is an ordinary sticky sidebar and the cue, chevrons and dots are all dark,
    // because nothing sets `.is-scroll` when the nav is a vertical column.
    function _myteamNavShellHtml(nav, levels, active) {
      var n = levels.length;
      var arrow = function(dir, label, glyph) {
        return '<button type="button" class="myteam-cockpit-navarrow" data-dir="' + dir + '" ' +
            'aria-controls="myteam-cockpit-nav" aria-label="' + label + '" ' +
            'onclick="window._myteamNavPage(' + dir + ')">' + glyph + '</button>';
      };
      // Say the number out loud. The whole failure this fixes is a voter not
      // knowing the other groups exist, and "4 office groups" states it in the
      // one glance the strip gets — while naming OFFICES, not seats, so it can't
      // be read as the "0 of 6 filled" count the stage carries a few lines below.
      var cue = n > 1
        ? '<div class="myteam-cockpit-navcue"><span aria-hidden="true">‹</span>' +
            'Swipe or tap the arrows — ' + n + ' office groups' +
            '<span aria-hidden="true">›</span></div>'
        : '';
      var dots = n > 1
        ? '<div class="myteam-cockpit-navdots">' + levels.map(function(x, i) {
            var on = x.lv.id === active;
            return '<button type="button" class="myteam-cockpit-navdot' + (on ? ' is-on' : '') + '" ' +
                'data-level="' + x.lv.id + '" style="--nav-accent:' + x.lv.accent + ';" ' +
                'aria-current="' + (on ? 'true' : 'false') + '" ' +
                'aria-label="' + x.lv.label + ' — office group ' + (i + 1) + ' of ' + n + '" ' +
                'onclick="window._myteamSelectLevel(\'' + x.lv.id + '\')"><i></i></button>';
          }).join('') + '</div>'
        : '';
      return '<div class="myteam-cockpit-navwrap">' +
          cue +
          '<div class="myteam-cockpit-navrow">' +
            (n > 1 ? arrow(-1, 'Scroll back through the office groups', '‹') : '') +
            '<nav class="myteam-cockpit-nav" id="myteam-cockpit-nav" role="tablist" aria-label="Ballot levels">' + nav + '</nav>' +
            (n > 1 ? arrow(1, 'Scroll forward through the office groups', '›') : '') +
          '</div>' +
          dots +
        '</div>';
    }

    function _renderTeamDistrictCoverage(ballotSelections, filledCount) {
      var box = document.getElementById('myteam-district-coverage');
      if (!box) return;
      // Consolidation: the grouped team grid below — with its dedicated "Your
      // Districts" group, real district numbers, and per-seat covered/open state —
      // now carries everything this standalone coverage map used to show. It is
      // suppressed so the same information isn't repeated twice down the page,
      // which is the single biggest scroll saving on mobile.
      box.style.display = 'none'; box.innerHTML = '';
      return;
      var positions = window.TEAM_POSITIONS || [];
      if (!positions.length) { box.style.display = 'none'; box.innerHTML = ''; return; }

      function _isOn(pos) {
        var pid = ballotSelections[pos.key];
        return !!(pid && CMP_DATA[pid]);
      }

      // How many candidates the voter actually has running for an office on their
      // own slate — read from the freshly-bucketed "Relevant to Me" field so the
      // coverage view can tell them what's WAITING in each open race ("3 running")
      // rather than a generic "tap to fill". 0 when the slate hasn't rendered yet
      // or the race has no field; the UI degrades to a plain prompt in that case.
      function _fieldCount(key) {
        try {
          return ((window._relevantLastOfficeGroups && window._relevantLastOfficeGroups[key]) || [])
            .filter(function(pid) { return CMP_DATA[pid]; }).length;
        } catch (e) { return 0; }
      }

      // Render a single seat as a tappable coverage chip. A seat is "covered" when
      // the voter has a pick saved for that office; tapping it jumps straight to the
      // matching race so closing a gap is always one tap away. District-based seats
      // carry their real district number in the scope line when we know it, and an
      // open district seat is flagged "Missing" (vs a plain "Open" statewide/local
      // seat) so the voter sees at a glance which of THEIR districts still need a pick.
      function _seatHtml(pos) {
        var pid = ballotSelections[pos.key];
        var d = pid ? CMP_DATA[pid] : null;
        var on = !!d;
        var isDistrict = !!_MYTEAM_DISTRICT_KEYS[pos.key];
        var scope = _myteamSeatScope(pos.key);
        var cls = on ? 'is-covered' : (isDistrict ? 'is-open is-missing' : 'is-open');
        var nm = on ? (d.name || 'On your team').replace(/"/g, '&quot;') : '';
        var badge = on
          ? '<span class="myteam-dcov-badge is-covered">✓ Covered</span>'
          : (isDistrict
              ? '<span class="myteam-dcov-badge is-missing">Missing</span>'
              : '<span class="myteam-dcov-badge is-open">Open</span>');
        var status = on
          ? '<span class="myteam-dcov-pick">' + nm + '</span>'
          : '<span class="myteam-dcov-go">' + (function() {
              var fc = _fieldCount(pos.key);
              return fc > 1 ? fc + ' running — tap to compare →' : (fc === 1 ? '1 running — tap to add →' : 'Tap to fill this seat →');
            })() + '</span>';
        var title = on
          ? nm + ' — your ' + pos.label + ' pick (tap to review or swap)'
          : 'Jump to the ' + pos.label + ' race and add your pick';
        return '<button type="button" class="myteam-dcov-seat ' + cls + '" title="' + title + '" ' +
            'onclick="window.jumpToRelevantAccordion(\'' + pos.key + '\')">' +
            '<span class="myteam-dcov-ico">' + (pos.icon || '\u{1F3DB}') + '</span>' +
            '<span class="myteam-dcov-seat-body">' +
              '<span class="myteam-dcov-office">' + pos.label + '</span>' +
              '<span class="myteam-dcov-scope">' + scope + '</span>' +
              '<span class="myteam-dcov-status">' + status + '</span>' +
            '</span>' +
            badge +
          '</button>';
      }

      function _coveredCount(list) { return list.filter(_isOn).length; }
      function _firstOpen(list) {
        for (var i = 0; i < list.length; i++) { if (!_isOn(list[i])) return list[i]; }
        return null;
      }

      // The voter's OWN voting districts — the geographically specific seats that
      // only people who live there elect (their U.S. House, State Senate & State
      // House districts). These get top billing because "which of MY districts have
      // I covered" is the motivating question this whole view answers.
      var districtSeats = positions.filter(function(p) { return _MYTEAM_DISTRICT_KEYS[p.key]; });
      var distCovered = _coveredCount(districtSeats);
      var distTotal = districtSeats.length;
      var distDone = distTotal > 0 && distCovered >= distTotal;
      // The voter's own districts that still need a pick — the gaps this view exists
      // to close. Drives the focused "finish your districts" action list and lets us
      // skip the generic bottom CTA when those per-district actions are already shown.
      var openDistrictSeats = districtSeats.filter(function(p) { return !_isOn(p); });

      var total = positions.length;
      var covered = _coveredCount(positions);
      var pct = total ? Math.round(covered / total * 100) : 0;
      var done = covered >= total;

      // Prefer steering the voter at an open DISTRICT seat first — those are the
      // races unique to them — then fall back to any remaining gap on the slate.
      var firstOpen = _firstOpen(districtSeats) || _firstOpen(positions);

      function _openLabel(pos) {
        var s = _myteamSeatScope(pos.key);
        return pos.label + (s.indexOf('District') === 0 ? ' (' + s + ')' : '');
      }

      // Which ballot tiers (Federal · State · Local) actually exist on this slate,
      // and which are fully covered. Drives both the per-tier celebration badges and
      // the "you've already locked in your federal seats" framing in the guidance.
      function _levelSeats(id) { return positions.filter(function(p) { return _myteamSeatLevel(p.key) === id; }); }
      var presentLevels = _MYTEAM_LEVELS.filter(function(l) { return _levelSeats(l.id).length > 0; });
      var completedLevels = presentLevels.filter(function(l) { return _levelSeats(l.id).every(_isOn); });
      function _joinWords(arr) {
        if (arr.length <= 1) return arr.join('');
        if (arr.length === 2) return arr[0] + ' &amp; ' + arr[1];
        return arr.slice(0, -1).join(', ') + ' &amp; ' + arr[arr.length - 1];
      }

      // Group the grid so the voter's OWN voting districts lead, then the seats
      // they share with the rest of the state/nation. The district seats (the ones
      // unique to this address) get a dedicated spotlight band so "which of MY
      // districts have I covered" is answered first; the remaining seats fall into
      // their Federal · State · Local tiers below. _levelSeats (above) still counts
      // ALL seats for the encouragement copy, so a level reads as "covered" only
      // when every seat in it — district or not — is filled.
      function _sharedLevelSeats(id) { return positions.filter(function(p) { return !_MYTEAM_DISTRICT_KEYS[p.key] && _myteamSeatLevel(p.key) === id; }); }
      function _groupHtml(level) {
        var list = _sharedLevelSeats(level.id);
        if (!list.length) return '';
        var c = _coveredCount(list);
        var allDone = c >= list.length;
        var fracCls = allDone ? 'myteam-dcov-groupfrac is-done' : 'myteam-dcov-groupfrac';
        var fracTxt = allDone ? '✓ All ' + list.length + ' covered' : c + '/' + list.length + ' covered';
        return '<div class="myteam-dcov-group' + (allDone ? ' is-done' : '') + '">' +
            '<div class="myteam-dcov-grouphead">' +
              '<span class="myteam-dcov-grouptitle">' + level.title + '</span>' +
              '<span class="' + fracCls + '">' + fracTxt + '</span>' +
            '</div>' +
            '<div class="myteam-dcov-grid">' + list.map(_seatHtml).join('') + '</div>' +
          '</div>';
      }

      // The spotlight band for the voter's own voting districts. Rendered first and
      // styled distinctly (amber/blue, green once complete) so it reads as the
      // headline of the whole coverage view, not just another row.
      function _districtBandHtml() {
        if (!districtSeats.length) return '';
        var fracCls = distDone ? 'myteam-dcov-groupfrac is-done' : 'myteam-dcov-groupfrac';
        var fracTxt = distDone ? '✓ All ' + distTotal + ' covered' : distCovered + '/' + distTotal + ' covered';
        var note = distDone
          ? 'Every seat only your address elects now has your pick. 🎉'
          : 'The seats <strong>only your address elects</strong> — fill these first.';
        return '<div class="myteam-dcov-group is-districts' + (distDone ? ' is-done' : '') + '">' +
            '<div class="myteam-dcov-grouphead">' +
              '<span class="myteam-dcov-grouptitle">📍 Your Voting Districts</span>' +
              '<span class="' + fracCls + '">' + fracTxt + '</span>' +
            '</div>' +
            '<div class="myteam-dcov-districts-note">' + note + '</div>' +
            '<div class="myteam-dcov-grid">' + districtSeats.map(_seatHtml).join('') + '</div>' +
            _districtMovesHtml() +
          '</div>';
      }

      // Focused "finish your districts" action list. For each of the voter's own
      // voting districts still missing a pick, it spells out the seat, its real
      // district number, and how many candidates are running there — then offers two
      // one-tap moves: jump straight into that race to ADD a pick, or COMPARE the
      // whole field first. This turns the abstract "you're missing a district" into
      // a concrete, do-it-now checklist that lands the voter inside the right
      // district view. Only shown while a district seat is still open.
      function _districtMovesHtml() {
        if (!openDistrictSeats.length) return '';
        var rows = openDistrictSeats.map(function(pos) {
          var scope = _myteamSeatScope(pos.key);
          var fc = _fieldCount(pos.key);
          var meta = scope + (fc > 0 ? ' · ' + fc + ' candidate' + (fc === 1 ? '' : 's') + ' running' : ' · field still forming');
          var add = '<button type="button" class="myteam-dcov-cta dcov-move-btn" onclick="window.jumpToRelevantAccordion(\'' + pos.key + '\')">➕ Add</button>';
          var cmp = fc > 1
            ? '<button type="button" class="myteam-dcov-cta is-compare dcov-move-btn" onclick="window._relevantCompareOffice && window._relevantCompareOffice(\'' + pos.key + '\')">⚖️ Compare ' + fc + '</button>'
            : '';
          return '<div class="myteam-dcov-move">' +
              '<span class="myteam-dcov-ico">' + (pos.icon || '\u{1F3DB}') + '</span>' +
              '<span class="dcov-move-body">' +
                '<span class="dcov-move-office">' + pos.label + '</span>' +
                '<span class="dcov-move-meta">' + meta + '</span>' +
              '</span>' +
              '<span class="dcov-move-actions">' + add + cmp + '</span>' +
            '</div>';
        }).join('');
        var head = openDistrictSeats.length === distTotal
          ? '🎯 Start with your districts — ' + openDistrictSeats.length + ' to fill'
          : '🎯 Finish your districts — ' + openDistrictSeats.length + ' still open';
        return '<div class="myteam-dcov-moves">' +
            '<div class="myteam-dcov-moves-head">' + head + '</div>' +
            rows +
          '</div>';
      }
      var groupsHtml = _districtBandHtml() + _MYTEAM_LEVELS.map(_groupHtml).join('');

      // Gentle, level- and district-aware guidance that always names the single next
      // gap, and — crucially — credits what's already done so building reads as
      // progress, not a checklist of failures. When whole tiers are covered it opens
      // with "You've covered your federal seats — now…"; when the gap is the last
      // open seat in its level it frames the action as completing that tier; when it's
      // one of the voter's own voting districts it's framed in district terms.
      var msg, cta = '';
      if (done) {
        msg = '\u{1F389} <strong>Every seat on your ballot has a pick</strong>' + (distTotal ? ', including all ' + distTotal + ' of your voting districts' : '') + '. Compare your slate below to weigh your picks side by side.';
      } else if (firstOpen) {
        var lvlId = _myteamSeatLevel(firstOpen.key);
        var lvl = _MYTEAM_LEVELS.filter(function(l) { return l.id === lvlId; })[0];
        var lvlSeats = _levelSeats(lvlId);
        var lvlOpen = lvlSeats.filter(function(p) { return !_isOn(p); }).length;
        var inDistrict = !!_MYTEAM_DISTRICT_KEYS[firstOpen.key];
        var openCount = total - covered;

        // Credit any tiers the voter has already fully covered (excluding the one the
        // next gap lives in) — this is what turns the nudge into encouragement.
        var doneWords = completedLevels
          .filter(function(l) { return l.id !== lvlId; })
          .map(function(l) { return l.word; });
        var praise = doneWords.length
          ? '\u{2705} You’ve covered your <strong>' + _joinWords(doneWords) + '</strong> seats — '
          : '';

        var lead;
        if (!inDistrict && lvl && lvlSeats.length > 1 && lvlOpen === 1) {
          lead = (praise ? 'now add your ' : 'Add your ') + '<span class="dcov-open">' + _openLabel(firstOpen) + '</span> to complete your <strong>' + lvl.word + '</strong> coverage.';
        } else if (inDistrict) {
          lead = (praise ? 'now fill your ' : 'You still need someone from your ') + '<span class="dcov-open">' + _openLabel(firstOpen) + '</span>.';
        } else if (covered === 0) {
          lead = 'Nothing covered yet — start with your <span class="dcov-open">' + _openLabel(firstOpen) + '</span>.';
        } else {
          lead = (praise ? 'next, add your ' : '<strong>' + covered + ' of ' + total + '</strong> seats covered — add your ') + '<span class="dcov-open">' + _openLabel(firstOpen) + '</span>' + (praise ? '.' : ' next.');
        }
        msg = praise + lead + (openCount > 1 ? ' <span class="myteam-dcov-msg-more">' + (openCount - 1) + ' more after that.</span>' : '') + ' Tap the seat to compare the field and add your pick — it saves as you go.';
        // Two clear next actions on the central hub: jump straight to the open race
        // to add a pick, or — when that seat actually has a field — weigh everyone
        // running side-by-side first. The second button mirrors the "Relevant to Me"
        // coverage strip so "compare before you commit" is offered consistently in
        // both the discovery and team-management views.
        var _foField = [];
        try { _foField = (window._relevantLastOfficeGroups && window._relevantLastOfficeGroups[firstOpen.key]) || []; } catch (e) {}
        var _foHasField = _foField.filter(function(pid) { return CMP_DATA[pid]; }).length > 1;
        // When the next gap is one of the voter's own districts, the focused
        // "finish your districts" list above already offers per-district Add /
        // Compare actions — so we skip this duplicate bottom CTA and let the
        // narrative line stand alone. The bottom CTA is reserved for the case where
        // every district is covered and only a statewide/local seat remains.
        if (!openDistrictSeats.length) {
          cta = '<div class="myteam-dcov-cta-row">' +
              '<button type="button" class="myteam-dcov-cta" onclick="window.jumpToRelevantAccordion(\'' + firstOpen.key + '\')">➕ Add your ' + firstOpen.label + ' pick</button>' +
              (_foHasField ? '<button type="button" class="myteam-dcov-cta is-compare" onclick="window._relevantCompareOffice && window._relevantCompareOffice(\'' + firstOpen.key + '\')">⚖️ Compare the field first</button>' : '') +
            '</div>';
        }
      }

      // Standout milestone: all of the voter's OWN voting districts are filled, even
      // if statewide/local seats remain. This is the achievement the whole view is
      // built around, so it gets its own celebratory banner.
      var milestone = '';
      if (distTotal && distDone && !done) {
        milestone = '<div class="myteam-dcov-milestone">\u{1F3AF} <strong>All ' + distTotal + ' of your voting districts are covered.</strong> Every seat only you can elect now has your pick — finish the slate by filling the statewide &amp; local seats below.</div>';
      }

      // When no area is set we can't show real district numbers — offer a one-tap
      // way to set it so the seats fill in with the voter's actual districts.
      var locNudge = '';
      if (!window._hasUserLocation) {
        locNudge = '<div class="myteam-dcov-locnudge"><span>\u{1F4CD} Set your area to see your exact district numbers.</span>' +
          '<button type="button" onclick="window.toggleChangeLocation && window.toggleChangeLocation()">Set your location</button></div>';
      }

      // District-focused sub-stat in the header so the motivating question — how many
      // of MY voting districts are filled — is answered up top, no matter how the
      // grid below is grouped.
      var distFrac = distTotal
        ? '<span class="myteam-dcov-frac myteam-dcov-distfrac' + (distDone ? ' is-done' : '') + '">\u{1F4CD} ' + distCovered + ' of ' + distTotal + ' voting districts</span>'
        : '';

      // Circular coverage ring — a dashboard-style at-a-glance read on overall
      // completion that makes the section feel like a workspace cockpit, not a list.
      var ringCls = 'myteam-dcov-ring' + (done ? ' is-complete' : '');
      var ringHtml = '<div class="' + ringCls + '" style="--pct:' + pct + ';" aria-hidden="true">' +
          '<span class="myteam-dcov-ring-num">' + pct + '<small>%</small></span>' +
        '</div>';

      box.classList.toggle('is-complete', done);
      box.innerHTML =
        '<div class="myteam-dcov-top">' +
          ringHtml +
          '<div class="myteam-dcov-headtext">' +
            '<div class="myteam-dcov-head">' +
              '<span class="myteam-dcov-title">\u{1F5FA}\u{FE0F} Your District Coverage</span>' +
              '<span class="myteam-dcov-frac">' + covered + ' of ' + total + ' seats covered</span>' +
              distFrac +
            '</div>' +
            '<div class="myteam-dcov-bar"><div class="myteam-dcov-fill" style="width:' + pct + '%;"></div></div>' +
          '</div>' +
        '</div>' +
        milestone +
        groupsHtml +
        '<p class="myteam-dcov-msg">' + msg + '</p>' +
        cta +
        locNudge;
      box.style.display = '';
    }

    // Sync the persistent "Your Team" progress bar pinned at the top of Relevant
    // to Me. Reads the live ballot (location-aware via TEAM_POSITIONS) and shows
    // the filled count, a progress ring, and the single most useful next move —
    // naming the next still-open seat, or celebrating a complete slate. Keeps the
    // research section visibly tied to the one builder above without a scroll.
    window._relSyncTeamProgress = function() {
      var bar = document.getElementById('rel-team-progress');
      if (!bar) return;
      var positions = window.TEAM_POSITIONS || [];
      var total = positions.length || 6;
      var sel;
      try { sel = (typeof _getTeamBallotSelections === 'function') ? _getTeamBallotSelections() : (window._ballotLoad ? window._ballotLoad() : {}); }
      catch (e) { sel = {}; }
      var filled = 0, nextOpen = null;
      positions.forEach(function(pos) {
        if (sel[pos.key] && (typeof CMP_DATA === 'undefined' || CMP_DATA[sel[pos.key]])) filled++;
        else if (!nextOpen) nextOpen = pos;
      });
      var complete = total > 0 && filled >= total;
      var pct = total > 0 ? Math.round(filled / total * 100) : 0;

      var ring = document.getElementById('rel-team-progress-ring');
      var frac = document.getElementById('rel-team-progress-frac');
      var next = document.getElementById('rel-team-progress-next');
      if (ring) ring.style.setProperty('--rel-pct', pct);
      if (frac) frac.textContent = filled + '/' + total;
      bar.classList.toggle('is-complete', complete);

      if (next) {
        if (complete) {
          next.innerHTML = '🎉 <strong>All ' + total + ' seats filled.</strong> Head up to review, compare &amp; finalize your slate.';
        } else if (filled === 0) {
          next.innerHTML = 'No picks yet — add your first candidate below and it lands in your team up top.';
        } else if (nextOpen) {
          next.innerHTML = '<strong>' + filled + ' of ' + total + ' picked.</strong> Next open seat: <strong>' + nextOpen.label + '</strong> — add a pick below, or manage your team up top.';
        } else {
          next.innerHTML = '<strong>' + filled + ' of ' + total + ' picked.</strong> Manage your team up top.';
        }
      }

      // In-view add confirmation: when a pick was just added, the My Voting Team
      // panel is usually scrolled off-screen above, so bump this persistent bar
      // (and pop its ring) to make the team status visibly react right where the
      // voter is acting. Guarded by the just-added pid so it fires once per new
      // pick — not on every unrelated repaint within the highlight window.
      var justPid = window._pdxJustFilledPid;
      var justOnTeam = justPid && positions.some(function(p) { return sel[p.key] === justPid; });
      if (justOnTeam && bar._relLastBumpPid !== justPid) {
        bar._relLastBumpPid = justPid;
        bar.classList.remove('rel-team-progress--bump');
        void bar.offsetWidth;
        bar.classList.add('rel-team-progress--bump');
        if (bar._relBumpTimer) clearTimeout(bar._relBumpTimer);
        bar._relBumpTimer = setTimeout(function() { bar.classList.remove('rel-team-progress--bump'); }, 1600);
      } else if (!justPid) {
        bar._relLastBumpPid = null;
      }
    };

    function _mypolBuildGrid() {
      var slotsGrid = document.getElementById('myteam-slots-grid');
      var teamEmpty = document.getElementById('myteam-empty');
      var teamStats = document.getElementById('myteam-stats');
      var teamCountBadge = document.getElementById('myteam-count-badge');
      var compareBar = document.getElementById('myteam-compare-bar');
      var compareTopBtn = document.getElementById('myteam-compare-top-btn');
      var ballotTopBtn = document.getElementById('myteam-ballot-top-btn');
      var compareCta = document.getElementById('myteam-compare-team-cta');
      var alignmentBar = document.getElementById('myteam-alignment-bar');
      var evidenceBar = document.getElementById('myteam-evidence-bar');

      // Keep the section-level alignment prompt in sync every time the builder
      // repaints (team change, alignment change, or location change all route here).
      _myteamRenderAlignPrompt();

      // Run the one-time per-seat local migration before reading, so the counts and
      // progress bar below reflect the new shape on the very first paint.
      if (typeof _myteamMigrateLocalPick === 'function') _myteamMigrateLocalPick();

      var ballotSelections = _getTeamBallotSelections();
      // Local picks now live under per-seat keys (local_<raceKey>). The overall
      // slate still has a single "Local" slot, so treat it as filled by the voter's
      // first per-seat local pick when the legacy generic key is empty — this keeps
      // the top progress bar, pips and summary counting Local exactly as before,
      // without regressing now that local storage is per seat. Uses a shallow copy
      // so only this in-memory summary view is affected, never what's stored.
      if (!(ballotSelections.local && CMP_DATA[ballotSelections.local])
          && typeof _myteamFirstLocalPid === 'function') {
        var _localSlotPid = _myteamFirstLocalPid(ballotSelections);
        if (_localSlotPid) {
          ballotSelections = Object.assign({}, ballotSelections);
          ballotSelections.local = _localSlotPid;
        }
      }
      var filledPids = [];
      var filledCount = 0;
      // `totalScore` counts RESOLVED PLEDGES across the team, not points. The stat
      // tile above it used to average a pledge percentage over the slate, which is
      // an average of rates with different denominators — a number with no meaning
      // even before the rate itself was retired. Now the tile states how many
      // pledge receipts the team's records rest on, which is a fact.
      var totalScore = 0;
      var scoredCount = 0;

      var slotsByGroup = { federal: [], statewide: [], districts: [], local: [] };
      TEAM_POSITIONS.forEach(function(pos) {
        var pid = ballotSelections[pos.key];
        var d = pid ? CMP_DATA[pid] : null;
        if (d) {
          filledCount++;
          filledPids.push(pid);
          var _t = window._pdxPromiseTally(d);
          totalScore += _t.resolved; if (_t.resolved > 0) scoredCount++;
        }
        var g = (typeof _slotGroup === 'function') ? _slotGroup(pos.key) : 'statewide';
        if (!slotsByGroup[g]) slotsByGroup[g] = [];
        slotsByGroup[g].push({ pos: pos, pid: d ? pid : null });
      });

      // Expand the single generic "Local Office" slot into the voter's REAL local
      // seats so every seat-count readout below reflects the true ballot for their
      // location (Davis/Layton: Mayor, City Council, County Commission, Sheriff,
      // School Board …) rather than a fixed slate size. _myteamBallotCounts is the
      // one source the header badge, picks meter, progress bar/pips and the Voter
      // Hub path tracker all read from, so the "X of N" they show is always the
      // ballot the voter is actually looking at — and never a hardcoded "6". The
      // team's members / stats / alignment then run over this real filled set too,
      // so a voter with several local picks sees them all counted.
      var _counts = _myteamBallotCounts(ballotSelections);
      filledPids = _counts.pids.slice();
      filledCount = _counts.filled;
      totalScore = 0; scoredCount = 0;
      filledPids.forEach(function(_p) {
        var _d = CMP_DATA[_p]; if (!_d) return;
        var _t2 = window._pdxPromiseTally(_d);
        totalScore += _t2.resolved; if (_t2.resolved > 0) scoredCount++;
      });
      // Publish the live seat total so the section-level trackers (the "next step"
      // guide and the Voter Hub "Your Path" spine) read the same number this paint
      // computed instead of re-deriving a static TEAM_POSITIONS.length.
      window._myteamSeatTotal = _counts.total;

      // Render the slots tier by tier (Federal → Statewide → Your Districts →
      // Local) so the authoritative builder reads as an organized ballot. Each
      // level is now a distinct BAND — an accent-edged panel with a two-line
      // header (level name + who votes on it) and its own "filled/total" count —
      // so the whole screen scans top-to-bottom as the structure of the ballot.
      // Render the builder as a sidebar + stage cockpit: a calm left-hand level
      // nav (Federal · Statewide · State Legislative · Local) and a single main
      // stage that shows only the selected level's seats. Replaces the old
      // stacked vertical bands; the polished seat cards themselves are unchanged.
      var slotsHtml = _myteamRenderCockpit(slotsByGroup);

      if (slotsGrid) {
        slotsGrid.classList.remove('is-grouped');
        slotsGrid.classList.add('is-cockpit');
        slotsGrid.innerHTML = slotsHtml;
        // The category strip's chevrons and pager are driven by its real scroll
        // metrics, which only exist once the markup above is in the document.
        try { if (typeof window._myteamNavBoot === 'function') window._myteamNavBoot(); } catch (e) {}
      }
      // The old phone "swipe through your seats" hint described the flat strip the
      // cockpit replaces, so keep it out of the way.
      var _swipeHint = document.querySelector('#my-politicians .myteam-swipe-hint');
      if (_swipeHint) _swipeHint.style.display = 'none';

      // Keep the board headline personal & location-aware (their place / district).
      var focusTextEl = document.getElementById('myteam-slots-focus-text');
      if (focusTextEl && typeof _myteamFocusLine === 'function') {
        focusTextEl.innerHTML = _myteamFocusLine(filledCount, _counts.total);
      }

      // The "how to fill a seat" primer is for first-timers only — once a single
      // pick exists the voter has clearly found the add mechanic, so hide it to
      // shorten the section (the biggest scroll saving is on mobile).
      var howtoHint = document.getElementById('myteam-howto-hint');
      if (howtoHint) howtoHint.style.display = filledCount >= 1 ? 'none' : '';

      // Header completion progress — fill bar + per-slot pips (filled vs open).
      var progressFill = document.getElementById('myteam-progress-fill');
      var progressPips = document.getElementById('myteam-progress-pips');
      var progressLabel = document.getElementById('myteam-progress-label');
      var _teamTotal = _counts.total;
      if (progressFill) progressFill.style.width = Math.round(filledCount / (_teamTotal || 1) * 100) + '%';
      if (progressPips) {
        progressPips.innerHTML = _counts.seats.map(function(seat) {
          var on = seat.on;
          var c = seat.color || '#9fb4d4';
          var style = on
            ? 'background:' + c + '1f;border-color:' + c + '5c;color:' + c + ';'
            : 'background:rgba(255,255,255,0.025);border-color:rgba(255,255,255,0.09);color:#6b7f9e;';
          var dot = on
            ? 'background:' + c + ';box-shadow:0 0 7px ' + c + ';'
            : 'background:rgba(255,255,255,0.16);';
          return '<span class="myteam-progress-pip" style="' + style + '" title="' + seat.label + (on ? ' — filled' : ' — open') + '">' +
            '<span class="pip-dot" style="' + dot + '"></span>' + (on ? '✓ ' : '') + seat.label +
          '</span>';
        }).join('');
      }
      if (progressLabel) {
        progressLabel.textContent = filledCount >= _teamTotal
          ? '★ Your team is set — all ' + _teamTotal + ' seats filled'
          : filledCount + ' of ' + _teamTotal + ' seats filled';
        progressLabel.style.color = filledCount >= _teamTotal ? '#4ade80' : 'rgba(251,191,36,0.92)';
      }

      // Compact "picks set" meter under the title — a row of dots (one per seat,
      // lit as picks are committed) plus a plain "X of N picks set" readout. Same
      // filledCount as the bar above, so it stays perfectly in sync and live.
      var picksMeter = document.getElementById('myteam-picks-meter');
      var picksDots = document.getElementById('myteam-picks-dots');
      var picksText = document.getElementById('myteam-picks-text');
      var _done = _teamTotal > 0 && filledCount >= _teamTotal;
      if (picksDots) {
        var _dots = '';
        for (var _i = 0; _i < _teamTotal; _i++) {
          _dots += '<span class="myteam-picks-dot' + (_i < filledCount ? ' is-on' : '') + '"></span>';
        }
        picksDots.innerHTML = _dots;
      }
      if (picksText) {
        picksText.textContent = _done
          ? 'All ' + _teamTotal + ' picks set ✓'
          : filledCount + ' of ' + _teamTotal + ' picks set';
      }
      if (picksMeter) picksMeter.classList.toggle('is-complete', _done);

      if (filledCount > 0) {
        if (teamEmpty) teamEmpty.style.display = 'none';
        if (teamStats) teamStats.style.display = '';

        var avgEl = document.getElementById('myteam-stat-avg');
        var countEl = document.getElementById('myteam-stat-count');
        var officesEl = document.getElementById('myteam-stat-offices');
        var alignEl = document.getElementById('myteam-stat-align');
        if (avgEl) avgEl.textContent = totalScore > 0 ? String(totalScore) : '—';
        if (countEl) countEl.textContent = filledCount;
        if (officesEl) officesEl.textContent = filledCount + '/' + _counts.total;
        // Deliberately NOT colour-ramped. A count of receipts is neither good nor
        // bad news, and grading it green would re-create the retired score in
        // colour after removing it in text.
        if (avgEl) { avgEl.style.color = '#c8d7ee'; avgEl.style.textShadow = 'none'; }

        if (typeof _calcAlignmentScore === 'function' && typeof _alignIssues !== 'undefined' && _alignIssues && _alignIssues.size > 0) {
          var alignTotal = 0, alignCount = 0;
          filledPids.forEach(function(pid) {
            var as = _calcAlignmentScore(pid);
            if (as !== null) { alignTotal += as; alignCount++; }
          });
          if (alignCount > 0 && alignEl) {
            var avgAlign = Math.round(alignTotal / alignCount);
            alignEl.textContent = avgAlign + '%';
            alignEl.style.color = avgAlign >= 70 ? '#a78bfa' : avgAlign >= 50 ? '#c084fc' : '#f87171';
          } else if (alignEl) { alignEl.textContent = '—'; }

          if (alignmentBar && alignCount > 0) {
            var _ta = (typeof _calcTeamAlignment === 'function') ? _calcTeamAlignment(filledPids) : null;
            if (_ta && typeof _renderTeamAlignOverview === 'function') {
              alignmentBar.innerHTML = _renderTeamAlignOverview(_ta);
              alignmentBar.style.display = '';
            } else { alignmentBar.style.display = 'none'; }
          } else if (alignmentBar) { alignmentBar.style.display = 'none'; }
        } else {
          if (alignEl) alignEl.textContent = '—';
          if (alignmentBar) alignmentBar.style.display = 'none';
        }

        // My Team's Evidence — independent of alignment setup so the team-wide
        // "Browse team evidence" entry point still appears even when the visitor
        // hasn't picked issues yet (the per-issue chips need the alignment
        // aggregate, so they ride along only when it exists). Honesty-gating
        // lives inside _renderTeamEvidenceSection.
        if (evidenceBar) {
          var _taEv = (typeof _calcTeamAlignment === 'function') ? _calcTeamAlignment(filledPids) : null;
          var _evHtml = (typeof _renderTeamEvidenceSection === 'function')
            ? _renderTeamEvidenceSection(filledPids, _taEv) : '';
          if (_evHtml) { evidenceBar.innerHTML = _evHtml; evidenceBar.style.display = ''; }
          else { evidenceBar.innerHTML = ''; evidenceBar.style.display = 'none'; }
        }

        if (compareBar) compareBar.style.display = filledCount >= 2 ? '' : 'none';
        if (compareTopBtn) compareTopBtn.style.display = filledCount >= 2 ? '' : 'none';
        if (ballotTopBtn) ballotTopBtn.style.display = filledCount >= 1 ? '' : 'none';
        if (compareCta) compareCta.style.display = filledCount >= 2 ? '' : 'none';
        var hintEl = document.getElementById('myteam-compare-bar-hint');
        if (hintEl) hintEl.textContent = 'Compare ' + filledCount + ' team members side-by-side';
      } else {
        if (teamEmpty) teamEmpty.style.display = 'none';
        if (teamStats) teamStats.style.display = 'none';
        if (compareBar) compareBar.style.display = 'none';
        if (compareTopBtn) compareTopBtn.style.display = 'none';
        if (ballotTopBtn) ballotTopBtn.style.display = 'none';
        if (compareCta) compareCta.style.display = 'none';
        if (alignmentBar) alignmentBar.style.display = 'none';
        if (evidenceBar) { evidenceBar.innerHTML = ''; evidenceBar.style.display = 'none'; }
      }

      var summaryLine = document.getElementById('myteam-summary-line');
      if (summaryLine) {
        var _tot = _counts.total;
        summaryLine.style.display = '';
        summaryLine.classList.remove('is-empty', 'is-complete');
        if (filledCount === 0) {
          summaryLine.classList.add('is-empty');
          summaryLine.innerHTML = '<span style="font-size:1.05rem;">🗳️</span><span>Build a <strong class="myteam-summary-strong">team of ' + _tot + '</strong> who actually represent you — each card below is an office you get to decide. Tap any open office to add the candidate who matches your <strong class="myteam-summary-strong">values</strong>; everything saves automatically as you go.</span>';
        } else if (filledCount >= _tot) {
          summaryLine.classList.add('is-complete');
          summaryLine.innerHTML = '<span style="font-size:1.05rem;">🎉</span><span>Your team is complete — all <strong class="myteam-summary-strong">' + _tot + '/' + _tot + '</strong> picks reflect your values. <button type="button" onclick="window.openBallotSummary && window.openBallotSummary()" style="background:none;border:none;padding:0;font:inherit;color:#fcd34d;font-weight:800;text-decoration:underline;cursor:pointer;">See, print &amp; share your ballot →</button></span>';
        } else {
          var _open = _tot - filledCount;
          summaryLine.innerHTML = '<span style="font-size:1.05rem;">⭐</span><span><strong class="myteam-summary-strong">' + filledCount + '/' + _tot + '</strong> seats filled — just <strong class="myteam-summary-strong">' + _open + '</strong> to go. Tap an open office below to add whoever best represents what you believe.</span>';
        }
      }

      if (teamCountBadge) teamCountBadge.textContent = filledCount + '/' + _counts.total;

      _renderTeamOfficeSummary(ballotSelections, filledCount);
      _renderTeamSaveStatus(filledCount);
      _renderTeamNextStep(filledCount);
      _renderTeamDistrictCoverage(ballotSelections, filledCount);

      var browseSlotsLabel = document.getElementById('myteam-browse-slots-label');
      var browseSlotsBar = document.getElementById('myteam-browse-slots-bar');
      if (browseSlotsLabel) browseSlotsLabel.textContent = filledCount + '/' + _counts.total + ' Seats Filled';
      if (browseSlotsBar) browseSlotsBar.style.width = Math.round(filledCount / (_counts.total || 1) * 100) + '%';

      myteamBrowseFilter();

      // Keep the persistent "Your Team" bar at the top of Relevant to Me in sync
      // with the live count + next open seat on every team change.
      if (typeof window._relSyncTeamProgress === 'function') { try { window._relSyncTeamProgress(); } catch (e) {} }
    }

    window.myteamClearSlot = function(raceKey, btn) {
      // Capture the politician being removed (for the toast) before we clear it.
      var removedPid = null;
      try { removedPid = (JSON.parse(localStorage.getItem(TEAM_BALLOT_KEY) || '{}'))[raceKey] || null; } catch(e) {}

      var doClear = function() {
        if (typeof window.ballotClearRace === 'function') {
          // ballotClearRace persists to Firestore (userTeams) in real time,
          // re-renders the slot grid + summary, and repaints Your Key Races so
          // the matching "+ Add to My Team" button becomes active again.
          window.ballotClearRace(raceKey);
        } else {
          try {
            var sel = JSON.parse(localStorage.getItem(TEAM_BALLOT_KEY) || '{}');
            delete sel[raceKey];
            localStorage.setItem(TEAM_BALLOT_KEY, JSON.stringify(sel));
          } catch(e) {}
          _mypolBuildGrid();
        }
      };

      var card = (btn && btn.closest) ? btn.closest('.myteam-slot') : null;
      if (card && !card.classList.contains('myteam-slot-removing')) {
        // Make removing feel as satisfying as adding: named toast + counter pop
        // fire immediately, the card animates away, then the data clears.
        if (removedPid && typeof window._showTeamToast === 'function') {
          window._showTeamToast(removedPid, 'remove', {});
        }
        if (typeof window._popTeamCounter === 'function') window._popTeamCounter();
        card.classList.add('myteam-slot-removing');
        setTimeout(doClear, 320);
      } else {
        doClear();
      }
    };

    window.myteamCompareAll = function() {
      var ballotSelections = _getTeamBallotSelections();
      var pidsToCompare = [];
      var seen = {};
      // Ballot-slot picks first, in the canonical office order …
      TEAM_POSITIONS.forEach(function(pos) {
        var pid = ballotSelections[pos.key];
        if (pid && CMP_DATA[pid] && !seen[pid]) { seen[pid] = 1; pidsToCompare.push(pid); }
      });
      // … then EVERY other politician the voter has added to My Team, regardless
      // of current office status. Former candidates (e.g. Caroline Gleich) live in
      // `_myPoliticians` but never fill a ballot slot, so the old slots-only build
      // silently dropped them from "Where They Stand" the moment a team went mixed.
      try {
        if (typeof _myPoliticians !== 'undefined' && _myPoliticians && _myPoliticians.forEach) {
          _myPoliticians.forEach(function(pid) {
            if (pid && CMP_DATA[pid] && !seen[pid]) { seen[pid] = 1; pidsToCompare.push(pid); }
          });
        }
      } catch (e) {}
      if (pidsToCompare.length < 2) return;
      _cmpSelected.clear();
      pidsToCompare.forEach(function(pid) { _cmpSelected.add(pid); });
      chubBuildAll();
      _mypolBuildGrid();
      if (typeof chubLaunchCompare === 'function') chubLaunchCompare();
    };

    // ── "My Ballot" — the journey's capstone ───────────────────────────────────
    // The single satisfying destination the whole guided experience points toward:
    // a clean, printable, shareable summary of the voter's finished (or in-progress)
    // ballot. Every other surface helps DISCOVER, EVALUATE and ADD; this is where it
    // all comes together into one tangible artifact the voter can take to the polls.
    // It reads the same live team state the builder uses, groups picks by ballot
    // tier (Federal · State · Local), names the real district for each seat, and —
    // crucially — still works mid-build: open seats become one-tap "add your pick"
    // rows, so this doubles as a focused finish-line checklist for returning voters
    // refining their slate. Self-contained: builds its own overlay + styles on first
    // open so nothing else on the page needs to know it exists.
    (function () {
      var _bsBuilt = false;
      function _bsEnsure() {
        if (_bsBuilt) return;
        _bsBuilt = true;
        var st = document.createElement('style');
        st.id = 'pdx-ballot-summary-styles';
        st.textContent =
          '.bs-overlay{position:fixed;inset:0;z-index:200;display:none;align-items:flex-start;justify-content:center;padding:1.1rem;overflow-y:auto;background:rgba(4,7,16,0.82);backdrop-filter:blur(6px);}' +
          '.bs-overlay.is-open{display:flex;}' +
          '.bs-panel{position:relative;width:min(640px,100%);margin:auto;border-radius:1.25rem;overflow:hidden;background:linear-gradient(160deg,#0c1530 0%,#0a0f1e 60%,#140a18 100%);border:1px solid rgba(245,200,66,0.45);box-shadow:0 24px 70px rgba(0,0,0,0.6),0 0 36px rgba(245,158,11,0.14);animation:bsIn 0.36s cubic-bezier(0.34,1.3,0.64,1);}' +
          '@keyframes bsIn{from{opacity:0;transform:translateY(16px) scale(0.98);}to{opacity:1;transform:none;}}' +
          '.bs-flag{height:3px;background:linear-gradient(90deg,#c0152a,#ffffff,#1a3a6b);}' +
          '.bs-head{padding:1.1rem 1.25rem 0.9rem;border-bottom:1px solid rgba(255,255,255,0.07);}' +
          '.bs-head-top{display:flex;align-items:flex-start;gap:0.75rem;}' +
          '.bs-ring{--pct:0;width:58px;height:58px;flex:none;border-radius:50%;background:conic-gradient(#f5c842 calc(var(--pct)*1%),rgba(255,255,255,0.1) 0);display:grid;place-items:center;position:relative;}' +
          '.bs-ring::before{content:"";position:absolute;inset:5px;border-radius:50%;background:#0b1322;}' +
          '.bs-ring.is-complete{background:conic-gradient(#4ade80 calc(var(--pct)*1%),rgba(255,255,255,0.1) 0);}' +
          '.bs-ring-num{position:relative;font-family:"Barlow Condensed",sans-serif;font-weight:800;font-size:0.92rem;color:#fff;}' +
          '.bs-title-wrap{flex:1;min-width:0;}' +
          '.bs-eyebrow{font-family:"Barlow Condensed",sans-serif;font-weight:800;font-size:0.62rem;letter-spacing:0.16em;text-transform:uppercase;color:#fad96a;}' +
          '.bs-title{font-family:"Bebas Neue",sans-serif;font-size:1.85rem;letter-spacing:0.04em;color:#fff;line-height:1;margin:0.1rem 0 0;}' +
          '.bs-loc{font-family:"Barlow Condensed",sans-serif;font-size:0.84rem;letter-spacing:0.02em;color:#9fb4d4;margin-top:0.15rem;}' +
          '.bs-loc b{color:#e6eefb;font-weight:700;}' +
          '.bs-close{flex:none;width:34px;height:34px;border-radius:0.6rem;border:1px solid rgba(255,255,255,0.12);background:rgba(255,255,255,0.04);color:#9fb4d4;font-size:1.1rem;cursor:pointer;transition:all 0.18s ease;}' +
          '.bs-close:hover{color:#fff;background:rgba(255,255,255,0.1);border-color:rgba(255,255,255,0.25);}' +
          '.bs-progressline{font-family:"Barlow",sans-serif;font-size:0.86rem;line-height:1.45;color:#c9d6ec;margin:0.85rem 0 0;}' +
          '.bs-progressline strong{color:#fff;}' +
          '.bs-progressline.is-complete{color:#bbf7d0;}' +
          '.bs-dist{display:inline-flex;align-items:center;gap:0.35rem;margin-top:0.5rem;font-family:"Barlow Condensed",sans-serif;font-weight:700;font-size:0.72rem;letter-spacing:0.05em;text-transform:uppercase;color:#fcd9a0;background:rgba(245,158,11,0.1);border:1px solid rgba(245,158,11,0.3);border-radius:999px;padding:0.25rem 0.7rem;}' +
          '.bs-dist.is-done{color:#86efac;background:rgba(34,197,94,0.12);border-color:rgba(34,197,94,0.35);}' +
          '.bs-body{padding:0.5rem 1.25rem 1.1rem;max-height:min(56vh,560px);overflow-y:auto;}' +
          '.bs-group{margin-top:1rem;}' +
          '.bs-group-head{display:flex;align-items:center;justify-content:space-between;gap:0.5rem;margin:0 0 0.5rem;}' +
          '.bs-group-title{font-family:"Barlow Condensed",sans-serif;font-weight:800;font-size:0.72rem;letter-spacing:0.1em;text-transform:uppercase;color:#9fb4d4;}' +
          '.bs-group-frac{font-family:"Barlow Condensed",sans-serif;font-weight:700;font-size:0.66rem;letter-spacing:0.04em;text-transform:uppercase;color:#7596c0;}' +
          '.bs-group-frac.is-done{color:#86efac;}' +
          '.bs-seat{display:flex;align-items:center;gap:0.7rem;border-radius:0.85rem;padding:0.6rem 0.7rem;margin-bottom:0.45rem;border:1px solid rgba(255,255,255,0.08);background:rgba(255,255,255,0.02);transition:border-color 0.18s ease,background 0.18s ease;}' +
          '.bs-seat.is-filled{border-color:rgba(74,222,128,0.32);background:linear-gradient(135deg,rgba(16,40,30,0.55),rgba(13,21,38,0.5));}' +
          '.bs-seat.is-open{border-color:rgba(245,158,11,0.3);background:rgba(245,158,11,0.05);cursor:pointer;}' +
          '.bs-seat.is-open:hover{border-color:rgba(245,158,11,0.6);background:rgba(245,158,11,0.1);}' +
          '.bs-seat-photo{width:42px;height:42px;flex:none;border-radius:0.6rem;overflow:hidden;background:rgba(255,255,255,0.05);display:flex;align-items:center;justify-content:center;font-size:1.3rem;color:#9fb4d4;}' +
          '.bs-seat-photo img{width:100%;height:100%;object-fit:cover;}' +
          '.bs-seat-body{flex:1;min-width:0;}' +
          '.bs-seat-office{font-family:"Barlow Condensed",sans-serif;font-weight:700;font-size:0.66rem;letter-spacing:0.08em;text-transform:uppercase;color:#8aa0c4;display:flex;align-items:center;gap:0.4rem;flex-wrap:wrap;}' +
          '.bs-seat-scope{color:#647a9c;font-weight:600;letter-spacing:0.03em;}' +
          '.bs-seat-name{font-family:"Barlow",sans-serif;font-weight:700;font-size:0.98rem;color:#fff;line-height:1.2;margin-top:0.1rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}' +
          '.bs-seat-name.is-open{color:#fcd9a0;font-weight:600;font-size:0.9rem;}' +
          '.bs-seat-meta{font-family:"Barlow",sans-serif;font-size:0.78rem;color:#9fb4d4;margin-top:0.05rem;display:flex;align-items:center;gap:0.4rem;flex-wrap:wrap;}' +
          '.bs-seat-score{flex:none;text-align:center;}' +
          '.bs-seat-score-num{font-family:"Bebas Neue",sans-serif;font-size:1.25rem;line-height:1;}' +
          '.bs-seat-score-lbl{font-family:"Barlow Condensed",sans-serif;font-size:0.5rem;letter-spacing:0.06em;text-transform:uppercase;color:#647a9c;}' +
          '.bs-seat-act{flex:none;font-family:"Barlow Condensed",sans-serif;font-weight:800;font-size:0.66rem;letter-spacing:0.05em;text-transform:uppercase;color:#0a0f1e;background:linear-gradient(135deg,#fad96a,#e6b800);border:none;border-radius:0.6rem;padding:0.45rem 0.7rem;cursor:pointer;white-space:nowrap;}' +
          '.bs-seat-swap{flex:none;font-family:"Barlow Condensed",sans-serif;font-weight:700;font-size:0.62rem;letter-spacing:0.04em;text-transform:uppercase;color:#9fb4d4;background:none;border:1px solid rgba(255,255,255,0.14);border-radius:0.55rem;padding:0.38rem 0.55rem;cursor:pointer;white-space:nowrap;transition:all 0.16s ease;}' +
          '.bs-seat-swap:hover{color:#fff;border-color:rgba(255,255,255,0.3);}' +
          '.bs-foot{padding:0.9rem 1.25rem 1.15rem;border-top:1px solid rgba(255,255,255,0.07);display:flex;flex-wrap:wrap;gap:0.55rem;background:rgba(5,8,18,0.4);}' +
          '.bs-btn{display:inline-flex;align-items:center;justify-content:center;gap:0.45rem;flex:1 1 auto;min-width:130px;min-height:44px;font-family:"Barlow Condensed",sans-serif;font-weight:800;font-size:0.8rem;letter-spacing:0.06em;text-transform:uppercase;border-radius:0.75rem;cursor:pointer;transition:transform 0.15s ease,box-shadow 0.18s ease,background 0.18s ease;border:1px solid transparent;}' +
          '.bs-btn:hover{transform:translateY(-1px);}' +
          '.bs-btn-primary{color:#0a0f1e;background:linear-gradient(135deg,#fad96a,#e6b800);box-shadow:0 5px 18px rgba(245,200,66,0.32);}' +
          '.bs-btn-blue{color:#bcd3f5;background:rgba(59,130,246,0.1);border-color:rgba(96,165,250,0.4);}' +
          '.bs-btn-blue:hover{color:#fff;background:rgba(59,130,246,0.2);}' +
          '.bs-btn-ghost{color:#9fb4d4;background:rgba(255,255,255,0.03);border-color:rgba(255,255,255,0.14);}' +
          '.bs-btn-ghost:hover{color:#fff;background:rgba(255,255,255,0.08);}' +
          '.bs-toast{position:absolute;left:50%;bottom:1rem;transform:translateX(-50%);background:rgba(34,197,94,0.95);color:#06210f;font-family:"Barlow Condensed",sans-serif;font-weight:800;font-size:0.78rem;letter-spacing:0.04em;text-transform:uppercase;padding:0.5rem 1rem;border-radius:999px;opacity:0;pointer-events:none;transition:opacity 0.25s ease;}' +
          '.bs-toast.is-shown{opacity:1;}' +
          '@media (max-width:520px){.bs-title{font-size:1.55rem;}.bs-btn{flex-basis:100%;}.bs-seat-swap{display:none;}}' +
          '@media print{body.pdx-print-ballot>*:not(.bs-overlay){display:none !important;}' +
          'body.pdx-print-ballot .bs-overlay{position:static !important;display:block !important;background:#fff !important;padding:0 !important;backdrop-filter:none !important;}' +
          'body.pdx-print-ballot .bs-panel{box-shadow:none !important;border:none !important;background:#fff !important;width:100% !important;color:#000 !important;}' +
          'body.pdx-print-ballot .bs-close,body.pdx-print-ballot .bs-foot,body.pdx-print-ballot .bs-seat-act,body.pdx-print-ballot .bs-seat-swap{display:none !important;}' +
          'body.pdx-print-ballot .bs-title,body.pdx-print-ballot .bs-seat-name,body.pdx-print-ballot .bs-ring-num{color:#000 !important;}' +
          'body.pdx-print-ballot .bs-loc,body.pdx-print-ballot .bs-seat-office,body.pdx-print-ballot .bs-seat-meta,body.pdx-print-ballot .bs-progressline,body.pdx-print-ballot .bs-group-title{color:#333 !important;}' +
          'body.pdx-print-ballot .bs-body{max-height:none !important;overflow:visible !important;}}';
        document.head.appendChild(st);

        var ov = document.createElement('div');
        ov.id = 'ballot-summary-overlay';
        ov.className = 'bs-overlay';
        ov.setAttribute('role', 'dialog');
        ov.setAttribute('aria-modal', 'true');
        ov.setAttribute('aria-label', 'Your ballot summary');
        ov.addEventListener('click', function (e) { if (e.target === ov) window.closeBallotSummary(); });
        document.body.appendChild(ov);
      }

      function _bsEsc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

      // _bsScoreColor was removed with the pledge percentage — see the tombstone
      // above _chubScoreColor. The seat tile now carries the ledger slot, which
      // is a count and has no colour to grade.

      // Plain-text rendering of the slate for the clipboard — the "share" path the
      // builder copy has long promised. Mirrors the on-screen grouping so what the
      // voter pastes reads the same as what they see.
      function _bsPlainText() {
        var positions = window.TEAM_POSITIONS || [];
        var sel = (typeof _getTeamBallotSelections === 'function') ? _getTeamBallotSelections() : {};
        var loc = window._currentVoterLocation || {};
        var place = window._hasUserLocation ? [loc.city, loc.county, loc.state].filter(Boolean).join(', ') : '';
        var filled = positions.filter(function (p) { return sel[p.key] && CMP_DATA[sel[p.key]]; }).length;
        var lines = ['🗳️ MY POLITIDEX BALLOT' + (place ? ' — ' + place : ''),
          filled + ' of ' + positions.length + ' seats filled', ''];
        _MYTEAM_LEVELS.forEach(function (lv) {
          var seats = positions.filter(function (p) { return _myteamSeatLevel(p.key) === lv.id; });
          if (!seats.length) return;
          lines.push((lv.title || lv.id).toUpperCase().replace(/[^\x00-\x7F]/g, '').trim());
          seats.forEach(function (p) {
            var d = sel[p.key] ? CMP_DATA[sel[p.key]] : null;
            var scope = (typeof _myteamSeatScope === 'function') ? _myteamSeatScope(p.key) : '';
            var lbl = p.label + (scope && scope.indexOf('District') === 0 ? ' (' + scope + ')' : '');
            if (d) {
              // Receipts travel better than a rate in pasted text: "27 kept · 8
              // broken" carries its own denominator, "77% promise score" does not.
              var _pn = (typeof window._pdxPledgeNote === 'function') ? window._pdxPledgeNote(d, 'short') : '';
              lines.push('  [x] ' + lbl + ' — ' + d.name + (d.party ? ' (' + d.party + ')' : '') + (_pn ? ' · ' + _pn : ''));
            } else {
              lines.push('  [ ] ' + lbl + ' — still open');
            }
          });
          lines.push('');
        });
        lines.push('Built free & nonpartisan at politidex.org');
        return lines.join('\n');
      }

      window.openBallotSummary = function () {
        _bsEnsure();
        var ov = document.getElementById('ballot-summary-overlay');
        if (!ov) return;
        var positions = window.TEAM_POSITIONS || [];
        var sel = (typeof _getTeamBallotSelections === 'function') ? _getTeamBallotSelections() : {};
        function _isOn(p) { return !!(sel[p.key] && CMP_DATA[sel[p.key]]); }
        var total = positions.length || 6;
        var filled = positions.filter(_isOn).length;
        var pct = total ? Math.round(filled / total * 100) : 0;
        var complete = filled >= total && total > 0;

        var distKeys = _MYTEAM_DISTRICT_KEYS;
        var distSeats = positions.filter(function (p) { return distKeys[p.key]; });
        var distFilled = distSeats.filter(_isOn).length;
        var distDone = distSeats.length > 0 && distFilled >= distSeats.length;

        var loc = window._currentVoterLocation || {};
        var place = window._hasUserLocation ? [loc.city, loc.county].filter(Boolean).join(', ') + (loc.state ? ', ' + loc.state : '') : '';

        // First still-open seat — prefer the voter's own voting districts.
        var firstOpen = null;
        for (var i = 0; i < distSeats.length && !firstOpen; i++) if (!_isOn(distSeats[i])) firstOpen = distSeats[i];
        if (!firstOpen) for (var j = 0; j < positions.length && !firstOpen; j++) if (!_isOn(positions[j])) firstOpen = positions[j];

        function _seatHtml(p) {
          var pid = sel[p.key];
          var d = pid ? CMP_DATA[pid] : null;
          var scope = (typeof _myteamSeatScope === 'function') ? _myteamSeatScope(p.key) : '';
          var scopeHtml = scope ? '<span class="bs-seat-scope">· ' + _bsEsc(scope) + '</span>' : '';
          if (d) {
            var photo = (typeof window._getPhotoUrl === 'function') ? window._getPhotoUrl(pid) : ((typeof BROWSE_PHOTOS !== 'undefined' && BROWSE_PHOTOS[pid]) ? BROWSE_PHOTOS[pid] : '');
            var photoHtml = photo
              ? '<span class="bs-seat-photo"><img loading="lazy" decoding="async" src="' + _bsEsc(photo) + '" alt="" onerror="this.style.display=\'none\';this.parentElement.textContent=\'' + (p.icon || '🏛') + '\'"></span>'
              : '<span class="bs-seat-photo">' + (p.icon || '🏛') + '</span>';
            var party = (window._pdxPartyChip && d.party) ? window._pdxPartyChip(d.party) : '';
            // ⚖️ Word vs Action — the one read, via window._pdxLedgerSlot. The seat
            // tile is narrow, so the glyph carries the state and the sub-line
            // carries the words: the verdict when there is one, the coverage gap
            // when there is not. `state === 'ledger'` used to select a pledge-
            // counts layout here; there is no pledge lane in this slot any more,
            // so one layout serves every state.
            var _slot = window._pdxLedgerSlot
              ? window._pdxLedgerSlot(d, { pid: pid, status: (typeof window._pdxOfficeStatus === 'function') ? window._pdxOfficeStatus(d) : 'office' })
              : { state: 'empty', glyph: '—', label: 'Word vs Action', sub: 'No record yet', tint: '' };
            var scoreHtml = '<span class="bs-seat-score"><span class="bs-seat-score-num" style="color:' + (_slot.tint || '#647a9c') + ';font-size:0.8rem;">' + _slot.glyph + '</span><span class="bs-seat-score-lbl">' + _bsEsc(_slot.sub) + '</span></span>';
            return '<div class="bs-seat is-filled">' + photoHtml +
              '<span class="bs-seat-body">' +
                '<span class="bs-seat-office">✓ ' + _bsEsc(p.label) + ' ' + scopeHtml + '</span>' +
                '<span class="bs-seat-name">' + _bsEsc(d.name) + '</span>' +
                '<span class="bs-seat-meta">' + party + '</span>' +
              '</span>' + scoreHtml +
              '<button type="button" class="bs-seat-swap" onclick="window._bsJump(\'' + p.key + '\')">Swap</button>' +
            '</div>';
          }
          return '<div class="bs-seat is-open" onclick="window._bsJump(\'' + p.key + '\')">' +
            '<span class="bs-seat-photo">' + (p.icon || '🏛') + '</span>' +
            '<span class="bs-seat-body">' +
              '<span class="bs-seat-office">' + _bsEsc(p.label) + ' ' + scopeHtml + '</span>' +
              '<span class="bs-seat-name is-open">Still open — add your pick</span>' +
            '</span>' +
            '<button type="button" class="bs-seat-act" onclick="event.stopPropagation();window._bsJump(\'' + p.key + '\')">➕ Add</button>' +
          '</div>';
        }

        var groupsHtml = _MYTEAM_LEVELS.map(function (lv) {
          var seats = positions.filter(function (p) { return _myteamSeatLevel(p.key) === lv.id; });
          if (!seats.length) return '';
          var c = seats.filter(_isOn).length;
          var fracDone = c >= seats.length;
          return '<div class="bs-group">' +
            '<div class="bs-group-head">' +
              '<span class="bs-group-title">' + lv.title + '</span>' +
              '<span class="bs-group-frac' + (fracDone ? ' is-done' : '') + '">' + (fracDone ? '✓ All ' + seats.length + ' picked' : c + '/' + seats.length + ' picked') + '</span>' +
            '</div>' + seats.map(_seatHtml).join('') +
          '</div>';
        }).join('');

        // Motivating, state-aware progress line.
        var progLine, progCls = '';
        if (complete) {
          progCls = ' is-complete';
          progLine = '🎉 <strong>Your ballot is ready.</strong> Every seat is filled with someone who earns your vote — saved on this device for election day. Print it or copy it to take to the polls.';
        } else if (filled === 0) {
          progLine = 'Your ballot has <strong>' + total + ' seats</strong> to fill. Tap any open seat below to jump straight to that race and add the candidate who earns it — your slate saves as you go.';
        } else {
          var open = total - filled;
          progLine = '<strong>' + filled + ' of ' + total + '</strong> seats filled' + (distDone && distSeats.length ? ', including all <strong>' + distSeats.length + '</strong> of your voting districts' : '') + ' — just <strong>' + open + '</strong> to go. Tap an open seat below to finish your ballot.';
        }

        var distChip = distSeats.length
          ? '<span class="bs-dist' + (distDone ? ' is-done' : '') + '">📍 ' + distFilled + '/' + distSeats.length + ' voting districts</span>'
          : '';

        var footBtns = '';
        if (!complete && firstOpen) {
          footBtns += '<button type="button" class="bs-btn bs-btn-primary" onclick="window._bsJump(\'' + firstOpen.key + '\')">➕ Add ' + _bsEsc(firstOpen.label) + '</button>';
        }
        if (filled >= 2) {
          footBtns += '<button type="button" class="bs-btn bs-btn-blue" onclick="window.closeBallotSummary();if(window.myteamCompareAll)window.myteamCompareAll();">⚖️ Compare Team</button>';
        }
        footBtns += '<button type="button" class="bs-btn bs-btn-ghost" onclick="window._bsCopy(this)">📋 Copy Slate</button>';
        footBtns += '<button type="button" class="bs-btn bs-btn-ghost" onclick="window._bsPrint()">🖨️ Print</button>';

        ov.innerHTML =
          '<div class="bs-panel">' +
            '<div class="bs-flag"></div>' +
            '<div class="bs-head">' +
              '<div class="bs-head-top">' +
                '<span class="bs-ring' + (complete ? ' is-complete' : '') + '" style="--pct:' + pct + ';"><span class="bs-ring-num">' + filled + '/' + total + '</span></span>' +
                '<span class="bs-title-wrap">' +
                  '<span class="bs-eyebrow">' + (complete ? '✓ Ballot Complete' : 'Your Voting Team') + '</span>' +
                  '<h2 class="bs-title">My Ballot</h2>' +
                  (place ? '<div class="bs-loc">📍 <b>' + _bsEsc(place) + '</b></div>' : '<div class="bs-loc">Set your location to label each seat with your real district.</div>') +
                '</span>' +
                '<button type="button" class="bs-close" onclick="window.closeBallotSummary()" aria-label="Close">✕</button>' +
              '</div>' +
              '<p class="bs-progressline' + progCls + '">' + progLine + '</p>' +
              distChip +
            '</div>' +
            '<div class="bs-body">' + groupsHtml + '</div>' +
            '<div class="bs-foot">' + footBtns + '</div>' +
            '<div class="bs-toast" id="bs-toast">✓ Copied</div>' +
          '</div>';

        ov.classList.add('is-open');
        document.body.style.overflow = 'hidden';
      };

      window.closeBallotSummary = function () {
        var ov = document.getElementById('ballot-summary-overlay');
        if (ov) ov.classList.remove('is-open');
        document.body.classList.remove('pdx-print-ballot');
        // Only release the scroll lock if no other modal still wants it.
        var anyOpen = false;
        try {
          anyOpen = !!document.querySelector('.bs-overlay.is-open, .modal-overlay.is-open');
        } catch (e) {}
        if (!anyOpen) document.body.style.overflow = '';
      };

      // Jump from the summary into a specific race to add or swap a pick — closes the
      // capstone and routes through the same accordion jump the rest of the site uses,
      // so movement between "review my ballot" and "edit a race" is one tap, no hunting.
      window._bsJump = function (key) {
        window.closeBallotSummary();
        setTimeout(function () { if (window.jumpToRelevantAccordion) window.jumpToRelevantAccordion(key); }, 120);
      };

      window._bsCopy = function (btn) {
        var txt = _bsPlainText();
        function ok() {
          var t = document.getElementById('bs-toast');
          if (t) { t.classList.add('is-shown'); setTimeout(function () { t.classList.remove('is-shown'); }, 1600); }
        }
        try {
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(txt).then(ok, function () { _bsCopyFallback(txt, ok); });
          } else { _bsCopyFallback(txt, ok); }
        } catch (e) { _bsCopyFallback(txt, ok); }
      };
      function _bsCopyFallback(txt, ok) {
        try {
          var ta = document.createElement('textarea');
          ta.value = txt; ta.style.position = 'fixed'; ta.style.opacity = '0';
          document.body.appendChild(ta); ta.select(); document.execCommand('copy');
          document.body.removeChild(ta); ok();
        } catch (e) {}
      }

      window._bsPrint = function () {
        document.body.classList.add('pdx-print-ballot');
        setTimeout(function () {
          try { window.print(); } catch (e) {}
          setTimeout(function () { document.body.classList.remove('pdx-print-ballot'); }, 500);
        }, 60);
      };

      // Close on Escape while the capstone is open.
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
          var ov = document.getElementById('ballot-summary-overlay');
          if (ov && ov.classList.contains('is-open')) window.closeBallotSummary();
        }
      });
    })();

    function _renderMyTeamCard(pid) {
      var d = CMP_DATA[pid];
      if (!d) return '';
      // ⚖️ Word vs Action — the one read, via window._pdxLedgerSlot.
      var slot = window._pdxLedgerSlot(d, { pid: pid, status: (typeof window._pdxOfficeStatus === 'function') ? window._pdxOfficeStatus(d) : 'office' });
      var sel = _cmpSelected.has(pid);
      var isPotential = _potentialPoliticians.has(pid);
      var isFav = _favoritePids.has(pid);
      var isLocal = _pdxIsLocalToUser(pid);

      var photoUrl = (typeof window._getPhotoUrl === 'function') ? window._getPhotoUrl(pid) : (BROWSE_PHOTOS[pid] || '');
      var photoHtml = photoUrl
        ? '<div class="myteam-photo"><img loading="lazy" decoding="async" src="' + photoUrl + '" alt="' + d.name + '" onerror="this.style.display=\'none\';this.parentElement.innerHTML=\'<div style=\\\'display:flex;align-items:center;justify-content:center;width:100%;height:100%;font-size:2rem\\\'>' + (d.icon || '🏛') + '</div>\'"></div>'
        : '<div class="myteam-photo" style="display:flex;align-items:center;justify-content:center;font-size:2rem;color:#9fb4d4;">' + (d.icon || '🏛') + '</div>';

      var localBadge = isLocal ? '<span class="chub-your-badge" style="font-size:0.6rem;">📍 Local Rep</span>' : '';
      var heartHtml = '<button class="heart-btn-circle" onclick="event.stopPropagation();window.toggleFavorite(\'' + pid + '\')" title="' + (isFav ? 'Remove from Favorites' : 'Add to Favorites') + '" style="font-size:1.15rem;background:none;border:none;cursor:pointer;transition:transform 0.2s;padding:0 2px;" onmouseover="this.style.transform=\'scale(1.2)\'" onmouseout="this.style.transform=\'scale(1)\'">' + (isFav ? '❤️' : '🤍') + '</button>';
      var alignHtml = typeof _alignScoreHtml === 'function' ? _alignScoreHtml(pid, 'ring') : '';
      // Accountability of Truth chip — shown right alongside the ⚖️ Word vs Action
      // rail so a voter sees the integrity signal without opening the profile.
      // (The `sc !== null` gate this used to carry read an undeclared identifier
      // left behind when the pledge percentage was retired, which threw a
      // ReferenceError before the card could render.)
      var acctBadgeHtml = (typeof window._acctCardBadge === 'function')
        ? '<span style="display:inline-flex;flex-shrink:0;">' + window._acctCardBadge(pid) + '</span>' : '';
      // Documented positions for this teammate — replaces the bare topic tags
      // when present (same labels, plus where they stand) on their own row.
      var mtStances = (typeof window._pdxStanceChips === 'function') ? window._pdxStanceChips(pid, d, { max: 4 }) : '';

      return '<div class="myteam-card" data-pid="' + pid + '">' +
        '<div class="flex items-start gap-4">' +
          photoHtml +
          '<div class="flex-1 min-w-0">' +
            '<div class="flex items-center gap-2 flex-wrap mb-1">' +
              '<span class="font-display text-lg tracking-wider text-white leading-tight">' + d.name + '</span>' +
              window._pdxStatusBadge(d, { size: 'sm' }) +
              (typeof window._pdxDepthBadge === 'function' ? window._pdxDepthBadge(d, { size: 'sm' }) : '') +
              (typeof window._pdxIsUnopposed === 'function' && window._pdxIsUnopposed(d) ? window._pdxUnopposedBadge({ size: 'sm' }) : '') +
              localBadge +
              '<span style="display:inline-flex;align-items:center;gap:0.2rem;background:rgba(245,158,11,0.15);border:1px solid rgba(245,158,11,0.35);color:#fbbf24;font-family:\'Barlow Condensed\',sans-serif;font-weight:700;font-size:0.58rem;letter-spacing:0.06em;text-transform:uppercase;padding:0.15rem 0.5rem;border-radius:999px;">⭐ On Your Team</span>' +
              '<button class="potential-star-btn ' + (isPotential ? 'potential-saved' : '') + '" onclick="event.stopPropagation();potentialToggle(\'' + pid + '\')" title="' + (isPotential ? 'Remove from potential candidates' : 'Add to potential candidates') + '">🌟</button>' +
              heartHtml +
            '</div>' +
            '<p class="font-condensed text-sm text-steel-300 tracking-wide mb-2">' + window._pdxOfficeLine(d) + (window._pdxPartyChip(d.party) ? ' &nbsp;' + window._pdxPartyChip(d.party) : '') + '</p>' +
            // `tally:false` — status prose only. The kept/broken ratio used to sit
            // directly above the score rail; those pledges are measured inside the
            // ⚖️ Word vs Action read the rail now prints, so the ratio was the same
            // evidence graded twice. Every status line is preserved.
            (typeof window._pdxStatPills === 'function' ? '<div style="margin-bottom:0.6rem;">' + window._pdxStatPills(d.kept, d.broken, d.pending, { record: d, status: (typeof window._pdxOfficeStatus === 'function' ? window._pdxOfficeStatus(d) : 'office'), year2026: (typeof window._pdx2026Candidate === 'function' && window._pdx2026Candidate(d)), candidacyStatus: d.candidacyStatus, tally: false }) + '</div>' : '') +
            '<div class="flex flex-wrap items-center gap-3 mb-3">' +
              '<div style="flex-shrink:0;">' +
                '<div class="chub-score" style="color:' + (slot.tint || '#c8d7ee') + ';font-size:1.5rem;">' + slot.glyph + '</div>' +
                '<div class="font-condensed text-xs text-steel-500 tracking-wider uppercase text-center" style="font-size:0.55rem;">' + slot.label + '</div>' +
                '<div class="font-condensed tracking-wider uppercase text-center" style="font-size:0.5rem;color:' + (slot.tint || '#647a9c') + ';margin-top:0.1rem;">' + slot.sub + '</div>' +
              '</div>' +
              acctBadgeHtml +
              alignHtml +
              '<div class="flex flex-wrap gap-1">' +
                (mtStances
                  ? ''
                  : (d.issues && d.issues.length
                    ? d.issues.slice(0, 4).map(function(i) { return '<span class="inline-block bg-navy-900/60 border border-white/5 rounded-full px-2 py-0.5 font-condensed text-steel-400" style="font-size:0.6rem;letter-spacing:0.05em;">' + i + '</span>'; }).join('')
                    : (typeof window._pdxFocusEmptyNote === 'function' ? window._pdxFocusEmptyNote(d) : ''))) +
              '</div>' +
            '</div>' +
            mtStances +
            '<div class="flex items-center gap-2 flex-wrap">' +
              '<button onclick="showProfile(\'' + pid + '\')" class="chub-add-btn" style="background:rgba(59,130,246,0.2);border-color:rgba(59,130,246,0.4);color:#93c5fd;">View Profile</button>' +
              '<button class="chub-add-btn ' + (sel ? 'chub-added' : '') + '" onclick="chubToggle(\'' + pid + '\')">' + (sel ? '✓ Compare' : '+ Compare') + '</button>' +
              '<button class="myteam-remove-btn" onclick="event.stopPropagation();mypolToggle(\'' + pid + '\')">✕ Remove</button>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>';
    }

    function _renderBrowseTeamCard(pid) {
      var d = CMP_DATA[pid];
      if (!d) return '';
      var isMy = _myPoliticians.has(pid);
      var alignBar = (typeof _alignCardBar === 'function') ? _alignCardBar(pid) : '';

      var isInOffice = (typeof window._pdxOfficeStatus === 'function') && window._pdxOfficeStatus(d) === 'office';

      var actions = _pdxTeamActions(pid);

      return window._pdxCardShell(pid, {
        cardClass: isInOffice ? 'is-incumbent' : '',
        controls: _pdxHeartCtrl(pid),
        badges: _pdxLocalBadge(pid) + _pdxTeamBadge(pid),
        extra: alignBar,
        actions: actions
      });
    }

    function _renderAllPoliticiansCard(pid) {
      var d = CMP_DATA[pid];
      if (!d) return '';
      // Candidates / challengers and former officeholders render as the simpler,
      // lighter card so the sitting officeholder stays the visual hero of the race.
      var _status = (typeof window._pdxOfficeStatus === 'function') ? window._pdxOfficeStatus(d) : 'office';
      if (_status !== 'office') return _renderCandidateBrowseCard(pid);

      // Personalized "Your Match" bar rides in the extra slot, below the unified
      // snapshot.
      //
      // SCORING CLEANUP: this slot also carried a "View Accountability Analysis"
      // expander (toggleCardAccountability) on every incumbent card in the browse
      // grid. Expanding it printed the retired Accountability of Truth composite —
      // an overall 0–100, per-category 0–100 bars — and ended in a "View Full
      // Analysis →" button into #accountability-overlay. It was the widest of the
      // four doors into the second score, and the last one found. Removed: Direction
      // Match is the product's only headline metric. Do not re-add an entry point.
      // See scripts/test-no-second-score.mjs.
      var alignBar = (typeof _alignCardBar === 'function') ? _alignCardBar(pid) : '';
      var extra = alignBar ? '<div style="margin-bottom:0.1rem;">' + alignBar + '</div>' : '';

      var actions = _pdxTeamActions(pid);

      var badges = (typeof _alignTopMatchBadge === 'function' ? _alignTopMatchBadge(pid) : '') + _pdxLocalBadge(pid) + _pdxHomeBadge(pid) + _pdxTeamBadge(pid);

      return window._pdxCardShell(pid, {
        cardClass: 'is-incumbent',
        controls: _pdxHeartCtrl(pid),
        badges: badges,
        extra: extra,
        actions: actions
      });
    }

    // Simpler, lighter card for candidates / challengers (and former officeholders).
    // Deliberately less visual weight than the incumbent card: smaller avatar, no
    // premium glow, no Promise/Accountability score block (challengers have no
    // voting record yet) and a clear status badge so it always reads as someone
    // running for — not currently holding — the seat.
    function _renderCandidateBrowseCard(pid) {
      var d = CMP_DATA[pid];
      if (!d) return '';
      var status = (typeof window._pdxOfficeStatus === 'function') ? window._pdxOfficeStatus(d) : 'candidate';

      // Personalized match bar — only once the visitor has chosen issues, so the
      // lighter candidate card stays minimal by default and never shows an empty prompt.
      var alignBar = (typeof _alignCardBar === 'function' && typeof _alignIssues !== 'undefined' && _alignIssues && _alignIssues.size > 0) ? _alignCardBar(pid) : '';

      var badges = (typeof _alignTopMatchBadge === 'function' ? _alignTopMatchBadge(pid) : '') + _pdxLocalBadge(pid) + _pdxHomeBadge(pid) + _pdxTeamBadge(pid);

      var actions = _pdxTeamActions(pid);

      return window._pdxCardShell(pid, {
        cardClass: 'is-candidate',
        controls: _pdxHeartCtrl(pid),
        badges: badges,
        maxIssues: 2,
        acct: false,
        extra: alignBar,
        actions: actions
      });
    }

    var _browseScope = 'all';

    var _browseGroupState = {};

    var _BROWSE_TYPE_ORDER = [
      { key: 'president', label: 'President / Executive', icon: '🦅', bg: 'linear-gradient(135deg, rgba(192,21,42,0.25), rgba(30,53,96,0.3))' },
      { key: 'senator', label: 'U.S. Senate', icon: '🏛', bg: 'linear-gradient(135deg, rgba(59,130,246,0.2), rgba(30,53,96,0.3))' },
      { key: 'governor', label: 'Statewide Executive Offices', icon: '⭐', bg: 'linear-gradient(135deg, rgba(168,85,247,0.2), rgba(30,53,96,0.3))' },
      { key: 'representative', label: 'U.S. House', icon: '🏛', bg: 'linear-gradient(135deg, rgba(34,197,94,0.15), rgba(30,53,96,0.3))' },
      { key: 'state_senator', label: 'State Senate', icon: '🏛', bg: 'linear-gradient(135deg, rgba(245,158,11,0.15), rgba(30,53,96,0.3))' },
      { key: 'state_rep', label: 'State House', icon: '🏛', bg: 'linear-gradient(135deg, rgba(236,72,153,0.15), rgba(30,53,96,0.3))' },
      { key: 'local', label: 'Local Offices', icon: '🏙', bg: 'linear-gradient(135deg, rgba(20,184,166,0.15), rgba(30,53,96,0.3))' },
      { key: 'cabinet', label: 'Cabinet / Appointed', icon: '🦅', bg: 'linear-gradient(135deg, rgba(139,92,246,0.15), rgba(30,53,96,0.3))' }
    ];

    function _classifyBrowseType(pid) {
      var d = CMP_DATA[pid];
      if (!d) return 'other';
      var o = d.office.toLowerCase();
      var st = (d.state || '').trim();

      // Candidates are NOT a category of their own — they classify by the office
      // they are running FOR, so a challenger nests under the same race as the
      // incumbent (e.g. a U.S. House UT-01 candidate lands in U.S. Representatives →
      // Utah). The incumbent/candidate distinction is carried by status, not bucket.

      if (o.includes('president') && !o.includes('senate president')) return 'president';
      if (o.includes('secretary') || o.includes('director') || o.includes('ambassador')) return 'cabinet';

      // Federal Senate — incumbents and candidates ("Candidate for U.S. Senate").
      if (o.includes('u.s. senator') || o.includes('u.s. senate') ||
          ((o.includes('senator') || o.includes('senate')) && !o.includes('state')))
        return 'senator';

      // Federal House / Congress — incumbents and candidates ("Candidate for
      // Congress", "U.S. House Candidate", "Candidate · U.S. House (UT-01)").
      if (o.includes('u.s. rep') || o.includes('u.s. house') || o.includes('congress') ||
          (o.includes('representative') && !o.includes('state')))
        return 'representative';

      // Statewide executive / constitutional offices — Governor, Lt. Governor,
      // Attorney General, State Treasurer and State Auditor are all elected by the
      // whole state, so they share one "Statewide Executive Offices" section (the
      // 'governor' bucket) instead of being scattered across Governors / State
      // Representatives / Other. County treasurers and auditors are local seats and
      // are deliberately excluded. Checked before the state chambers so a sitting
      // legislator running for one of these seats classifies by the seat sought.
      if (o.includes('governor') || o.includes('attorney general') ||
          ((o.includes('treasurer') || o.includes('auditor')) && o.indexOf('county') === -1))
        return 'governor';

      if (o.includes('state sen') || o.includes('senate president') || o.includes('state senate')) return 'state_senator';
      if (o.includes('state rep') || o.includes('house speaker') || o.includes('house minority') || o.includes('state house') || o.includes('state assembly') || o.includes('state legislature')) return 'state_rep';
      // Bare-chamber legislative offices (e.g. "House District 56", "Candidate for
      // Senate District 12") — including candidates — land in the right state
      // chamber instead of the vague "Other" bucket. Federal seats are excluded
      // (they are already classified above as U.S. Senator / Representative).
      var _isFederalOffice = o.includes('u.s.') || o.includes('congress') || o.includes('federal');
      if (!_isFederalOffice) {
        if (o.includes('house district') || (o.includes('house') && o.includes('district')) || (o.includes('assembly') && o.includes('district'))) return 'state_rep';
        if (o.includes('senate district') || (o.includes('senate') && o.includes('district')) || (o.includes('senator') && o.includes('district'))) return 'state_senator';
      }
      // Local offices — mayors, county seats, and municipal / school-district
      // bodies. City Council, Town Council and School Board / Board of Education
      // seats are local too, so they drop into the Local level alongside county
      // offices instead of the vague "Other" bucket. State-level boards (e.g. the
      // Utah State Board of Education) are excluded so they keep their statewide
      // bucket.
      var _isSchoolBoard = (o.includes('school board') || o.includes('board of education')) && o.indexOf('state') === -1;
      if (o.includes('mayor') || o.includes('county') || o.includes('city council') ||
          o.includes('town council') || o.includes('city commission') || _isSchoolBoard) return 'local';

      // Generic candidate/nominee with no office hint (e.g. office "Candidate" or
      // "Republican Nominee") but a congressional-district state code ("FL-06",
      // "KY-04") is a U.S. House race — nest it under U.S. Representatives.
      if ((o.includes('candidate') || o.includes('nominee')) && /^[A-Za-z]{2}-\d+$/.test(st)) return 'representative';

      return 'other';
    }

    function _getBrowseLocation(pid) {
      var d = CMP_DATA[pid];
      if (!d) return 'Other';
      var st = d.state || '';
      if (st.includes('District')) return st;
      if (st.includes('·')) {
        var parts = st.split('·');
        return parts[parts.length - 1].trim();
      }
      if (st.match(/^[A-Z]{2}-\d+$/)) {
        var stAbbr = st.split('-')[0];
        var stateNames = { UT: 'Utah', KY: 'Kentucky', FL: 'Florida', CO: 'Colorado', GA: 'Georgia' };
        return (stateNames[stAbbr] || stAbbr) + ' ' + st;
      }
      return st || 'National';
    }

    function _chevronSvg(cls) {
      return '<svg class="' + cls + '" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 9l-7 7-7-7"/></svg>';
    }

    function _chevronWrapped(wrapCls, svgCls) {
      return '<div class="' + wrapCls + '">' + _chevronSvg(svgCls) + '</div>';
    }

    window.toggleBrowseAccordion = function(elementId, stateKey) {
      var el = document.getElementById(elementId);
      if (!el) return;
      var isOpen = el.classList.contains('expanded');
      el.classList.toggle('expanded');
      _browseGroupState[stateKey] = !isOpen;
      // Run 3 perf: hydrate a district's cards/boards the first time it opens.
      if (!isOpen && el.hasAttribute('data-distpids')) {
        try { window._pdxHydrateDistBody(el); } catch (e) {}
      }
    };

    // Complete, unbiased US-state normalizer. Turns any raw state value — a full
    // name ("California"), an abbreviation ("CA", "KY-04"), a "State · County /
    // District" compound ("Utah · Cache County", "Texas · Harris County"), or a
    // federal label ("Federal", "U.S.") — into ONE canonical bucket, using EXACT
    // recognition of real states first. Only when no real US state is present in
    // the value do the dataset-specific Utah fallbacks apply, so a value can
    // never bleed into the wrong state (the old code mis-bucketed "Connecticut"
    // as Colorado via startsWith('co'), and folded every "…County" into Utah
    // before other-state checks ran). Verified by /tmp/test-state.js against the
    // live roster's distinct state values. Exposed on window for reuse/testing.
    (function () {
      if (window._pdxNormalizeState) return;
      var ABBR2NAME = {
        AL:'Alabama',AK:'Alaska',AZ:'Arizona',AR:'Arkansas',CA:'California',CO:'Colorado',
        CT:'Connecticut',DE:'Delaware',FL:'Florida',GA:'Georgia',HI:'Hawaii',ID:'Idaho',
        IL:'Illinois',IN:'Indiana',IA:'Iowa',KS:'Kansas',KY:'Kentucky',LA:'Louisiana',
        ME:'Maine',MD:'Maryland',MA:'Massachusetts',MI:'Michigan',MN:'Minnesota',MS:'Mississippi',
        MO:'Missouri',MT:'Montana',NE:'Nebraska',NV:'Nevada',NH:'New Hampshire',NJ:'New Jersey',
        NM:'New Mexico',NY:'New York',NC:'North Carolina',ND:'North Dakota',OH:'Ohio',OK:'Oklahoma',
        OR:'Oregon',PA:'Pennsylvania',RI:'Rhode Island',SC:'South Carolina',SD:'South Dakota',
        TN:'Tennessee',TX:'Texas',UT:'Utah',VT:'Vermont',VA:'Virginia',WA:'Washington',
        WV:'West Virginia',WI:'Wisconsin',WY:'Wyoming',DC:'District of Columbia',
        PR:'Puerto Rico',GU:'Guam',VI:'U.S. Virgin Islands',AS:'American Samoa',MP:'Northern Mariana Islands'
      };
      var NAME_SET = {};
      Object.keys(ABBR2NAME).forEach(function (a) { NAME_SET[ABBR2NAME[a].toLowerCase()] = ABBR2NAME[a]; });
      var UTAH_PIDS = { owens:1, maloy:1, bmoore:1, kennedy:1 };
      var _canonCache = {};

      // A leading run of words that spells a real state name — but NOT when the
      // next word is "county" (so "Washington County", a Utah county, is not read
      // as Washington State). Handles multi-word names up to "District of Columbia".
      function _leadingStateName(segLow) {
        var words = segLow.split(/\s+/);
        for (var n = Math.min(3, words.length); n >= 1; n--) {
          var phrase = words.slice(0, n).join(' ');
          if (NAME_SET[phrase]) { return words[n] === 'county' ? '' : NAME_SET[phrase]; }
        }
        return '';
      }
      function _canon(s) {
        var low = s.toLowerCase();
        if (low === 'national' || low === 'federal' || low === 'cabinet' || low === 'u.s.' ||
            low === 'us' || low === 'usa' || low === 'u.s.a.' || low === 'united states') return 'National';
        if (NAME_SET[low]) return NAME_SET[low];
        if (/^[a-z]{2}$/.test(low) && ABBR2NAME[low.toUpperCase()]) return ABBR2NAME[low.toUpperCase()];
        var segs = s.split(/[·,|\/–—]/);
        for (var i = 0; i < segs.length; i++) {
          var seg = segs[i].trim(); if (!seg) continue;
          var segLow = seg.toLowerCase();
          if (NAME_SET[segLow]) return NAME_SET[segLow];
          if (/^[a-z]{2}$/.test(segLow) && ABBR2NAME[segLow.toUpperCase()]) return ABBR2NAME[segLow.toUpperCase()];
          var sub = seg.split('-')[0].trim(), subLow = sub.toLowerCase();
          if (sub !== seg) {
            if (NAME_SET[subLow]) return NAME_SET[subLow];
            if (/^[a-z]{2}$/.test(subLow) && ABBR2NAME[subLow.toUpperCase()]) return ABBR2NAME[subLow.toUpperCase()];
          }
          var lp = _leadingStateName(segLow);
          if (lp) return lp;
          var toks = seg.split(/\s+/);
          for (var j = 0; j < toks.length; j++) { if (/^[A-Z]{2}$/.test(toks[j]) && ABBR2NAME[toks[j]]) return ABBR2NAME[toks[j]]; }
        }
        return '';
      }
      function canon(s) {
        if (_canonCache[s] !== undefined) return _canonCache[s];
        var r = _canon(s); _canonCache[s] = r; return r;
      }
      window._pdxNormalizeState = function (raw, pid) {
        var st = String(raw == null ? '' : raw).trim();
        if (!st) return 'National';
        var c = canon(st);
        if (c) return c;
        // Dataset-specific Utah fallbacks — only reached when the value contains
        // NO recognizable US state, so they can never mislabel another state.
        if (pid && UTAH_PIDS[pid]) return 'Utah';
        if (/^(?:(?:u\.?\s?s\.?\s+)?(?:state\s+|us\s+)?(?:house|senate|congress(?:ional)?|legislative)\s+)?(?:district|dist\.?|hd|sd|cd)\s*#?\s*\d{1,3}$/i.test(st) ||
            /^\d{1,3}$/.test(st)) return 'Utah';
        if (/county/i.test(st)) return 'Utah'; // bare county w/ no state → Utah (Utah-focused set)
        return st; // unknown label kept as its own bucket rather than mislabeled
      };
    })();

    function _getPoliticianState(pid) {
      // Prefer the original hardcoded state (cached before any Firestore sync that
      // may overwrite a clean state with a bare district), then normalize.
      var origSt = window._originalStates && window._originalStates[pid];
      var checkVal = origSt || (CMP_DATA[pid] && CMP_DATA[pid].state) || '';
      return window._pdxNormalizeState(checkVal, pid);
    }

    // Real county for each Utah State House district (1–75). Used to replace the
    // placeholder "(Your County)" text that imported profile data ships with, so
    // every district in the browse tree reads as its actual county.
    //
    // PARTIALLY STALE, exactly like _UTAH_SENATE_COUNTY: this table was built on
    // pre-2023 numbering, and roughly half of the districts it covered were off by
    // one to three seats. The entries for districts held by a representative in
    // _UTAH_HOUSE_INFO have been verified against each member's residence and
    // corrected (4, 5, 11, 16, 29, 30, 50, 52, 56, 59, 66, 68 changed in July 2026,
    // then 21, 22, 24, 28, 67, 69, 71, 73 in the follow-up House pass; 9, 10, 14, 15,
    // 19, 36, 39, 42, 44, 61, 63, 70, 75 were already right). Every district that
    // _UTAH_HOUSE_INFO covers is now cross-checked against this table by assertion
    // 10f, so the two can no longer drift apart silently. The remaining districts
    // have NOT been re-verified and should not be trusted for a new member without
    // checking the record — add them to _UTAH_HOUSE_INFO instead, which is
    // authoritative and cross-checked by scripts/test-identity-integrity.mjs.
    var _UTAH_HOUSE_COUNTY = {
      1:'Box Elder County', 2:'Cache County', 3:'Cache County', 4:'Morgan County', 5:'Cache County',
      6:'Weber County', 7:'Weber County', 8:'Weber County', 9:'Weber County', 10:'Weber County',
      11:'Weber County', 12:'Weber County', 13:'Davis County', 14:'Davis County', 15:'Davis County',
      16:'Davis County', 17:'Weber County', 18:'Weber County', 19:'Davis County', 20:'Davis County',
      21:'Salt Lake County', 22:'Salt Lake County', 23:'Salt Lake County', 24:'Salt Lake County', 25:'Salt Lake County',
      26:'Davis County', 27:'Davis County', 28:'Tooele County', 29:'Tooele County', 30:'Salt Lake County',
      31:'Salt Lake County', 32:'Salt Lake County', 33:'Salt Lake County', 34:'Salt Lake County', 35:'Salt Lake County',
      36:'Salt Lake County', 37:'Salt Lake County', 38:'Salt Lake County', 39:'Salt Lake County', 40:'Salt Lake County',
      41:'Salt Lake County', 42:'Salt Lake County', 43:'Salt Lake County', 44:'Salt Lake County', 45:'Salt Lake County',
      46:'Salt Lake County', 47:'Salt Lake County', 48:'Salt Lake County', 49:'Salt Lake County', 50:'Utah County',
      51:'Utah County', 52:'Utah County', 53:'Utah County', 54:'Salt Lake County', 55:'Utah County',
      56:'Utah County', 57:'Utah County', 58:'Utah County', 59:'Wasatch County', 60:'Utah County',
      61:'Utah County', 62:'Utah County', 63:'Utah County', 64:'Utah County', 65:'Utah County',
      66:'Sanpete County', 67:'Carbon County', 68:'Uintah County', 69:'San Juan County', 70:'Sevier County',
      71:'Iron County', 72:'Uintah County', 73:'Washington County', 74:'Washington County', 75:'Washington County'
    };

    // Collapsible district groupings for the Utah House tree (keeps the long
    // 75-district list from being one giant scroll). Each range becomes one
    // accordion section with a region label.
    var _DISTRICT_RANGES = [
      { min: 1,  max: 15, label: 'Northern Utah' },
      { min: 16, max: 30, label: 'Davis & Weber' },
      { min: 31, max: 45, label: 'Salt Lake County' },
      { min: 46, max: 60, label: 'Salt Lake & South Valley' },
      { min: 61, max: 75, label: 'Utah County & Southern Utah' }
    ];

    // Authoritative district + county for each SITTING Utah State Representative
    // that has a cmp-data.js roster record — the House mirror of _UTAH_SENATE_INFO
    // below, and for the same reason: until July 2026 the House had ONLY the
    // by-number `_UTAH_HOUSE_COUNTY` fallback, so nothing could tell whether
    // KR_STATE_HOUSE_INCUMBENTS named the right person for a seat. It couldn't, in
    // four cases: Teuscher was wired at 45 (that is Tracy Miller's seat), Val
    // Peterson at 57 (Nelson Abbott's), Lisa Shepherd at 62 (Norm Thurston's), and
    // District 3 pointed at a `stephanie_gricius_h3` id for a member who sits in
    // District 50 and was already correctly wired there. Each member's own roster
    // record carried the right number the whole time; only the Key Races table was
    // wrong, which is precisely the disagreement an info map makes visible.
    //
    // SITTING ONLY, and DISTRICT NUMBERS ARE POST-2023 — same rules as the Senate
    // map. `c` is the member's home county, matching the Senate convention, since a
    // multi-county district still has one seat of residence. Ids whose suffix encodes
    // a pre-2023 number (`bolinder_h68` sits in 29, `teuscher_h44` in 44 despite the
    // Key Races table having said 45, `valpeterson_h56` in 56) are deliberately NOT
    // renamed: the id is the identity, the number lives here.
    //
    // ONE-DIRECTIONAL NO LONGER — as of the July 2026 follow-up pass this map covers
    // every district in KR_STATE_HOUSE_INCUMBENTS and every pid in it holds exactly
    // one seat, so assertion 10e in scripts/test-identity-integrity.mjs is now
    // BIDIRECTIONAL: adding a representative to either table without the other is a
    // hard failure, and so is a roster record whose own district string disagrees
    // with the seat wired here. What made that possible was clearing the twelve
    // districts that used to be reported as notes:
    //   • Six pointed at ids that existed in no other file — `hooper_h22`,
    //     `nelson_h28`, `matthews_h36`, `judkins_h42`, `albrecht_h67`,
    //     `phil_lyman_h69`. Each seat's real member was already in the data set under
    //     a curated id, so the district was re-keyed and the phantom id deleted.
    //   • `jwestwood` held TWO seats (70 and 71) while his own record said 73. He left
    //     the House in 2019 — Rex Shipp succeeded him — so he is a former member and
    //     holds none of them.
    //   • `rshipp` was wired at 75 and labelled St. George; Shipp lives in Cedar City
    //     and holds 71. District 75 is Walt Brooks's.
    //   • `hollins_h24` sits in 21, not the 24 its suffix encodes; District 24 is
    //     Grant Miller's.
    //   • `gwynn_h6` resigned in March 2026, so District 6 was dropped rather than
    //     left naming him (see the KR_STATE_HOUSE_INCUMBENTS note). A third pass wired
    //     the seat to his successor, `rob_bishop`, once that record existed.
    // A second July 2026 pass added the three seats that pass had left as notes,
    // each blocked on a missing roster record rather than on a missing fact:
    //   • District 23 — `hoang_nguyen`. Hoang Nguyen succeeded Brian King and was
    //     seated Jan 2025; she was content-bearing but roster-less, so 10e/10g had no
    //     office to check. The record now exists and the seat is wired.
    //   • District 37 — `ashlee_matthews`. Her seat was recorded here as "unconfirmed";
    //     the public record confirms Kearns, renumbered 38→37 in 2023. She is NOT the
    //     `matthews_h36` phantom, whose district went to James Dunnigan.
    //   • District 43 — `eliason_h45`. The suffix is Steve Eliason's pre-2023 number;
    //     he has held 43 since the renumbering, so his roster label read the wrong seat
    //     and the `sandy` KEY_RACES_BY_LOCATION block ran the wrong district number.
    //     Both were corrected with this entry, which is what put 10i in front of that
    //     block. District 45 is Tracy Miller's and was still wired to nobody; a fourth
    //     pass added her record and wired it.
    // `_UTAH_HOUSE_COUNTY[23]` was corrected Davis→Salt Lake County at the same time:
    // it was a stale pre-2023 value sitting between two Salt Lake districts, and 10f
    // would have failed the moment District 23 was wired with its real county.
    // A fourth pass added the last three seats whose sitting member was already
    // content-bearing here but roster-less — the same "blocked on a record, not on a
    // fact" shape as the three above:
    //   • District 45 — `tracy_miller` (R-South Jordan, seated Jan 2025, succeeded
    //     Susan Pulsipher). The last House seat that was wired to nobody.
    //   • District 60 — `grant_pace` (R-Provo, seated May 2026 after Tyler Clancy
    //     resigned to become the state homelessness coordinator). Not 61 — that is
    //     Lisa Shepherd's, which the `utah_co` Key Races block already features.
    //   • District 64 — `jackie_larson` (R-Spanish Fork, seated May 2026 for the
    //     remainder of Jefferson Burton's term after he moved out of the district).
    // A fifth pass swept all 75 seats for the same shape and found eleven more, nine
    // of them roster-less-but-content-bearing (`verona_mauga` 31, `doug_owens` 33,
    // `carol_spackman_moss` 34, `john_arthur` 41, `calvin_roberts` 46,
    // `candice_pierucci` 49, `leah_hansen` 51, `kay_christofferson` 53,
    // `doug_welton` 65) and two — `mschultz` 12 and `aromero` 25 — a different
    // failure: they had roster records all along and had simply never been added to
    // this map, so nothing checked their own district strings. Both were wrong when
    // checked. Romero's read District 26, a Davis County seat; she has held 25 (west
    // Salt Lake City) since the renumbering. Schultz's named no district at all, so
    // 10h skipped him silently rather than catching it. That is the failure mode an
    // info map exists to close, and it is worth remembering that a member being
    // rostered is not the same as a member being mapped.
    //
    // What the sweep deliberately did NOT wire: roughly twenty ids that look like this
    // same case and are not. `evan_vickers` / `evickers`, `ray_ward` / `rward`,
    // `casey_snider` / `snider_h5` and their like are one person split across two
    // surfaces — a full-name id carrying stances and a roster id carrying the record.
    // The person is already wired under the roster id, so no district is uncovered,
    // and adding the twin would create the parallel identity that the phantom-id
    // clean-up existed to remove. That is merge debt for a separate pass, tracked in
    // scripts/UTAH-LAUNCH-CLEANUP-TRACKER.md.
    //
    // Add a member here only once their district and county are verified against the
    // public record — a guess here now fails CI in both directions.
    var _UTAH_HOUSE_INFO = {
      auxier_h4:               { d: 4,  c: 'Morgan County' },
      snider_h5:               { d: 5,  c: 'Cache County' },
      // District 6 spans parts of Box Elder AND Weber County; `c` is Weber because
      // 10f requires it to equal _UTAH_HOUSE_COUNTY[6], which is the by-number
      // fallback the county-relevance matcher uses. His roster record names both.
      rob_bishop:              { d: 6,  c: 'Weber County' },
      jake_sawyer:             { d: 9,  c: 'Weber County' },
      koford_h10:              { d: 10, c: 'Weber County' },
      hall_h11:                { d: 11, c: 'Weber County' },
      mschultz:                { d: 12, c: 'Weber County' },
      lisonbee_h14:            { d: 14, c: 'Davis County' },
      defay_h15:               { d: 15, c: 'Davis County' },
      tlee:                    { d: 16, c: 'Davis County' },
      rward:                   { d: 19, c: 'Davis County' },
      hollins_h24:             { d: 21, c: 'Salt Lake County' },
      jennifer_dailey_provost: { d: 22, c: 'Salt Lake County' },
      hoang_nguyen:            { d: 23, c: 'Salt Lake County' },
      grant_miller:            { d: 24, c: 'Salt Lake County' },
      aromero:                 { d: 25, c: 'Salt Lake County' },
      nicholeen_p_peck:        { d: 28, c: 'Tooele County' },
      bolinder_h68:            { d: 29, c: 'Tooele County' },
      fitisemanu_h30:          { d: 30, c: 'Salt Lake County' },
      verona_mauga:            { d: 31, c: 'Salt Lake County' },
      doug_owens:              { d: 33, c: 'Salt Lake County' },
      carol_spackman_moss:     { d: 34, c: 'Salt Lake County' },
      james_dunnigan:          { d: 36, c: 'Salt Lake County' },
      ashlee_matthews:         { d: 37, c: 'Salt Lake County' },
      ivory_h39:               { d: 39, c: 'Salt Lake County' },
      john_arthur:             { d: 41, c: 'Salt Lake County' },
      clinton_okerlund:        { d: 42, c: 'Salt Lake County' },
      eliason_h45:             { d: 43, c: 'Salt Lake County' },
      teuscher_h44:            { d: 44, c: 'Salt Lake County' },
      tracy_miller:            { d: 45, c: 'Salt Lake County' },
      calvin_roberts:          { d: 46, c: 'Salt Lake County' },
      candice_pierucci:        { d: 49, c: 'Salt Lake County' },
      gricius_h50:             { d: 50, c: 'Utah County' },
      leah_hansen:             { d: 51, c: 'Utah County' },
      cory_maloy_h52:          { d: 52, c: 'Utah County' },
      kay_christofferson:      { d: 53, c: 'Utah County' },
      jon_hawkins:             { d: 55, c: 'Utah County' },
      valpeterson_h56:         { d: 56, c: 'Utah County' },
      kohler_h59:              { d: 59, c: 'Wasatch County' },
      grant_pace:              { d: 60, c: 'Utah County' },
      lisa_shepherd:           { d: 61, c: 'Utah County' },
      whyte_h63:               { d: 63, c: 'Utah County' },
      jackie_larson:           { d: 64, c: 'Utah County' },
      doug_welton:             { d: 65, c: 'Utah County' },
      shelley_h66:             { d: 66, c: 'Sanpete County' },
      christine_watkins:       { d: 67, c: 'Carbon County' },
      chew_h68:                { d: 68, c: 'Uintah County' },
      logan_monson:            { d: 69, c: 'San Juan County' },
      carl_albrecht:           { d: 70, c: 'Sevier County' },
      rshipp:                  { d: 71, c: 'Iron County' },
      colin_w_jack:            { d: 73, c: 'Washington County' },
      walt_brooks:             { d: 75, c: 'Washington County' }
    };

    // Authoritative district + county for each SITTING Utah State Senator in the
    // data set. Keyed by politician id so the browse tree shows a clean, unique
    // "District N (County)" for every senator — replacing the old "Statewide" /
    // "(Your County)" buckets and the duplicate district numbers that the raw
    // profile data carried.
    //
    // DISTRICT NUMBERS ARE POST-2023. Utah's 2021–22 redistricting renumbered many
    // Senate seats, and several ids in this codebase still encode the OLD number
    // (`mccay_s11` now sits in District 18). Trust this map's `d`, never the id
    // suffix. Corrections applied July 2026 from the public record: Adams 22→7,
    // Grover 15→23, McCay 11→18, Escamilla 7→10. Cullimore was already corrected
    // 9→19.
    //
    // SITTING ONLY. Two non-senators used to live here and have been removed:
    // `rward` (Ray Ward is a Utah HOUSE member — District 19 belongs to Cullimore
    // alone) and `bwilson` (Brad Wilson was House Speaker, never a senator, and
    // left the Legislature in Nov 2023). `cbramble` is out too — Curt Bramble
    // retired in Dec 2024; his roster record now correctly reads District 24
    // (Provo / Orem), the seat Keven Stratton won and holds today. Do not add a
    // House member, a former member, or a candidate to this map.
    //
    // COMPLETED July 2026: the seven remaining seats (2, 3, 9, 17, 20, 26, 27) that
    // KR_STATE_SENATE_INCUMBENTS wired to invented `*_sN` ids are now here under the
    // ids that actually carry each senator's curated content. Every entry in this map
    // now has a matching KR_STATE_SENATE_INCUMBENTS key and vice versa, so assertion
    // 10a in scripts/test-identity-integrity.mjs is BIDIRECTIONAL — adding a senator
    // to one table without the other is a hard failure, not a note.
    //
    // ALL 29 SEATS COVERED as of the fifth July 2026 pass, which added the last five
    // (4, 11, 14, 15, 22). They had been absent because no roster record existed to
    // name their senators, not because the seats were unknown; see the
    // KR_STATE_SENATE_INCUMBENTS comment for each disposition. One consequence worth
    // knowing before editing: this map is now exhaustive, so a NEW key here is either
    // a correction to an existing seat or a mistake — there is no uncovered district
    // left for one to describe. `emily_buss` is also the map's only non-R/D member
    // (Forward Party), which is a party value the profile renderer supports.
    var _UTAH_SENATE_INFO = {
      ssandall:        { d: 1,  c: 'Box Elder County' },
      cwilson:         { d: 2,  c: 'Cache County' },
      john_johnson:    { d: 3,  c: 'Weber County' },
      cmusselman:      { d: 4,  c: 'Weber County' },
      amillner:        { d: 5,  c: 'Weber County' },
      jstevenson:      { d: 6,  c: 'Davis County' },
      sadams:          { d: 7,  c: 'Davis County' },
      tweiler:         { d: 8,  c: 'Davis County' },
      jennifer_plumb:  { d: 9,  c: 'Salt Lake County' },
      lescamilla:      { d: 10, c: 'Salt Lake County' },
      emily_buss:      { d: 11, c: 'Utah County' },
      kwan_s12:        { d: 12, c: 'Salt Lake County' },
      blouin_s13:      { d: 13, c: 'Salt Lake County' },
      stephanie_pitcher:{ d: 14, c: 'Salt Lake County' },
      kathleen_riebe:  { d: 15, c: 'Salt Lake County' },
      harper_s16:      { d: 16, c: 'Salt Lake County' },
      lincoln_fillmore:{ d: 17, c: 'Salt Lake County' },
      mccay_s11:       { d: 18, c: 'Salt Lake County' },
      kcullimore:      { d: 19, c: 'Salt Lake County' },
      rwinterton:      { d: 20, c: 'Duchesne County' },
      brammer_s21:     { d: 21, c: 'Utah County' },
      heidi_balderree: { d: 22, c: 'Utah County' },
      kgrover:         { d: 23, c: 'Utah County' },
      kstratton:       { d: 24, c: 'Utah County' },
      mckell_s25:      { d: 25, c: 'Utah County' },
      dhinkins:        { d: 26, c: 'Emery County' },
      dowens_st:       { d: 27, c: 'Sanpete County' },
      evickers:        { d: 28, c: 'Iron County' },
      dipson:          { d: 29, c: 'Washington County' }
    };

    // County fallback for the 29 Utah Senate districts — used to label any
    // dynamically-added senator whose district number parses but who is not in the
    // authoritative map above.
    //
    // PARTIALLY STALE: this table was built on pre-2023 numbering. The entries for
    // districts held by a senator in _UTAH_SENATE_INFO have been verified and
    // corrected (2, 5, 7, 8, 13, 16, 20, 23, 26, 27); the rest — notably 4, 11, 14,
    // 15, 22 — have NOT been re-verified against the post-2023 map and should not be
    // trusted for a new senator without checking the record. Districts 2, 20, 26 and
    // 27 were corrected in July 2026 (Weber→Cache, Tooele→Duchesne, Utah→Emery,
    // Wasatch→Sanpete) when their sitting senators were added to the map above.
    var _UTAH_SENATE_COUNTY = {
      1:'Box Elder County', 2:'Cache County', 3:'Weber County', 4:'Weber County', 5:'Weber County',
      6:'Davis County', 7:'Davis County', 8:'Davis County', 9:'Salt Lake County', 10:'Salt Lake County',
      11:'Utah County', 12:'Salt Lake County', 13:'Salt Lake County', 14:'Salt Lake County', 15:'Salt Lake County',
      16:'Salt Lake County', 17:'Salt Lake County', 18:'Salt Lake County', 19:'Salt Lake County', 20:'Duchesne County',
      21:'Utah County', 22:'Utah County', 23:'Utah County', 24:'Utah County', 25:'Utah County',
      26:'Emery County', 27:'Sanpete County', 28:'Iron County', 29:'Washington County'
    };

    // Collapsible groupings for the 29 Utah Senate districts, mirroring the House
    // range sections so the senator tree is three tidy, labelled buckets.
    var _SENATE_RANGES = [
      { min: 1,  max: 10, label: 'Northern Utah & Wasatch Front' },
      { min: 11, max: 20, label: 'Salt Lake & Utah County' },
      { min: 21, max: 29, label: 'Southern & Rural Utah' }
    ];

    // Normalize the many inconsistent district formats the data uses — "District
    // 15", "House District 15", "Utah House District 15", "HD15", "H.D. 15",
    // "SD 6", "CD2", "UT-15", "(Dist. 15)", or a bare "15" — down to a plain
    // integer district number. Returns null when there is no district number (a
    // county-only or statewide value). Case- and whitespace-insensitive, so stray
    // spacing or capitalization in a record never breaks district matching.
    function _pdxDistNumFromStr(s) {
      if (s == null) return null;
      s = String(s).trim();
      if (!s) return null;
      var m;
      // "District 15" / "House District 15" / "Congressional District 2"
      if ((m = s.match(/\bDistrict\s*#?\s*0*(\d{1,3})\b/i))) return parseInt(m[1], 10);
      // "HD15" / "HD 15" / "H.D. 15" / "SD6" / "CD2" (house/senate/congress abbrev.)
      if ((m = s.match(/\b[HSC]\.?\s?D\.?\s*#?\s*0*(\d{1,3})\b/i))) return parseInt(m[1], 10);
      // "UT-15" / "FL-06" / "UT 15" (state code + district)
      if ((m = s.match(/\b[A-Za-z]{2,}-\s*0*(\d{1,3})\b/))) return parseInt(m[1], 10);
      // "(Dist. 56)" / "Dist 56"
      if ((m = s.match(/\bDist\.?\s*#?\s*0*(\d{1,3})\b/i))) return parseInt(m[1], 10);
      // A value that is essentially just the number ("15", "#15").
      if ((m = s.match(/^#?\s*0*(\d{1,3})\s*$/))) return parseInt(m[1], 10);
      return null;
    }
    window._pdxDistNumFromStr = _pdxDistNumFromStr;

    function _getPoliticianDistrictOrCounty(pid) {
      var d = CMP_DATA[pid];
      if (!d) return 'Statewide';

      // Statewide executive officers each get their own clearly-labeled node
      // (Governor, Lt. Governor, Attorney General, State Treasurer, State Auditor)
      // inside the "Statewide Executive Offices" section, rather than collapsing
      // into one anonymous "Statewide" bucket.
      if (_classifyBrowseType(pid) === 'governor') {
        var _ol = (d.office || '').toLowerCase();
        if (_ol.indexOf('lieutenant') !== -1 || _ol.indexOf('lt. gov') !== -1 || _ol.indexOf('lt gov') !== -1) return 'Lt. Governor';
        if (_ol.indexOf('attorney general') !== -1) return 'Attorney General';
        if (_ol.indexOf('treasurer') !== -1) return 'State Treasurer';
        if (_ol.indexOf('auditor') !== -1) return 'State Auditor';
        if (_ol.indexOf('governor') !== -1) return 'Governor';
        return 'Statewide Office';
      }

      var _isUtahSenator = (_classifyBrowseType(pid) === 'state_senator' && _getPoliticianState(pid) === 'Utah');
      // Utah State Senators resolve to a clean, unique district + county from the
      // authoritative map first (fixes the old "Statewide"/"(Your County)"/duplicate labels).
      if (_isUtahSenator && _UTAH_SENATE_INFO[pid]) {
        var si = _UTAH_SENATE_INFO[pid];
        return 'District ' + si.d + ' (' + si.c + ')';
      }

      // Utah State Representatives get the same treatment from _UTAH_HOUSE_INFO.
      // This has to come BEFORE the district-number parsing below, or a member whose
      // roster record encodes a pre-2023 number would be labelled with a seat someone
      // else now holds — the House version of the bug the Senate branch above fixed.
      var _isUtahRep = (_classifyBrowseType(pid) === 'state_rep' && _getPoliticianState(pid) === 'Utah');
      if (_isUtahRep && _UTAH_HOUSE_INFO[pid]) {
        var hi = _UTAH_HOUSE_INFO[pid];
        return 'District ' + hi.d + ' (' + hi.c + ')';
      }

      // If we cached the original state before Firestore overwrite, let's use it to find the district
      var origSt = window._originalStates && window._originalStates[pid];
      var st = (d.state || '').trim();

      // Scrub generic "(Your City/County/Region/District/Area…)" placeholder text
      // that imported profile data can ship with, so it never reaches a label.
      // Generalises the old "(Your County)" cleanup to every placeholder phrase.
      var _stripPlaceholderLoc = function(s) {
        return (s || '')
          .replace(/\(?\s*your\s+(city|county|region|district|area|town|state|constituency|municipality|ward|borough|precinct|neighbou?rhood)\s*\)?/gi, '')
          .replace(/\s{2,}/g, ' ')
          .replace(/\s*[,·\-–—]\s*$/, '')
          .replace(/^\s*[,·\-–—]\s*/, '')
          .trim();
      };
      st = _stripPlaceholderLoc(st);
      if (origSt) origSt = _stripPlaceholderLoc(origSt);

      // Pull a plain district number out of either the live or original state
      // string ("UT-5", "District 5", "District 5 (Your County)", etc.).
      var distNum = null;
      var matchHyphen = st.match(/^[A-Z]{2}-(\d+)/i) || (origSt && origSt.match(/^[A-Z]{2}-(\d+)/i));
      if (matchHyphen) {
        distNum = parseInt(matchHyphen[1], 10);
      } else {
        var matchDistrict = st.match(/District\s+(\d+)/i) || (origSt && origSt.match(/District\s+(\d+)/i));
        if (matchDistrict) distNum = parseInt(matchDistrict[1], 10);
      }
      // Broader fallback for U.S. House candidates whose seat is encoded inside a
      // compound state/office string ("Utah · UT-1", "Utah-01", "(UT-01)", "FL-06",
      // "CD-2") rather than at the start. This lets a House challenger nest in the
      // same "District N" node as the incumbent for that seat.
      if (distNum === null) {
        var _hay = st + ' ' + (origSt || '') + ' ' + (d.office || '');
        var _gm = _hay.match(/\b[A-Za-z]{2}-0*(\d{1,2})\b/) || _hay.match(/[A-Za-z]{3,}-0*(\d{1,2})\b/);
        if (_gm) distNum = parseInt(_gm[1], 10);
      }
      // Still nothing? Consult the dedicated `district` field — the most reliable
      // place a seat is recorded, and one that survives a Firestore sync
      // overwriting the `state` field. _pdxDistNumFromStr normalizes every format
      // ("District 15", "House District 15", "HD15", "(Dist. 15)", a bare "15").
      if (distNum === null) {
        var _dn = _pdxDistNumFromStr(d.district);
        if (_dn === null) _dn = _pdxDistNumFromStr(d.office);
        if (_dn !== null) distNum = _dn;
      }
      if (distNum !== null && !isNaN(distNum)) {
        // A record's own parenthetical area descriptor ("(West SLC)", "(Park
        // City)", "(Tooele/Grantsville)") is the most specific, truthful label
        // for its seat, so it is preferred over the broad county-by-number map.
        // The "(Your County)" style placeholders were already scrubbed above, so
        // anything left in parentheses is a real, human-meaningful place name.
        var _areaM = st.match(/\(([^)]+)\)/) || (origSt && origSt.match(/\(([^)]+)\)/));
        var _area = (_areaM && _areaM[1]) ? _areaM[1].trim() : '';
        // Utah State House districts get a county/area appended (fixing the
        // "(Your County)" placeholder): the record's own area when present, else
        // the canonical county for that district number. Other offices stay clean.
        if (_isUtahRep && (_area || _UTAH_HOUSE_COUNTY[distNum])) {
          return 'District ' + distNum + ' (' + (_area || _UTAH_HOUSE_COUNTY[distNum]) + ')';
        }
        // Dynamically-added Utah State Senators get their county from the district
        // map (or their own area descriptor when the record carries one).
        if (_isUtahSenator && (_area || _UTAH_SENATE_COUNTY[distNum])) {
          return 'District ' + distNum + ' (' + (_area || _UTAH_SENATE_COUNTY[distNum]) + ')';
        }
        // Utah U.S. House seats read as their congressional district so the four
        // districts (UT-01…UT-04) are immediately distinguishable.
        if (_classifyBrowseType(pid) === 'representative' && _getPoliticianState(pid) === 'Utah') {
          return 'District ' + distNum + ' (UT-' + (distNum < 10 ? '0' + distNum : distNum) + ')';
        }
        return 'District ' + distNum;
      }

      if (st.toLowerCase().includes('county')) {
        return st;
      }
      
      var stLower = st.toLowerCase();
      if (stLower === 'utah' || stLower === 'kentucky' || stLower === 'florida' || stLower === 'colorado' || stLower === 'georgia') {
        return 'Statewide';
      }
      
      // Additional fallback for known bare districts or codes. Every tracked
      // officeholder / candidate resolves to a real congressional or legislative
      // district (or a county) so none drop into a generic "Statewide" bucket.
      // Utah U.S. House seats read as their UT-0N congressional district.
      if (pid === 'bmoore') return 'District 1 (UT-01)';
      if (pid === 'maloy') return 'District 2 (UT-02)';
      if (pid === 'kennedy') return 'District 3 (UT-03)';
      if (pid === 'owens') return 'District 4 (UT-04)';
      if (pid === 'cstewart') return 'District 2 (UT-02)';   // former UT-02 representative
      if (pid === 'boebert') return 'District 4';            // CO-04
      if (pid === 'mtg') return 'District 14';               // GA-14
      if (pid === 'gaetz') return 'District 1';              // FL-01 (former)
      if (pid === 'rfine') return 'District 33';             // Florida state-house seat
      if (pid === 'jpetro') return 'Davis County';           // Mayor of Layton (Davis County)

      // Internal sentinel for any record that still can't be resolved to a real
      // district/office. It is deliberately NEVER rendered as its own "STATEWIDE"
      // accordion — the browse tree (see _renderGroupedBrowse) lays these cards
      // out flat under their state heading instead, so the broad, mixed-up
      // "STATEWIDE" section the tree was reorganized away from cannot reappear.
      return 'Statewide';
    }
    // Exposed so the unified compact card can show each politician's resolved
    // district / county on its office line, consistently across every listing.
    window._getPoliticianDistrictOrCounty = _getPoliticianDistrictOrCounty;

    // Sort a list of politician ids so that those currently holding office
    // ('office') always appear first, ahead of candidates/challengers and
    // former office-holders. Stable: original relative order is preserved
    // within each status tier, so nothing else about the ordering changes.
    function _sortInOfficeFirst(pids) {
      var statusRank = function(pid) {
        var d = CMP_DATA[pid];
        var status = (typeof window._pdxOfficeStatus === 'function') ? window._pdxOfficeStatus(d) : 'office';
        if (status === 'office') return 0;   // currently in office — always first
        if (status === 'candidate') return 1; // candidates / challengers next
        return 2;                              // former office-holders last
      };
      return pids
        .map(function(pid, i) { return { pid: pid, i: i, r: statusRank(pid) }; })
        .sort(function(a, b) { return a.r - b.r || a.i - b.i; })
        .map(function(x) { return x.pid; });
    }

    // ── All Politicians district tree: team-coverage helpers ──────────────────
    // Mark whether the voter has already added someone from a given district seat
    // to their team. renderDistAccordion uses these to stamp a coverage pill on
    // each district header and a short guidance note in its body; the same helpers
    // are re-applied in place by _myteamBrowseRefreshCoverage whenever a pick is
    // toggled, so the indicators stay live without rebuilding the whole tree.
    function _myteamCovEsc(s) {
      return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }
    function _myteamCovOnTeamPids(distPids) {
      return (distPids || []).filter(function(pid) {
        return (typeof window._pdxIsOnTeam === 'function') && window._pdxIsOnTeam(pid);
      });
    }
    // Whether this district accordion is one of the VOTER'S OWN ballot seats —
    // i.e. its seat precisely matches one the voter holds on their ballot. We
    // deliberately require an EXACT district-number match (or, for local seats, a
    // saved county) rather than relying on _isRelevantToUser alone: that broader
    // predicate keeps every same-state legislative seat when no county is known,
    // which would light up dozens of districts as "yours" and clutter the tree.
    // Resolving the voter's own U.S. House / State Senate / State House district
    // numbers from the same Key-Races area the rest of the app uses keeps "your
    // district" meaning the same thing everywhere. Conservative by design — when
    // a seat's district can't be resolved we stay silent rather than over-claim.
    function _myteamOwnDistricts() {
      var loc = window._currentVoterLocation || {};
      var krd = (typeof window.keyRacesRelevantData === 'function') ? window.keyRacesRelevantData() : null;
      var matched = !!(krd && krd.matched);
      function num(v) { if (v == null) return null; var n = parseInt(String(v).replace(/[^0-9]/g, ''), 10); return isNaN(n) ? null : n; }
      var house  = (matched && krd.byRace && krd.byRace.house)       ? krd.byRace.house.district       : (loc.district || null);
      var senate = (matched && krd.byRace && krd.byRace.statesenate) ? krd.byRace.statesenate.district : null;
      var lower  = (matched && krd.byRace && krd.byRace.statehouse)  ? krd.byRace.statehouse.district  : null;
      return { county: (loc.county || loc.city || '').trim(), house: num(house), senate: num(senate), lower: num(lower) };
    }
    function _myteamCovIsOwnSeat(distPids) {
      if (typeof _isRelevantToUser !== 'function') return false;
      if (!window._hasUserLocation) return false;
      var pids = distPids || [];
      // The accordion this serves is homogeneous (grouped by office type → state →
      // district), so the first ballot-relevant person characterizes the whole seat.
      var pid = null;
      for (var i = 0; i < pids.length; i++) { if (_isRelevantToUser(pids[i])) { pid = pids[i]; break; } }
      if (!pid) return false;
      var own = _myteamOwnDistricts();
      var type = (typeof _classifyBrowseType === 'function') ? _classifyBrowseType(pid) : 'other';
      var distNum = (typeof _relevantDistNum === 'function') ? _relevantDistNum(pid) : null;
      switch (type) {
        case 'representative': return own.house  != null && distNum != null && distNum === own.house;
        case 'state_senator':  return own.senate != null && distNum != null && distNum === own.senate;
        case 'state_rep':      return own.lower  != null && distNum != null && distNum === own.lower;
        case 'local':          return !!own.county; // county seat already refined to the voter's area
        default:               return false;        // statewide/federal seats don't render as district accordions
      }
    }
    function _myteamCovPillHTML(distPids) {
      var n = _myteamCovOnTeamPids(distPids).length;
      // Covered seats always get the green pill so coverage reads while scanning.
      if (n > 0) {
        return '<span class="myteam-cov-pill is-filled" title="' + n + ' from this race on your team">✓ On your team</span>';
      }
      // An OPEN seat that is one of the voter's own ballot districts gets an amber
      // "your district" flag so the gaps they personally need to fill stand out
      // while scanning. Open seats that aren't theirs stay silent — a pill on
      // every open seat across the national tree would just be noise.
      if (_myteamCovIsOwnSeat(distPids)) {
        return '<span class="myteam-cov-pill is-yours-open" title="One of your districts — no pick yet">◯ Your district · open</span>';
      }
      return '';
    }
    function _myteamCovNoteHTML(distPids) {
      var jump = '<button type="button" class="myteam-cov-link" onclick="window._relevantScrollToTeam && window._relevantScrollToTeam()">View My Team ↑</button>';
      var onTeam = _myteamCovOnTeamPids(distPids);
      if (onTeam.length) {
        var names = onTeam.map(function(pid) {
          return (typeof CMP_DATA !== 'undefined' && CMP_DATA[pid] && CMP_DATA[pid].name) ? CMP_DATA[pid].name : 'Someone';
        });
        var shown = names.slice(0, 2).join(', ');
        if (names.length > 2) shown += ' +' + (names.length - 2) + ' more';
        var verb = (onTeam.length === 1) ? 'is' : 'are';
        return '<div class="myteam-cov-note is-filled"><span class="myteam-cov-note-ico">✓</span>' +
          '<span><strong>' + _myteamCovEsc(shown) + '</strong> ' + verb + ' on your team from this race. ' + jump + '</span></div>';
      }
      // Open seat. When it's the voter's OWN district, the prompt is stronger and
      // amber-emphasized — this is a gap in THEIR coverage and the cards to fix it
      // are right below. Other open seats keep the lighter, generic invitation.
      if (_myteamCovIsOwnSeat(distPids)) {
        return '<div class="myteam-cov-note is-open is-yours"><span class="myteam-cov-note-ico">➕</span>' +
          '<span><strong>This is one of your districts</strong> — you haven’t added anyone yet. Pick someone below to complete your coverage. ' + jump + '</span></div>';
      }
      return '<div class="myteam-cov-note is-open"><span class="myteam-cov-note-ico">➕</span>' +
        '<span>You haven’t added anyone from this race yet — add someone below to complete your coverage. ' + jump + '</span></div>';
    }
    // Re-stamp the coverage pill + note on every rendered district accordion so the
    // All Politicians tree reflects the latest team pick without a full rebuild.
    window._myteamBrowseRefreshCoverage = function() {
      var grid = document.getElementById('myteam-browse-grid');
      if (!grid) return;
      var accs = grid.querySelectorAll('[data-distpids]');
      for (var i = 0; i < accs.length; i++) {
        var el = accs[i];
        var pids = (el.getAttribute('data-distpids') || '').split(',').filter(Boolean);
        var pillSlot = el.querySelector('.myteam-cov-slot');
        var noteSlot = el.querySelector('.myteam-cov-note-slot');
        if (pillSlot) pillSlot.innerHTML = _myteamCovPillHTML(pids);
        if (noteSlot) noteSlot.innerHTML = _myteamCovNoteHTML(pids);
      }
    };

    // Run 3 perf: the inner body of a single district (seat-field header, compare
    // launcher, alignment + issue boards, and the politician cards) built as a pure
    // function of its pid list. Called inline for districts that render open, or
    // lazily by _pdxHydrateDistBody the first time a collapsed district is expanded
    // — so the default, fully-collapsed roster never emits these hundreds of nodes.
    window._pdxBuildDistBody = function(distPids) {
      var out = '';
      out += '<div class="myteam-cov-note-slot">' + _myteamCovNoteHTML(distPids) + '</div>';
      var _distOfficePids = [], _distCandPids = [], _distFormerPids = [];
      distPids.forEach(function(pid) {
        var _st = (typeof window._pdxOfficeStatus === 'function') ? window._pdxOfficeStatus(CMP_DATA[pid]) : 'office';
        if (_st === 'candidate') _distCandPids.push(pid);
        else if (_st === 'former') _distFormerPids.push(pid);
        else _distOfficePids.push(pid);
      });
      var _distOffice = _distOfficePids.length, _distCand = _distCandPids.length;
      var _distGridCls = 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-start';
      var _alignSort = (window._alignBrowseSortActive && typeof _calcAlignmentScore === 'function');
      if (_distOffice && _distCand && typeof window._pdxSeatFieldHead === 'function') {
        out += window._pdxSeatFieldHead(_distOffice, _distCand, _distFormerPids.length, { compact: true });
      }
      if (typeof _pdxFieldCompareBtn === 'function') {
        out += _pdxFieldCompareBtn(_distOfficePids.concat(_distCandPids), {
          openSeat: _distOffice === 0 && _distCand > 0,
          hasIncumbent: _distOffice > 0
        });
      }
      if (typeof _pdxSeatAlignBoard === 'function') {
        out += _pdxSeatAlignBoard(_distOfficePids.concat(_distCandPids));
      }
      if (typeof window._pdxSeatIssueBoard === 'function') {
        out += window._pdxSeatIssueBoard(_distOfficePids.concat(_distCandPids), { max: 4 });
      }
      if (_distOffice && _distCand && !_alignSort && typeof window._pdxSeatRoleDivider === 'function') {
        out += window._pdxSeatRoleDivider('office', _distOffice);
        out += '<div class="' + _distGridCls + '" style="margin-bottom:0.85rem;">';
        _sortInOfficeFirst(_distOfficePids).forEach(function(pid) { out += _renderAllPoliticiansCard(pid); });
        out += '</div>';
        out += window._pdxSeatRoleDivider('cand', _distCand);
        out += '<div class="' + _distGridCls + '"' + (_distFormerPids.length ? ' style="margin-bottom:0.85rem;"' : '') + '>';
        _sortInOfficeFirst(_distCandPids).forEach(function(pid) { out += _renderAllPoliticiansCard(pid); });
        out += '</div>';
        if (_distFormerPids.length) {
          out += '<div class="pdx-field-former-divider">' +
              '<span class="pdx-field-former-pill">⏳ Previously held this seat <span style="opacity:0.75;">(' + _distFormerPids.length + ')</span></span>' +
              '<span class="pdx-field-former-rule"></span>' +
            '</div>';
          out += '<div class="' + _distGridCls + '">';
          _sortInOfficeFirst(_distFormerPids).forEach(function(pid) { out += _renderAllPoliticiansCard(pid); });
          out += '</div>';
        }
      } else {
        out += '<div class="' + _distGridCls + '">';
        var _leafPids = _alignSort
          ? distPids.slice().sort(function(a, b) { return (_calcAlignmentScore(b) ?? -1) - (_calcAlignmentScore(a) ?? -1); })
          : _sortInOfficeFirst(distPids);
        _leafPids.forEach(function(pid) {
          out += _renderAllPoliticiansCard(pid);
        });
        out += '</div>';
      }
      return out;
    };

    // Fill in a collapsed district's body the first time it is expanded. Idempotent:
    // once hydrated the marker is removed so re-toggling never rebuilds.
    window._pdxHydrateDistBody = function(groupEl) {
      if (!groupEl) return;
      var body = groupEl.querySelector('[data-lazy-distbody]');
      if (!body) return;
      var attr = groupEl.getAttribute('data-distpids') || '';
      var pids = attr ? attr.split(',') : [];
      body.innerHTML = window._pdxBuildDistBody(pids);
      body.removeAttribute('data-lazy-distbody');
      // Newly-injected cards may carry community vote/comment targets; ask the
      // threads layer to (re)hydrate them, matching a normal full render.
      try { if (window.PDXThreads && typeof window.PDXThreads.hydrate === 'function') window.PDXThreads.hydrate(); } catch (e) {}
    };

    function _renderGroupedBrowse(pids, prefix, opts) {
      prefix = prefix || '';
      opts = opts || {};
      // _forceOpen: expand every level (used while a search/filter is active so matches stay visible)
      // _defaultOpen: default state for untouched groups (false = start fully minimized)
      var _forceOpen = opts.forceOpen === true;
      var _defaultOpen = opts.defaultOpen === true;
      // Defensive state scope: when the panel is narrowed to a single state (or
      // "National"), guarantee the rendered tree contains ONLY that state's
      // buckets — no matter how pids were assembled upstream. This is what makes
      // the state tabs / dropdown fully control the grouping: a stray record from
      // another state (e.g. a Utah section) can never leak into a state view.
      var _stateScope = opts.stateScope || '';
      if (_stateScope) {
        pids = pids.filter(function(pid) { return _getPoliticianState(pid) === _stateScope; });
      }
      var officeGroups = {};
      pids.forEach(function(pid) {
        var type = _classifyBrowseType(pid);
        if (!officeGroups[type]) officeGroups[type] = [];
        officeGroups[type].push(pid);
      });

      var html = '';
      _BROWSE_TYPE_ORDER.forEach(function(tDef) {
        var officePids = officeGroups[tDef.key];
        if (!officePids || officePids.length === 0) return;

        var groupKey = tDef.key;
        var isOfficeOpen = _forceOpen ? true : (_browseGroupState[prefix + 'office-' + groupKey] !== undefined
          ? _browseGroupState[prefix + 'office-' + groupKey]
          : _defaultOpen);
        var officeExpandedClass = isOfficeOpen ? ' expanded' : '';

        html += '<div class="browse-type-group' + officeExpandedClass + '" id="' + prefix + 'browse-group-' + groupKey + '">';
        html += '<button class="browse-type-header" onclick="toggleBrowseAccordion(\'' + prefix + 'browse-group-' + groupKey + '\', \'' + prefix + 'office-' + groupKey + '\')">';
        html += '<div class="browse-type-title">';
        html += '<div class="browse-type-icon" style="background:' + tDef.bg + ';">' + tDef.icon + '</div>';
        html += '<span class="browse-type-name">' + tDef.label + '</span>';
        html += '<span class="browse-type-count">' + officePids.length + '</span>';
        html += '</div>';
        html += _chevronWrapped('browse-type-chevron-wrap', 'browse-type-chevron');
        html += '</button>';
        html += '<div class="browse-type-body"><div class="browse-type-inner">';

        var stateGroups = {};
        officePids.forEach(function(pid) {
          var state = _getPoliticianState(pid);
          if (!stateGroups[state]) stateGroups[state] = [];
          stateGroups[state].push(pid);
        });

        var states = Object.keys(stateGroups);
        // National-first ordering: federal / national records lead, then states
        // alphabetically. Utah takes its natural alphabetical place and is never
        // privileged, so the default (All States) view reads as genuinely
        // national rather than Utah-first.
        states.sort(function(a, b) {
          if (a === 'National') return -1;
          if (b === 'National') return 1;
          return a.localeCompare(b);
        });

        states.forEach(function(state) {
          var statePids = stateGroups[state];
          var stateKey = groupKey + '-' + state.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
          var isStateOpen = _forceOpen ? true : (_browseGroupState[prefix + 'state-' + stateKey] !== undefined
            ? _browseGroupState[prefix + 'state-' + stateKey]
            : _defaultOpen);
          var stateExpandedClass = isStateOpen ? ' expanded' : '';

          html += '<div class="browse-sub-group' + stateExpandedClass + ' ml-1 border border-white/5 rounded-xl mb-3 overflow-hidden bg-navy-900/30" id="' + prefix + 'browse-state-' + stateKey + '">';
          html += '<button class="w-full flex items-center justify-between px-4 py-3 bg-navy-800/40 hover:bg-navy-800/60 text-left border-none" onclick="toggleBrowseAccordion(\'' + prefix + 'browse-state-' + stateKey + '\', \'' + prefix + 'state-' + stateKey + '\')" style="min-height: 48px;">';
          html += '<div class="flex items-center gap-2">';
          html += '<span class="text-xs">📍</span>';
          html += '<span class="font-condensed font-bold text-sm text-steel-200 uppercase tracking-wider">' + state + '</span>';
          html += '<span class="font-condensed text-[10px] font-bold text-steel-400 bg-white/5 border border-white/5 rounded-full px-2 py-0.5 ml-1.5">' + statePids.length + '</span>';
          html += '</div>';
          html += _chevronWrapped('w-6 h-6 flex items-center justify-center rounded-full bg-white/5 text-steel-400', 'w-3 h-3 text-steel-400 transition-transform duration-300');
          html += '</button>';
          html += '<div class="browse-sub-body"><div class="p-3 space-y-3">';

          // Statewide-elected offices (U.S. Senate, President, Cabinet/Appointed)
          // have no districts to break out, so they render their cards directly
          // under the state instead of nesting inside a redundant "Statewide"
          // accordion. This removes the broad STATEWIDE grouping the rest of the
          // tree was reorganized away from — every other office type still groups
          // by its real district / county / office below.
          var _flatTypes = { senator: 1, president: 1, cabinet: 1 };
          if (_flatTypes[groupKey]) {
            var _flatPids = (window._alignBrowseSortActive && typeof _calcAlignmentScore === 'function')
              ? statePids.slice().sort(function(a, b) { return (_calcAlignmentScore(b) ?? -1) - (_calcAlignmentScore(a) ?? -1); })
              : _sortInOfficeFirst(statePids);
            html += '<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-start">';
            _flatPids.forEach(function(pid) { html += _renderAllPoliticiansCard(pid); });
            html += '</div>';
            html += '</div></div></div>';
            return;
          }

          var districtGroups = {};
          statePids.forEach(function(pid) {
            var dist = _getPoliticianDistrictOrCounty(pid);
            if (!districtGroups[dist]) districtGroups[dist] = [];
            districtGroups[dist].push(pid);
          });

          // Any card that could not be resolved to a real district / county would
          // otherwise pool into a broad "Statewide" accordion — exactly the mixed
          // grouping this tree was reorganized away from. Pull those out and lay
          // them flat under the state heading (no accordion, no "STATEWIDE" label)
          // so the generic statewide section never reappears.
          var _statewidePids = districtGroups['Statewide'] || null;
          delete districtGroups['Statewide'];

          var districts = Object.keys(districtGroups);
          districts.sort(function(a, b) {
            if (a === 'Federal') return -1;
            if (b === 'Federal') return 1;
            return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
          });

          // Renders a single district accordion (one district → its cards).
          var renderDistAccordion = function(dist) {
            var distPids = districtGroups[dist];
            var distKey = stateKey + '-' + dist.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
            var isDistOpen = _forceOpen ? true : (_browseGroupState[prefix + 'dist-' + distKey] !== undefined
              ? _browseGroupState[prefix + 'dist-' + distKey]
              : _defaultOpen);
            var distExpandedClass = isDistOpen ? ' expanded' : '';

            var out = '';
            out += '<div class="border border-white/5 rounded-lg overflow-hidden bg-navy-950/20' + distExpandedClass + '" id="' + prefix + 'browse-dist-' + distKey + '" data-distpids="' + distPids.join(',') + '">';
            out += '<button class="w-full flex items-center justify-between px-3 py-2 bg-navy-900/40 hover:bg-navy-900/60 text-left border-none" onclick="toggleBrowseAccordion(\'' + prefix + 'browse-dist-' + distKey + '\', \'' + prefix + 'dist-' + distKey + '\')" style="min-height: 38px;">';
            out += '<div class="flex items-center gap-1.5 flex-wrap">';
            out += '<span class="text-[10px] text-steel-500">▶</span>';
            out += '<span class="font-condensed font-600 text-xs text-steel-300 uppercase tracking-wide">' + dist + '</span>';
            out += '<span class="text-[10px] text-steel-500 bg-white/5 border border-white/5 rounded-full px-1.5 py-0.2 ml-1">' + distPids.length + '</span>';
            out += '<span class="myteam-cov-slot">' + _myteamCovPillHTML(distPids) + '</span>';
            out += '</div>';
            out += _chevronWrapped('w-5 h-5 flex items-center justify-center rounded-full bg-white/5 text-steel-400', 'w-2.5 h-2.5 text-steel-400 transition-transform duration-300');
            out += '</button>';
            out += '<div class="browse-sub-body"><div class="p-2"' + (isDistOpen ? '' : ' data-lazy-distbody="1"') + '>';
            // Run 3 perf: build the seat boards + cards now only when the district
            // is already open. A collapsed district renders an empty, marked body
            // that _pdxHydrateDistBody fills the first time the voter expands it
            // (reading the pid list off the parent's data-distpids). This keeps the
            // default, fully-collapsed roster from emitting hundreds of card nodes.
            if (isDistOpen) out += window._pdxBuildDistBody(distPids);
            out += '</div></div></div>';
            return out;
          };

          var distNumOf = function(dist) {
            var m = dist.match(/^District\s+(\d+)/i);
            return m ? parseInt(m[1], 10) : null;
          };

          // The Utah State House tree (75 districts) and the Utah State Senate tree
          // (29 districts) are each grouped into collapsible range sections so they
          // aren't one long scroll. Every other office/state keeps the flat list.
          var _activeRanges = (state === 'Utah' && groupKey === 'state_rep') ? _DISTRICT_RANGES
            : (state === 'Utah' && groupKey === 'state_senator') ? _SENATE_RANGES
            : null;
          var useRanges = (_activeRanges &&
            districts.some(function(dist) { return distNumOf(dist) !== null; }));

          if (!useRanges) {
            districts.forEach(function(dist) { html += renderDistAccordion(dist); });
          } else {
            // Non-numeric districts (Statewide / county seats) stay at the top, ungrouped.
            districts.filter(function(dist) { return distNumOf(dist) === null; })
              .forEach(function(dist) { html += renderDistAccordion(dist); });

            _activeRanges.forEach(function(rng) {
              var inRange = districts.filter(function(dist) {
                var n = distNumOf(dist);
                return n !== null && n >= rng.min && n <= rng.max;
              });
              if (inRange.length === 0) return;
              inRange.sort(function(a, b) { return distNumOf(a) - distNumOf(b); });

              var rngPolCount = inRange.reduce(function(sum, dist) { return sum + districtGroups[dist].length; }, 0);
              var rngKey = stateKey + '-rng-' + rng.min + '-' + rng.max;
              var isRngOpen = _forceOpen ? true : (_browseGroupState[prefix + 'rng-' + rngKey] !== undefined
                ? _browseGroupState[prefix + 'rng-' + rngKey]
                : _defaultOpen);
              var rngExpandedClass = isRngOpen ? ' expanded' : '';
              var rngTitle = 'Districts ' + rng.min + '–' + rng.max + ' (' + rng.label + ')';

              html += '<div class="browse-range-group border border-gold-400/15 rounded-lg overflow-hidden bg-navy-900/30 mb-2' + rngExpandedClass + '" id="' + prefix + 'browse-rng-' + rngKey + '">';
              html += '<button class="w-full flex items-center justify-between px-3 py-2.5 bg-navy-800/50 hover:bg-navy-800/70 text-left border-none" onclick="toggleBrowseAccordion(\'' + prefix + 'browse-rng-' + rngKey + '\', \'' + prefix + 'rng-' + rngKey + '\')" style="min-height: 42px;">';
              html += '<div class="flex items-center gap-1.5">';
              html += '<span class="text-[11px] text-gold-400">▦</span>';
              html += '<span class="font-condensed font-700 text-xs text-gold-300 uppercase tracking-wide">' + rngTitle + '</span>';
              html += '<span class="text-[10px] text-steel-400 bg-white/5 border border-white/5 rounded-full px-1.5 py-0.5 ml-1">' + rngPolCount + '</span>';
              html += '</div>';
              html += _chevronWrapped('w-5 h-5 flex items-center justify-center rounded-full bg-white/5 text-steel-400', 'w-2.5 h-2.5 text-steel-400 transition-transform duration-300');
              html += '</button>';
              html += '<div class="browse-sub-body"><div class="p-2 space-y-2">';
              inRange.forEach(function(dist) { html += renderDistAccordion(dist); });
              html += '</div></div></div>';
            });

            // Numeric districts outside the defined ranges render flat afterwards.
            districts.filter(function(dist) {
              var n = distNumOf(dist);
              if (n === null) return false;
              return !_activeRanges.some(function(rng) { return n >= rng.min && n <= rng.max; });
            }).sort(function(a, b) { return distNumOf(a) - distNumOf(b); })
              .forEach(function(dist) { html += renderDistAccordion(dist); });
          }

          // Flat lay-out for any cards that had no resolvable district/county, so
          // they read clearly under their state without a generic STATEWIDE box.
          if (_statewidePids && _statewidePids.length) {
            var _swSorted = (window._alignBrowseSortActive && typeof _calcAlignmentScore === 'function')
              ? _statewidePids.slice().sort(function(a, b) { return (_calcAlignmentScore(b) ?? -1) - (_calcAlignmentScore(a) ?? -1); })
              : _sortInOfficeFirst(_statewidePids);
            html += '<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-start">';
            _swSorted.forEach(function(pid) { html += _renderAllPoliticiansCard(pid); });
            html += '</div>';
          }

          html += '</div></div></div>';
        });

        html += '</div></div></div>';
      });

      if (officeGroups['other'] && officeGroups['other'].length > 0) {
        var otherPids = officeGroups['other'];
        var isOtherOpen = _forceOpen ? true : (_browseGroupState[prefix + 'office-other'] !== undefined
          ? _browseGroupState[prefix + 'office-other']
          : _defaultOpen);
        var otherExpandedClass = isOtherOpen ? ' expanded' : '';

        html += '<div class="browse-type-group' + otherExpandedClass + '" id="' + prefix + 'browse-group-other">';
        html += '<button class="browse-type-header" onclick="toggleBrowseAccordion(\'' + prefix + 'browse-group-other\', \'' + prefix + 'office-other\')">';
        html += '<div class="browse-type-title">';
        html += '<div class="browse-type-icon" style="background:linear-gradient(135deg, rgba(100,116,139,0.2), rgba(30,53,96,0.3));">👤</div>';
        html += '<span class="browse-type-name">Other</span>';
        html += '<span class="browse-type-count">' + otherPids.length + '</span>';
        html += '</div>';
        html += _chevronWrapped('browse-type-chevron-wrap', 'browse-type-chevron');
        html += '</button>';
        html += '<div class="browse-type-body"><div class="browse-type-inner">';
        html += '<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">';
        _sortInOfficeFirst(otherPids).forEach(function(pid) {
          html += _renderBrowseTeamCard(pid);
        });
        html += '</div>';
        html += '</div></div></div>';
      }

      return html;
    }

    window.setBrowseScope = function(scope) {
      _browseScope = scope;
      var relevantBtn = document.getElementById('scope-relevant') || document.getElementById('scope-btn-relevant');
      var allBtn = document.getElementById('scope-all') || document.getElementById('scope-btn-all');
      if (relevantBtn) relevantBtn.classList.toggle('active', scope === 'relevant');
      if (allBtn) allBtn.classList.toggle('active', scope === 'all');
      myteamBrowseFilter();
    };

    function _isRelevantToUser(pid) {
      var d = CMP_DATA[pid];
      if (!d) return false;

      var userLoc = window._currentVoterLocation || { state: '', city: '', county: '', district: '' };
      var userState = (userLoc.state || '').trim();
      var userCounty = (userLoc.county || userLoc.city || '').toLowerCase();
      var userDistrict = (userLoc.district || '').replace(/[^0-9]/g, '');

      var polStateRaw = (d.state || '').trim();
      var polOffice = (d.office || '').toLowerCase();

      // National / federal executive figures (President, Cabinet, etc.) are relevant to everyone.
      var polLower = polStateRaw.toLowerCase();
      if (polLower === 'national' || polLower === 'u.s.' || polLower === 'us' || polLower.indexOf('united states') !== -1 ||
          polOffice.indexOf('president') !== -1 || polOffice.indexOf('secretary') !== -1 ||
          polOffice.indexOf('director of nat') !== -1 || polOffice.indexOf('hhs') !== -1 ||
          polOffice.indexOf('defense') !== -1 || polOffice.indexOf('intelligence') !== -1) {
        return true;
      }

      // No location saved yet — only the national/federal ones above qualify.
      // The UI shows the neutral "Set Your Location to see your representatives" prompt.
      if (!window._hasUserLocation) return false;

      // National scope selected — only nationals shown (handled above).
      if (userState === 'National') return false;

      // Resolve the politician's home state and (for district offices) their
      // district number through the SAME authoritative helpers every other
      // location-aware view uses — _getPoliticianState and _relevantDistNum. They
      // read the dedicated `district` field and the cached original state, survive
      // a Firestore sync overwriting the live `state` field, and normalize every
      // inconsistent format ("UT-2", "District 2", "Utah · District 3", "HD15", a
      // bare "15"…) down to a clean state name + number.
      //
      // The previous inline regex parsed ONLY the live `state` string and was the
      // source of the district mismatches:
      //   • A bare "District 2" was misread as Connecticut — the regex matched the
      //     "ct 2" substring inside "Distri[ct] 2" — so the voter's own
      //     representative (Maloy, Owens, Kennedy, whose records carry a bare
      //     "District N" state) was wrongly filtered OUT of every Utah ballot.
      //   • When the `state` field carried no inline "XX-N" code, polDistNum came
      //     back empty and the district filter below was SKIPPED entirely — so a
      //     House rep with no parseable district leaked into EVERY district's
      //     ballot, showing voters a neighboring district's representative.
      // Routing through the shared helpers makes this predicate agree with the Key
      // Races and district-tree matching, so a District 1 voter sees the District 1
      // rep and nobody else's.
      var polStateName = _getPoliticianState(pid);
      if (!polStateName || polStateName === 'National') return false;
      if (polStateName.toLowerCase() !== userState.toLowerCase()) return false;

      // ── Exact-district enforcement for the three geographically-specific
      // offices (U.S. House, State Senate, State House) ────────────────────────
      // These are the ONLY seats where two voters in the same state can have
      // different representatives, so relevance has to be decided by the exact
      // district — not just the state or a county substring. We resolve the
      // voter's own districts through the same authoritative resolver the
      // personalized ballot uses (_relevantVoterDistricts): it derives them from
      // the saved U.S. House district AND the curated area for the voter's
      // city/county. That means a county-only voter (e.g. "Davis County", no
      // district typed) still gets their real numbers — U.S. House 2, State
      // Senate 6, State House 15 — instead of leaking a neighbouring district.
      //
      // Earlier this only filtered U.S. House, and ONLY when a district was
      // typed; State Senate / State House were matched by county alone and a
      // county-only voter skipped the House district filter entirely. That is
      // exactly how a Davis County (District 2) voter saw U.S. House District 1's
      // representative and every other Davis-area legislative district.
      //
      // When the politician's own district number parses, an exact match is
      // decisive (relevant) and a mismatch excludes them; when either side is
      // unknown we fall through to the broader state/county heuristics so a
      // correct-but-messy record is never hidden.
      var _isUSHouse = (polOffice.indexOf('u.s. rep') !== -1 || polOffice.indexOf('u.s. house') !== -1 ||
                        polOffice.indexOf('us house') !== -1 || polOffice.indexOf('house candidate') !== -1 ||
                        (polOffice.indexOf('representative') !== -1 && polOffice.indexOf('state') === -1));
      var _btype = (typeof _classifyBrowseType === 'function') ? _classifyBrowseType(pid) : '';
      var _officeKey = (_btype === 'representative' || _isUSHouse) ? 'representative'
                     : (_btype === 'state_senator') ? 'state_senator'
                     : (_btype === 'state_rep') ? 'state_rep' : null;
      if (_officeKey) {
        // Resolve the voter's OWN seat + authoritative roster for this office from
        // the single source of truth every location-aware surface now shares
        // (_pdxVoterBallot). The roster is the curated list of who actually holds
        // and is running for the voter's seat — so it doubles as an allow-list.
        var _vb = (typeof window._pdxVoterBallot === 'function') ? window._pdxVoterBallot() : null;
        var _vbUsable = !!(_vb && _vb.matched && (userState || '').toLowerCase() === 'utah');
        var _want = null, _roster = [];
        if (_vbUsable && _vb.byOffice && _vb.byOffice[_officeKey]) {
          _want = _vb.byOffice[_officeKey].district;
          _roster = _vb.byOffice[_officeKey].pids || [];
        }
        // The voter's own saved U.S. House district is authoritative for Congress
        // even outside a curated Utah area (e.g. another state's voter).
        if (_officeKey === 'representative' && userDistrict) {
          var _ud = parseInt(userDistrict, 10);
          if (!isNaN(_ud)) _want = _ud;
        }
        if (_want != null && !isNaN(_want)) {
          // Anyone on the voter's own curated roster for this seat is always their
          // representative — kept even if a synced record lost its district number.
          if (_roster.indexOf(pid) !== -1) return true;
          var _pDist = _relevantDistNum(pid);
          if (_pDist !== null) return _pDist === _want;
          // A district-office politician whose district we cannot resolve AND who
          // is not on the voter's roster is NOT this voter's representative. This
          // is the strict-relevance fix: a neighbouring-district legislator whose
          // record was overwritten with a bare "Utah" (no district) used to slip
          // through here and leak into the ballot (e.g. a Weber-County senator
          // showing for a Davis-County voter). Now they are excluded outright.
          return false;
        }
        // When we could not establish the voter's own district for this office
        // (uncurated area, no saved district) we fall through to the broader
        // state/county heuristics below rather than hide a possibly-correct rep.
      }

      // If user saved a county/city string, use it ONLY to refine state-legislative
      // and local offices (state senate/house, mayor, council, school board) down to
      // the user's area. Federal offices (U.S. House for the matched district, U.S.
      // Senate) and statewide executives always represent the user and must never be
      // removed by an optional county/city entry. Fully national — no Utah special-casing.
      if (userCounty) {
        var _fedSenate = (polOffice.indexOf('senator') !== -1 && polOffice.indexOf('state') === -1);
        var _statewideExec = (polOffice.indexOf('governor') !== -1 || polOffice.indexOf('attorney general') !== -1 ||
                              polOffice.indexOf('treasurer') !== -1 || polOffice.indexOf('auditor') !== -1 ||
                              polOffice.indexOf('secretary') !== -1 || polOffice.indexOf('lieutenant') !== -1 ||
                              polOffice.indexOf('lt. gov') !== -1);
        var _isFederalOrStatewide = (_isUSHouse || _fedSenate || _statewideExec || polOffice.indexOf('u.s.') !== -1);
        if (!_isFederalOrStatewide) {
          // Match the county ONLY against authoritative location fields — the
          // state/district label and the office text — NOT the free-text bio or
          // headline quote. County names like "Davis", "Weber" and "Washington"
          // are common surnames and bio words, so scanning the bio pulled in
          // unrelated people by coincidence and bloated this list. Keeping the
          // scan to real location data is what makes "Relevant To Me" precise.
          var hay = (polStateRaw + ' ' + (d.office || '') + ' ' + (d.district || '')).toLowerCase();
          if (hay.indexOf(userCounty) === -1) return false;
        }
      }

      // Statewide offices for the user's state are always relevant.
      var isStatewideSenator = polOffice.includes('senator') && !polOffice.includes('state');
      if (isStatewideSenator || polOffice.includes('governor') || polOffice.includes('auditor') || (polOffice.includes('candidate') && !polOffice.includes('district') && !polOffice.includes('house') && !polOffice.includes('senate'))) {
        return true;
      }

      return true;
    }

    // ── "📍 Local" badge gate ──────────────────────────────────────────
    // The Local badge marks a politician as one of the user's OWN local / state
    // representatives. It is shown ONLY when the user has actually saved a
    // location and this politician represents that location — never hardcoded to
    // Utah. Federal-executive figures (President, Cabinet, etc.) affect every
    // American but are not "local", so they never receive the badge.
    function _pdxIsLocalToUser(pid) {
      if (!window._hasUserLocation) return false;
      var d = CMP_DATA[pid];
      if (!d) return false;
      var office = (d.office || '').toLowerCase();
      if (office.indexOf('president') !== -1 || office.indexOf('secretary') !== -1 ||
          office.indexOf('director of nat') !== -1 || office.indexOf('defense') !== -1 ||
          office.indexOf('intelligence') !== -1) {
        return false;
      }
      return (typeof _isRelevantToUser === 'function') ? _isRelevantToUser(pid) : false;
    }
    // Exposed so external modules (e.g. the H.R.1 Showcase receipts grid) can put
    // the visitor's own representatives first without duplicating the state/district
    // matcher. Returns false when no location is set, so callers naturally fall back
    // to their default ordering.
    window._pdxIsLocalToUser = _pdxIsLocalToUser;

    // Contextual empty state for the All Politicians / Search / Relevant To Me
    // browse grid. Instead of one generic "No results" message, it explains WHY
    // the list is empty for the situation the visitor is actually in and offers a
    // concrete next step — clear filters, set a location, or widen the scope.
    function _renderBrowseEmpty(o) {
      o = o || {};
      var btn = 'display:inline-flex;align-items:center;justify-content:center;gap:0.45rem;cursor:pointer;font-family:\'Barlow Condensed\',sans-serif;font-weight:700;font-size:0.72rem;letter-spacing:0.06em;text-transform:uppercase;border-radius:0.7rem;padding:0.6rem 1.2rem;min-height:44px;transition:all 0.2s;';
      var btnPrimary = btn + 'color:#fff;background:linear-gradient(135deg,#c0152a,#7f1d1d);border:1px solid rgba(248,113,113,0.5);box-shadow:0 6px 18px rgba(192,21,42,0.3);';
      var btnGhost = btn + 'color:#cbd9ee;background:rgba(30,53,96,0.4);border:1px solid rgba(117,150,192,0.35);';
      var wrap = function(ico, title, sub, actions) {
        return '<div style="max-width:30rem;margin:0 auto;">' +
          '<div style="font-size:2.6rem;margin-bottom:0.5rem;opacity:0.55;">' + ico + '</div>' +
          '<div class="font-display text-xl tracking-wider text-white" style="margin-bottom:0.4rem;">' + title + '</div>' +
          '<p class="font-condensed text-steel-400" style="font-size:0.9rem;line-height:1.55;margin:0 auto 1.2rem;max-width:26rem;">' + sub + '</p>' +
          (actions ? '<div style="display:flex;flex-wrap:wrap;gap:0.6rem;justify-content:center;">' + actions + '</div>' : '') +
        '</div>';
      };

      // Issue-first escape hatch. A query that names an ISSUE ("guns", "housing",
      // "who backs immigration") found nobody by name — but the issue itself may be
      // well documented, so offer the ranked comparison instead of a dead end.
      var issueBtn = '';
      try {
        if (o.search && window.PDXIssueView && typeof window.PDXIssueView.parseQuestion === 'function') {
          var ip = window.PDXIssueView.parseQuestion(o.search);
          if (ip) {
            var safeKey = String(ip.coreKey || '').replace(/[^a-z0-9_]/gi, '');
            var safeFocus = String(ip.focusKey || '').replace(/[^a-z0-9_]/gi, '');
            var safeMode = (ip.mode === 'consistent' || ip.mode === 'contradiction') ? ip.mode : '';
            var lbl = String(ip.label || '').replace(/[<>&"]/g, '');
            var cov = window.PDXIssueView.coverage(safeKey, { focusKey: safeFocus });
            if (safeKey && cov && cov.people > 0) {
              issueBtn = '<button type="button" style="' + btnGhost + '" onclick="window.PDXIssueView.open(\'' + safeKey +
                '\',{focusKey:\'' + safeFocus + '\',mode:\'' + safeMode + '\'})">🧭 See who backs up ' + lbl +
                ' (' + cov.people + ' ranked)</button>';
            }
          }
        }
      } catch (e) {}

      if (o.hasFilters) {
        var searchNote = o.search
          ? 'Nothing matched <span class="text-amber-300">&ldquo;' + String(o.search).replace(/</g, '&lt;').substring(0, 24) + '&rdquo;</span> with your current filters.'
          : 'No politicians match the filters you have set.';
        return wrap('🔍', 'No matches found',
          searchNote + ' Try a broader search term or remove a filter to see more of the field.',
          '<button type="button" style="' + btnPrimary + '" onclick="myteamBrowseReset()">✕ Clear all filters</button>' + issueBtn);
      }

      if (o.scope === 'relevant') {
        return wrap('📍', 'Set your location to see your races',
          'The <span class="text-blue-300">Relevant To Me</span> view shows the officials and 2026 candidates tied to your address. Add your location and your personal ballot fills in here — or browse every database in the meantime.',
          '<button type="button" style="' + btnPrimary + '" onclick="if(window.toggleChangeLocation)window.toggleChangeLocation();">📍 Set my location</button>' +
          '<button type="button" style="' + btnGhost + '" onclick="setBrowseScope(\'all\')">Browse all databases</button>');
      }

      return wrap('🗂️', 'Nothing to show yet',
        'There are no politicians to display here right now. New officials and candidates are added as records are verified — check back soon.',
        '<button type="button" style="' + btnPrimary + '" onclick="myteamBrowseReset()">Reset view</button>');
    }

    // ══ Smart search engine ═══════════════════════════════════════════════
    // Everything below turns the single browse search box into a semantic,
    // intent-aware finder. A voter can type a topic ("guns", "education"), an
    // office ("US House", "state senate"), a district ("district 2", "Davis
    // County"), or a goal ("best match for me", "pledge receipts") and get
    // the right people — not just literal name matches. The pieces:
    //   • _SEARCH_SYNONYMS  — casual word → the family of related terms
    //   • _pdxTopicIndex    — token → expansion set, built from ISSUE_MAP + above
    //   • _pdxQueryConcepts — split a query into AND-ed concept groups (each an
    //                          OR-set of synonyms), so "guns" reaches "firearm"
    //                          / "2nd Amendment" without losing precision
    //   • _pdxParseIntent   — pull office / score / status / district / sort /
    //                          location goals out of the query as soft filters
    //   • _pdxHay           — memoized per-politician search text (kept fast as
    //                          the database grows)

    // Casual terms a voter is likely to type, each mapped to the full family of
    // words that should match. Layered ON TOP of ISSUE_MAP's own keyword lists
    // so even bare/plural/colloquial words ("guns", "abortion", "cops") reach
    // every politician with a documented position on that topic.
    var _SEARCH_SYNONYMS = {
      guns: ['gun', 'guns', 'firearm', 'firearms', 'second amendment', '2nd amendment', '2a', 'concealed carry', 'constitutional carry', 'nra', 'gun rights', 'gun safety', 'gun control', 'gun violence', 'red flag', 'background check', 'assault weapon'],
      abortion: ['abortion', 'reproductive', 'pro-life', 'pro life', 'pro-choice', 'pro choice', 'roe', 'dobbs', 'planned parenthood', 'unborn', 'reproductive rights', 'reproductive freedom', 'contraception'],
      taxes: ['tax', 'taxes', 'income tax', 'property tax', 'tax cut', 'tax relief', 'fiscal', 'deduction', 'tax credit'],
      education: ['education', 'school', 'schools', 'teacher', 'teachers', 'student', 'students', 'voucher', 'charter', 'tuition', 'college', 'curriculum', 'classroom', 'school choice', 'public school'],
      healthcare: ['healthcare', 'health care', 'health', 'medicaid', 'medicare', 'insurance', 'prescription', 'drug price', 'drug prices', 'aca', 'obamacare', 'mental health', 'hospital'],
      immigration: ['immigration', 'border', 'migrant', 'deportation', 'asylum', 'visa', 'daca', 'citizenship', 'cartel', 'fentanyl', 'dreamer'],
      economy: ['economy', 'jobs', 'wages', 'employment', 'small business', 'workers', 'manufacturing', 'inflation', 'cost of living', 'economic growth', 'minimum wage'],
      housing: ['housing', 'rent', 'renters', 'affordable housing', 'zoning', 'mortgage', 'homeowner', 'homeless', 'homelessness', 'first-time buyer', 'property tax'],
      climate: ['climate', 'clean energy', 'renewable', 'renewables', 'emissions', 'carbon', 'environment', 'pollution', 'solar', 'wind', 'air quality', 'great salt lake'],
      energy: ['energy', 'oil', 'gas', 'nuclear', 'renewable', 'grid', 'drilling', 'mining', 'fossil', 'energy independence'],
      crime: ['crime', 'police', 'cops', 'law enforcement', 'public safety', 'criminal justice', 'sentencing', 'sheriff', 'violent crime', 'incarceration'],
      veterans: ['veteran', 'veterans', 'va', 'gi bill', 'servicemember', 'military families', 'troops', 'wounded warrior'],
      lgbtq: ['lgbtq', 'lgbt', 'gay', 'transgender', 'marriage equality', 'pride', 'anti-discrimination'],
      water: ['water', 'drought', 'great salt lake', 'reservoir', 'colorado river', 'water conservation', 'water storage', 'lake powell'],
      defense: ['defense', 'military', 'national security', 'armed forces', 'pentagon', 'foreign policy', 'ndaa', 'deterrence'],
      spending: ['spending', 'debt', 'deficit', 'budget', 'fiscal', 'waste', 'audit', 'balanced budget', 'national debt'],
      accountability: ['accountability', 'transparency', 'ethics', 'corruption', 'stock trading', 'term limits', 'campaign finance', 'anti-corruption', 'disclosure'],
      family: ['family', 'child care', 'childcare', 'paid leave', 'child tax credit', 'parental rights', 'pre-k', 'daycare'],
      tech: ['tech', 'technology', 'ai', 'artificial intelligence', 'privacy', 'big tech', 'social media', 'data privacy', 'crypto'],
      lands: ['public land', 'public lands', 'conservation', 'wilderness', 'national park', 'national monument', 'blm', 'forest', 'grazing'],
      voting: ['voting', 'elections', 'voter id', 'election integrity', 'election security', 'ballot access', 'proof of citizenship', 'mail voting', 'early voting', 'ballot', 'redistricting', 'democracy']
    };

    // Word-singularizer used so "guns"/"schools"/"taxes" reach the singular
    // forms ISSUE_MAP stores ("gun rights", "school choice", "tax cut").
    function _pdxSingular(w) {
      if (!w) return w;
      if (/(ches|shes|sses|xes)$/.test(w)) return w.slice(0, -2);
      if (/ies$/.test(w)) return w.slice(0, -3) + 'y';
      if (/s$/.test(w) && !/ss$/.test(w) && w.length > 3) return w.slice(0, -1);
      return w;
    }

    // Lazily-built map: a single search word → Set of every related expansion
    // word it should pull in. Assembled once from ISSUE_MAP's keyword lists
    // (authoritative) and the curated synonyms above, then cached.
    var _pdxTopicIndex = null;
    function _pdxBuildTopicIndex() {
      if (_pdxTopicIndex) return _pdxTopicIndex;
      var idx = {};
      var addWordToGroup = function(word, group) {
        if (!word || word.length < 3) return;
        if (!idx[word]) idx[word] = {};
        for (var i = 0; i < group.length; i++) idx[word][group[i]] = 1;
      };
      // From ISSUE_MAP: every keyword (and each of its individual words) indexes
      // to the union of that issue's keyword family + its label words.
      if (typeof ISSUE_MAP !== 'undefined' && ISSUE_MAP) {
        Object.keys(ISSUE_MAP).forEach(function(k) {
          var def = ISSUE_MAP[k];
          if (!def || !def.keywords) return;
          var bag = def.keywords.slice();
          // fold the human label (minus emoji) into the family so "school choice"
          // is reachable by typing the label's words too.
          var labelWords = String(def.label || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean);
          bag = bag.concat(labelWords);
          def.keywords.forEach(function(kw) {
            var kwl = kw.toLowerCase();
            addWordToGroup(kwl, bag);
            kwl.split(/\s+/).forEach(function(w) { addWordToGroup(w, bag); });
          });
          labelWords.forEach(function(w) { addWordToGroup(w, bag); });
        });
      }
      // Layer the curated synonyms on top (these win/extend for casual words).
      Object.keys(_SEARCH_SYNONYMS).forEach(function(key) {
        var group = _SEARCH_SYNONYMS[key];
        addWordToGroup(key, group);
        group.forEach(function(w) {
          addWordToGroup(w, group);
          w.split(/\s+/).forEach(function(part) { addWordToGroup(part, group); });
        });
      });
      _pdxTopicIndex = idx;
      return idx;
    }

    // Look up the expansion family for one query word (tries the word and its
    // singular form). Returns an array of related words, or null if the word is
    // not a recognized topic term.
    function _pdxExpandWord(word) {
      var idx = _pdxBuildTopicIndex();
      var hit = idx[word] || idx[_pdxSingular(word)];
      return hit ? Object.keys(hit) : null;
    }

    // Words that carry no search signal on their own — dropped from concept
    // building so a stray "the"/"for"/"in" never becomes an AND requirement.
    var _PDX_SEARCH_STOP = { the: 1, a: 1, an: 1, and: 1, or: 1, of: 1, for: 1, to: 1, in: 1, on: 1, with: 1, 'my': 1, me: 1, 'is': 1, are: 1, who: 1, that: 1, best: 1, most: 1, strong: 1, high: 1, low: 1, good: 1 };

    // Break a (already intent-stripped) query into concept groups: each group is
    // an OR-set of words, and a politician must satisfy EVERY group (AND) to
    // match. A recognized topic word expands to its whole synonym family (one
    // OR-group); an unrecognized word stays a literal single-word group. This is
    // what lets "guns" surface firearm/2A positions while "lee guns" still means
    // "named Lee AND talks about guns".
    function _pdxQueryConcepts(text) {
      var tokens = String(text || '').toLowerCase().replace(/[^a-z0-9\s']/g, ' ').split(/\s+/).filter(Boolean);
      var groups = [];
      var hadTopic = false;
      tokens.forEach(function(tok) {
        if (_PDX_SEARCH_STOP[tok]) return;
        var expanded = _pdxExpandWord(tok);
        if (expanded && expanded.length) {
          // ensure the literal token is also in the OR-set
          if (expanded.indexOf(tok) === -1) expanded.push(tok);
          groups.push(expanded);
          hadTopic = true;
        } else if (tok.length >= 2) {
          groups.push([tok]);
        }
      });
      return { groups: groups, hadTopic: hadTopic };
    }

    // ── Browse search index ────────────────────────────────────────────
    // Builds the searchable text for one politician. Goes well beyond name +
    // office: it folds in the party (spelled out so "republican" matches "R"),
    // the home state / district token, key issues, the bio, the headline quote
    // and every recorded stance, plus status words ("incumbent", "candidate",
    // "2026") so a single search box reaches everything a voter might type.
    function _browseSearchHay(d) {
      if (!d) return '';
      var parts = [d.name, d.office, d.state, d.district, d.bio, d.quote, d.tagline, d.summary];
      if (Array.isArray(d.issues)) parts = parts.concat(d.issues);
      if (d.stances && typeof d.stances === 'object') {
        for (var k in d.stances) { if (d.stances[k]) parts.push(d.stances[k]); }
      }
      var pk = _browsePartyKey(d);
      if (pk === 'R') parts.push('republican gop');
      else if (pk === 'D') parts.push('democrat democratic');
      else if (pk === 'I') parts.push('independent');
      var status = (typeof window._pdxOfficeStatus === 'function') ? window._pdxOfficeStatus(d) : 'office';
      if (status === 'candidate') parts.push('candidate challenger running 2026 ' + (window._pdx2026Candidate && window._pdx2026Candidate(d) ? '2026 candidate' : ''));
      else if (status === 'former') parts.push('former previous');
      else parts.push('incumbent officeholder in office current');
      return parts.filter(Boolean).join(' ').toLowerCase();
    }

    // Does this politician's NAME match every search term? Each term must be the
    // start of some name token (case-insensitive), so "lee" matches the "Lee" in
    // "Mike Lee" and "Trevor Lee", "mc" matches "McConnell", and "mike lee" matches
    // both tokens in any order — but a stray "lee" buried in a bio, district or
    // issue never counts. This token-prefix rule is what makes a name search feel
    // precise and predictable: type a name and you get people with that name.
    function _browseNameMatch(d, terms) {
      if (!d || !d.name) return false;
      var tokens = String(d.name).toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(Boolean);
      if (!tokens.length) return false;
      for (var i = 0; i < terms.length; i++) {
        var term = terms[i];
        var hit = false;
        for (var j = 0; j < tokens.length; j++) {
          if (tokens[j].indexOf(term) === 0) { hit = true; break; }
        }
        if (!hit) return false;
      }
      return true;
    }

    // Normalize a free-form party string ('R', 'D', 'I (D caucus)', 'Ind.',
    // 'I→R', etc.) down to a single bucket the Party filter can match against.
    function _browsePartyKey(d) {
      var p = (d && d.party ? String(d.party) : '').trim().toUpperCase();
      if (!p) return '';
      var c = p.charAt(0);
      if (c === 'R') return 'R';
      if (c === 'D') return 'D';
      if (c === 'I') return 'I';
      return 'I'; // any other label (Green, Libertarian, etc.) groups under Independent / Other
    }

    // Memoized search text per politician. _browseSearchHay is pure for a given
    // record, so we cache the lowercased haystack keyed by pid and reuse it
    // across keystrokes — keeping search fast as the database grows. The cache
    // is cleared whenever records are edited/imported via _pdxClearHayCache.
    var _pdxHayCache = {};
    function _pdxHay(pid) {
      if (_pdxHayCache[pid] !== undefined) return _pdxHayCache[pid];
      var hay = _browseSearchHay(CMP_DATA[pid]);
      _pdxHayCache[pid] = hay;
      return hay;
    }
    window._pdxClearHayCache = function() { _pdxHayCache = {}; };

    // The voter's own U.S. House district number, if they've saved a location.
    function _pdxUserDistrictNum() {
      var loc = window._currentVoterLocation || {};
      var n = parseInt(String(loc.district || '').replace(/[^0-9]/g, ''), 10);
      return isNaN(n) ? null : n;
    }

    // ── Search intent parser ───────────────────────────────────────────
    // Reads goals out of the raw query that are NOT just "find this text": an
    // office type, a promise-score band, officeholder-vs-candidate status, a
    // district number, a "best match for me" sort, or a "my district/near me"
    // location scope. Each recognized phrase is pulled OUT of the text so the
    // remaining words drive the topic/name search, and the goal is returned as a
    // soft filter the browse pipeline applies. Returns:
    //   { office, score, status, sortAlign, scope, district, text, notes[] }
    function _pdxParseSearchIntent(raw) {
      var q = ' ' + String(raw || '').toLowerCase() + ' ';
      var out = { office: '', score: '', status: '', sortAlign: false, scope: '', district: null, text: '', notes: [] };
      var strip = function(re) { q = q.replace(re, ' '); };

      // District number ("district 2", "hd 15", "sd-3", "cd2"). Recognized as a
      // structured filter and stripped, so it narrows by district rather than
      // matching the literal word "district" in every district-holder's record.
      var dm = q.match(/\bdistrict\s*(\d{1,2})\b/) || q.match(/\b(?:hd|sd|cd|ud)[-\s]?(\d{1,2})\b/);
      if (dm) {
        out.district = parseInt(dm[1], 10);
        out.notes.push('District ' + out.district);
        strip(/\bdistrict\s*\d{1,2}\b/);
        strip(/\b(?:hd|sd|cd|ud)[-\s]?\d{1,2}\b/);
      }

      // Office type — check the more specific STATE patterns before the federal
      // ones so "state senate" never reads as "senate".
      var officePats = [
        { re: /\b(state senate|state house|state legislature|state legislator|state rep(resentative)?|state senator|statehouse|legislature)\b/, key: 'state', label: 'State Legislature' },
        { re: /\b(u\.?s\.?\s*house|us house|house of representatives|congress(man|woman|person|ional)?|representative)\b/, key: 'representative', label: 'U.S. House' },
        { re: /\b(u\.?s\.?\s*senate|us senate|senator|senate seat)\b/, key: 'senator', label: 'U.S. Senate' },
        { re: /\b(governor|gubernatorial|attorney general|statewide|state treasurer|state auditor|lieutenant governor|lt\.?\s*gov)\b/, key: 'governor', label: 'Statewide Executive' },
        { re: /\b(president|presidential|white house)\b/, key: 'president', label: 'President' },
        { re: /\b(mayor|mayoral|city council|county commission|local office)\b/, key: 'local', label: 'Local / Mayor' },
        { re: /\b(cabinet|secretary of)\b/, key: 'cabinet', label: 'Cabinet' }
      ];
      for (var i = 0; i < officePats.length; i++) {
        if (officePats[i].re.test(q)) { out.office = officePats[i].key; out.notes.push(officePats[i].label); strip(officePats[i].re); break; }
      }

      // Pledge-record intent. There is no longer a rate to sort "high" from
      // "low", so both phrasings resolve to the same honest thing the lane can
      // answer: this record has resolved pledges on file. The note says that
      // rather than implying a band the filter cannot deliver.
      if (/\b(high(est)?\s*(promise\s*)?score|high\s*accountability|most\s*accountable|keeps?\s*(their\s*)?promises|pledge\s*receipts?|promise\s*records?|reliable|trustworthy)\b/.test(q)) {
        out.score = 'receipts'; out.notes.push('Has pledge receipts'); strip(/\b(high(est)?\s*(promise\s*)?score|high\s*accountability|most\s*accountable|keeps?\s*(their\s*)?promises|pledge\s*receipts?|promise\s*records?|reliable|trustworthy)\b/);
      } else if (/\b(low(est)?\s*(promise\s*)?score|broken\s*promises|least\s*accountable)\b/.test(q)) {
        out.score = 'receipts'; out.notes.push('Has pledge receipts'); strip(/\b(low(est)?\s*(promise\s*)?score|broken\s*promises|least\s*accountable)\b/);
      }

      // Officeholder vs candidate status (incl. "open seats" → races with candidates).
      if (/\b(open\s*seats?|2026\s*candidates?|candidates?|challengers?|running\s*for|on\s*the\s*ballot)\b/.test(q)) {
        out.status = 'candidate'; out.notes.push('2026 candidates'); strip(/\b(open\s*seats?|2026\s*candidates?|candidates?|challengers?|running\s*for|on\s*the\s*ballot)\b/);
      } else if (/\b(incumbents?|officeholders?|current(ly)?\s*in\s*office|sitting)\b/.test(q)) {
        out.status = 'office'; out.notes.push('Current officeholders'); strip(/\b(incumbents?|officeholders?|current(ly)?\s*in\s*office|sitting)\b/);
      }

      // "Best match for me" → values-aligned sort.
      if (/\b(best|top|closest|strong(est)?|high(est)?)\s*(match(es)?|fit|alignment)\b/.test(q) ||
          /\bmatch(es)?\s*(me|my\s*values)\b/.test(q) || /\bfor\s*me\b/.test(q) || /\bmy\s*values\b/.test(q) ||
          /\b(aligned|alignment)\b/.test(q)) {
        out.sortAlign = true; out.notes.push('Best match first');
        strip(/\b(best|top|closest|strong(est)?|high(est)?)\s*(match(es)?|fit|alignment)\b/);
        strip(/\bmatch(es)?\s*(me|my\s*values)\b/); strip(/\bfor\s*me\b/); strip(/\bmy\s*values\b/); strip(/\b(aligned|alignment)\b/);
      }

      // Location scope ("my district", "near me", "my reps", "in my area").
      if (/\b(my\s*district|my\s*area|near\s*me|my\s*reps?|my\s*representatives?|relevant\s*to\s*me|on\s*my\s*ballot)\b/.test(q)) {
        out.scope = 'relevant'; out.notes.push('Your districts');
        strip(/\b(my\s*district|my\s*area|near\s*me|my\s*reps?|my\s*representatives?|relevant\s*to\s*me|on\s*my\s*ballot)\b/);
      }

      out.text = q.replace(/\s+/g, ' ').trim();
      return out;
    }

    window.myteamBrowseFilter = function() {
      var browseGrid = document.getElementById('myteam-browse-grid');
      var browseEmpty = document.getElementById('myteam-browse-empty');
      var browseCount = document.getElementById('myteam-browse-count');
      var browseCountLabel = document.getElementById('myteam-browse-count-label');
      if (!browseGrid) return;

      // Keep the state filter honest with the live roster: rebuild the complete
      // dropdown the first time and whenever the roster size changes (e.g. after
      // the Firestore merge adds records), preserving the current selection.
      if (window._pdxStateFilterBuiltFor !== Object.keys(CMP_DATA).length &&
          typeof window._pdxPopulateStateFilter === 'function') {
        window._pdxPopulateStateFilter();
      }

      var search = (document.getElementById('myteam-browse-search')?.value || '').toLowerCase().trim();
      var office = document.getElementById('myteam-browse-office')?.value || '';
      var party = document.getElementById('myteam-browse-party')?.value || '';
      var statusF = document.getElementById('myteam-browse-status')?.value || '';
      var stateFilter = document.getElementById('myteam-browse-state')?.value || '';
      var score = document.getElementById('myteam-browse-score')?.value || '';
      var show = document.getElementById('myteam-browse-show')?.value || 'all';
      var sort = document.getElementById('myteam-browse-sort')?.value || 'score-desc';

      // ── Smart query parsing ─────────────────────────────────────────────
      // Pull goals (office type, promise-score band, officeholder/candidate
      // status, district number, "best match for me" sort, "my district" scope)
      // out of the typed text and apply them as soft filters on top of the
      // explicit dropdowns. Recognized phrases are stripped so the remaining
      // words drive the topic/name search. A dropdown the voter set themselves
      // always wins over an inferred one.
      var _intent = search
        ? _pdxParseSearchIntent(search)
        : { office: '', score: '', status: '', sortAlign: false, scope: '', district: null, text: '', notes: [] };
      var _searchText = _intent.text;
      var effOffice = office || _intent.office;
      var effScore  = score  || _intent.score;
      var effStatus = statusF || _intent.status;
      var effScope  = (_browseScope === 'relevant' || _intent.scope === 'relevant') ? 'relevant' : 'all';

      // When the visitor has an Alignment Signature, default the browse to "Best
      // Match for You" so the candidates that fit their values surface first while
      // filling a slot — unless they've deliberately picked another sort. A typed
      // "best match for me" forces it on regardless. Flagging a switch back to
      // score-desc when alignment is turned off keeps it honest.
      var _alignActive = (typeof _alignIssues !== 'undefined' && _alignIssues && _alignIssues.size > 0);
      var _sortEl = document.getElementById('myteam-browse-sort');
      if (_intent.sortAlign && _alignActive) {
        sort = 'align-desc';
        if (_sortEl && _sortEl.value !== 'align-desc') _sortEl.value = 'align-desc';
      } else if (window._myteamBrowseSortAuto !== false) {
        var _want = _alignActive ? 'align-desc' : 'score-desc';
        if (sort !== _want) { sort = _want; if (_sortEl && _sortEl.value !== _want) _sortEl.value = _want; }
      }
      // Drives best-match-first ordering inside each district group in the grouped browse.
      window._alignBrowseSortActive = (_alignActive && sort === 'align-desc');

      var clearBtn = document.getElementById('browse-search-clear');
      if (clearBtn) clearBtn.classList.toggle('visible', search.length > 0);

      ['myteam-browse-office','myteam-browse-party','myteam-browse-status','myteam-browse-state','myteam-browse-score','myteam-browse-show'].forEach(function(id) {
        var el = document.getElementById(id);
        if (el) el.classList.toggle('has-value', el.value !== '' && el.value !== 'all');
      });

      var activeCount = 0;
      if (search) activeCount++;
      if (office) activeCount++;
      if (party) activeCount++;
      if (statusF) activeCount++;
      if (stateFilter) activeCount++;
      if (score) activeCount++;
      if (window._acctHighOnly) activeCount++;
      if (show && show !== 'all') activeCount++;

      var collapsedCountBadge = document.getElementById('collapsed-filter-count-badge');
      if (collapsedCountBadge) {
        if (activeCount > 0) {
          collapsedCountBadge.textContent = activeCount;
          collapsedCountBadge.classList.remove('hidden');
        } else {
          collapsedCountBadge.classList.add('hidden');
        }
      }

      var chipArea = document.getElementById('browse-active-filters');
      if (chipArea) {
        var chips = [];
        var filterLabels = {
          'president': 'President / Executive', 'senator': 'U.S. Senator', 'representative': 'U.S. Representative',
          'governor': 'Statewide Exec', 'state': 'State Legislator', 'local': 'Local / Mayor',
          'candidate': 'Candidate / Nominee', 'cabinet': 'Cabinet / Appointed'
        };
        var scoreLabels = { 'receipts': 'Has pledge receipts', 'tracking': 'Pledges tracked, none resolved', 'none': 'No pledge record yet',
                            'high': 'Has pledge receipts', 'mid': 'Has pledge receipts', 'low': 'Has pledge receipts', 'na': 'No pledge record yet' };
        var partyLabels = { 'R': 'Republican', 'D': 'Democrat', 'I': 'Independent / Other' };
        var statusLabels = { 'office': 'Current Officeholder', 'candidate': '2026 Candidate' };
        var showLabels = { 'not-on-team': 'Not on My Team', 'on-team': 'On My Team Only' };

        if (search) chips.push('<span class="browse-chip" onclick="document.getElementById(\'myteam-browse-search\').value=\'\';myteamBrowseFilter();">🔍 &ldquo;' + search.replace(/</g,'&lt;').substring(0,20) + (search.length > 20 ? '…' : '') + '&rdquo;<span class="chip-x">&times;</span></span>');
        if (office) chips.push('<span class="browse-chip" onclick="document.getElementById(\'myteam-browse-office\').value=\'\';myteamBrowseFilter();">🏛 ' + (filterLabels[office] || office) + '<span class="chip-x">&times;</span></span>');
        if (statusF) chips.push('<span class="browse-chip" onclick="document.getElementById(\'myteam-browse-status\').value=\'\';myteamBrowseFilter();">' + (statusF === 'candidate' ? '🗳️ ' : '✅ ') + (statusLabels[statusF] || statusF) + '<span class="chip-x">&times;</span></span>');
        if (party) chips.push('<span class="browse-chip" onclick="document.getElementById(\'myteam-browse-party\').value=\'\';myteamBrowseFilter();">🎗 ' + (partyLabels[party] || party) + '<span class="chip-x">&times;</span></span>');
        if (stateFilter) chips.push('<span class="browse-chip" onclick="document.getElementById(\'myteam-browse-state\').value=\'\';myteamBrowseFilter();">📍 ' + stateFilter + '<span class="chip-x">&times;</span></span>');
        if (score) chips.push('<span class="browse-chip" onclick="document.getElementById(\'myteam-browse-score\').value=\'\';myteamBrowseFilter();">📊 ' + (scoreLabels[score] || score) + '<span class="chip-x">&times;</span></span>');
        if (window._acctHighOnly) chips.push('<span class="browse-chip" onclick="window._acctHighOnly=false;myteamBrowseFilter();">🛡️ High Accountability<span class="chip-x">&times;</span></span>');
        if (show && show !== 'all') chips.push('<span class="browse-chip" onclick="document.getElementById(\'myteam-browse-show\').value=\'all\';myteamBrowseFilter();">👥 ' + (showLabels[show] || show) + '<span class="chip-x">&times;</span></span>');

        if (chips.length > 0) {
          chips.push('<button class="browse-clear-btn" onclick="myteamBrowseReset()"><svg style="width:0.7rem;height:0.7rem;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"/></svg>Clear All</button>');
        }
        chipArea.innerHTML = chips.join('');
      }

      var pids = Object.keys(CMP_DATA);

      if (effScope === 'relevant') {
        pids = pids.filter(function(pid) { return _isRelevantToUser(pid); });
      }

      if (show === 'not-on-team') {
        pids = pids.filter(function(pid) { return !_myPoliticians.has(pid); });
      } else if (show === 'on-team') {
        pids = pids.filter(function(pid) { return _myPoliticians.has(pid); });
      }

      window._browseNameScoped = false;
      if (_searchText) {
        // Name-priority search. Typing a name should surface people with that
        // name — not everyone who merely mentions the term in a bio, district or
        // issue. So we first look for politicians whose NAME matches every typed
        // term (token-prefix, case-insensitive: "lee" → Mike Lee / Trevor Lee,
        // "tre lee" → Trevor Lee). When the query is purely a name (no topic word
        // and no structured intent), we scope results to those name matches.
        // Otherwise we run the semantic, synonym-expanded search across every
        // field — so "guns" reaches Second-Amendment positions, "education"
        // reaches school-choice / teacher-pay records, and so on.
        var rawTerms = search.split(/\s+/).filter(Boolean);
        var nameMatches = pids.filter(function(pid) {
          return _browseNameMatch(CMP_DATA[pid], rawTerms);
        });
        var hasStructuredIntent = !!(_intent.office || _intent.score || _intent.status ||
          _intent.district != null || _intent.sortAlign || _intent.scope);
        var concepts = _pdxQueryConcepts(_searchText);
        if (nameMatches.length > 0 && !hasStructuredIntent && !concepts.hadTopic) {
          pids = nameMatches;
          window._browseNameScoped = true;
        } else if (concepts.groups.length) {
          pids = pids.filter(function(pid) {
            var hay = _pdxHay(pid);
            if (!hay) return false;
            // Every concept group must hit (AND); within a group any synonym hits (OR).
            for (var g = 0; g < concepts.groups.length; g++) {
              var grp = concepts.groups[g], hit = false;
              for (var w = 0; w < grp.length; w++) {
                if (hay.indexOf(grp[w]) !== -1) { hit = true; break; }
              }
              if (!hit) return false;
            }
            return true;
          });
        }
      }

      // District filter from a "district N" style query — by the politician's
      // resolved district number, with a literal-text fallback.
      if (_intent.district != null) {
        pids = pids.filter(function(pid) {
          var dn = (typeof _relevantDistNum === 'function') ? _relevantDistNum(pid) : null;
          if (dn === _intent.district) return true;
          var dtxt = (CMP_DATA[pid].district || '').toLowerCase();
          return dtxt.indexOf('district ' + _intent.district) !== -1 ||
                 new RegExp('(^|[^0-9])' + _intent.district + '([^0-9]|$)').test(dtxt);
        });
      }

      if (effOffice) pids = pids.filter(function(pid) { return _chubOfficeMatch(pid, effOffice); });
      if (party) pids = pids.filter(function(pid) { return _browsePartyKey(CMP_DATA[pid]) === party; });
      if (effStatus) pids = pids.filter(function(pid) {
        var st = (typeof window._pdxOfficeStatus === 'function') ? window._pdxOfficeStatus(CMP_DATA[pid]) : 'office';
        return st === effStatus;
      });
      if (stateFilter) pids = pids.filter(function(pid) { return _chubStateMatch(pid, stateFilter); });
      if (effScore) pids = pids.filter(function(pid) { return _chubScoreMatch(pid, effScore); });

      // "High Accountability" quick filter — keep only politicians whose
      // Accountability of Truth Score is strong (≥65, the green / "Mostly
      // Accountable" band). Thin-record politicians (null) are naturally excluded
      // from this opt-in view; they are never penalized in the default ranking.
      if (window._acctHighOnly && typeof window._acctMatchScore === 'function') {
        pids = pids.filter(function(pid) { var a = window._acctMatchScore(pid); return typeof a === 'number' && a >= 65; });
      }

      // 'score-desc' means the strongest ⚖️ Word vs Action read first — the one
      // published rating. It used to order by pledge receipts; see _waDepth(). The
      // value is unchanged so saved sorts, the alignment fallbacks below and the
      // browse-goal parser keep working.
      if (sort === 'score-desc') {
        pids.sort(function(a, b) { return _waDepth(b) - _waDepth(a); });
      } else if (sort === 'score-asc') {
        pids.sort(function(a, b) { return _waDepth(a) - _waDepth(b); });
      } else if (sort === 'alpha') {
        pids.sort(function(a, b) { return (CMP_DATA[a].name || '').localeCompare(CMP_DATA[b].name || ''); });
      } else if (sort === 'align-desc' && typeof _calcAlignmentScore === 'function') {
        pids.sort(function(a, b) { return (_calcAlignmentScore(b) ?? -1) - (_calcAlignmentScore(a) ?? -1); });
      } else if (sort === 'acct-desc' && typeof window._acctMatchScore === 'function') {
        // Accountability of Truth Score, high → low. Politicians with too thin a
        // record to score (null) sort to the bottom rather than being treated as 0.
        pids.sort(function(a, b) { return (window._acctMatchScore(b) ?? -1) - (window._acctMatchScore(a) ?? -1); });
      }

      // Location prioritization: when a search is active and the voter has saved
      // a location, float the people who actually represent them to the top —
      // stably, so the chosen sort order is preserved within each partition.
      window._browseLocBoosted = 0;
      if (_searchText && window._hasUserLocation && effScope !== 'relevant' && typeof _isRelevantToUser === 'function') {
        var _relPids = [], _otherPids = [];
        pids.forEach(function(pid) { (_isRelevantToUser(pid) ? _relPids : _otherPids).push(pid); });
        if (_relPids.length && _otherPids.length) { pids = _relPids.concat(_otherPids); window._browseLocBoosted = _relPids.length; }
      }

      // The header badge (#myteam-browse-count) is the roster IDENTITY — the total
      // number of tracked politicians, kept in sync by _mypolUpdateCount() and
      // matched by the "… of N profiles" depth line. It must NOT be overwritten
      // with the filtered subset here (that made the header read e.g. "21" while
      // the depth line still said "of 893"). The live filtered/sorted count is
      // shown separately in #myteam-browse-count-label ("N politicians found").
      var scopeLabel = effScope === 'relevant' ? ' relevant' : '';

      // Plain-language scope note under the state tabs, so the current geographic
      // view is always explicit: national by default, a single state when picked.
      var scopeNote = document.getElementById('browse-scope-note');
      if (scopeNote) {
        var _rosterTotal = (typeof CMP_DATA !== 'undefined') ? Object.keys(CMP_DATA).length : pids.length;
        if (!stateFilter) {
          scopeNote.innerHTML = '🇺🇸 <b>All States · National view</b> — browsing every tracked politician ('
            + _rosterTotal.toLocaleString() + ').';
        } else if (stateFilter === 'National') {
          scopeNote.innerHTML = '🏛 <b>National / Federal</b> — showing federal officials only ('
            + pids.length.toLocaleString() + ').';
        } else {
          scopeNote.innerHTML = '📍 <b>' + stateFilter.replace(/</g, '&lt;') + ' only</b> — showing '
            + pids.length.toLocaleString() + ' politician' + (pids.length !== 1 ? 's' : '')
            + ' from ' + stateFilter.replace(/</g, '&lt;') + '.';
        }
        scopeNote.style.display = '';
      }

      // Hand the exact filtered/sorted set to the Best-Matches board launcher so
      // "Rank these by my values" ranks precisely what the visitor is looking at.
      window._myteamLastFilteredPids = pids.slice();
      window._myteamLastFilterDesc = (function() {
        var parts = [];
        if (effStatus) parts.push(effStatus === 'candidate' ? '2026 candidates' : 'officeholders');
        if (party) parts.push({ 'R': 'Republicans', 'D': 'Democrats', 'I': 'Independents' }[party] || party);
        if (stateFilter) parts.push(stateFilter);
        var officeWord = { 'president': 'President', 'senator': 'U.S. Senators', 'representative': 'U.S. Reps', 'governor': 'statewide execs', 'state': 'state legislators', 'local': 'local offices', 'candidate': 'candidates', 'cabinet': 'cabinet' }[effOffice];
        if (officeWord) parts.push(officeWord);
        var d = parts.join(' · ');
        if (_searchText) d = d ? (d + ' matching “' + _searchText + '”') : ('matching “' + _searchText + '”');
        return d;
      })();
      if (typeof window._alignBrowseLauncherSync === 'function') window._alignBrowseLauncherSync();

      if (browseCountLabel) {
        var _matchCue = window._alignBrowseSortActive
          ? ' · <span style="color:#5eead4;font-weight:700;">🎯 Best match for you first</span>'
          : '';
        var _nameCue = (window._browseNameScoped && search)
          ? ' · <span style="color:#fbbf24;font-weight:700;">🔍 Name matches only</span>'
          : '';
        // Surface what the smart query understood ("U.S. House · High score · …")
        // so the parsing is transparent, plus a note when local reps are floated up.
        var _smartCue = (_intent && _intent.notes && _intent.notes.length)
          ? ' · <span style="color:#a5b4fc;font-weight:700;">✨ ' + _intent.notes.join(' · ') + '</span>'
          : '';
        var _locCue = (window._browseLocBoosted > 0)
          ? ' · <span style="color:#7dd3fc;font-weight:700;">📍 Your reps first</span>'
          : '';
        browseCountLabel.innerHTML = pids.length + scopeLabel + ' politician' + (pids.length !== 1 ? 's' : '') + ' found' + _nameCue + _smartCue + _matchCue + _locCue;
      }

      if (pids.length > 0) {
        // Start fully minimized; auto-expand all levels only while a search/filter is active so matches stay visible.
        var _browseHasFilters = !!(_searchText || effOffice || party || effStatus || stateFilter || effScore || window._acctHighOnly || _intent.district != null || (show && show !== 'all') || effScope === 'relevant');
        browseGrid.innerHTML = _renderGroupedBrowse(pids, '', { forceOpen: _browseHasFilters, defaultOpen: false, stateScope: stateFilter });
        if (browseEmpty) browseEmpty.classList.add('hidden');
      } else {
        browseGrid.innerHTML = '';
        if (browseEmpty) {
          browseEmpty.innerHTML = _renderBrowseEmpty({
            scope: effScope,
            hasFilters: !!(search || effOffice || party || effStatus || stateFilter || effScore || _intent.district != null || (show && show !== 'all')),
            search: search
          });
          browseEmpty.classList.remove('hidden');
        }
      }

      if (typeof window._pdxRenderQuickChips === 'function') window._pdxRenderQuickChips();
      if (typeof window._pdxRenderStateTabs === 'function') window._pdxRenderStateTabs();

      if (typeof window.renderRelevantToMe === 'function') {
        window.renderRelevantToMe();
      }
    };

    // Run 3 perf: bio + stances now arrive on demand (cmp-data-detail.js). When
    // they land, drop the memoized search haystack (so bio/stance text becomes
    // searchable) and repaint the roster (so documented-stance chips fill in).
    document.addEventListener('pdx:data:cmpDetail', function () {
      try {
        if (typeof window._pdxClearHayCache === 'function') window._pdxClearHayCache();
        if (typeof window.myteamBrowseFilter === 'function') window.myteamBrowseFilter();
      } catch (e) {}
    });

    // Keep the All-Politicians board launcher label honest about what it will
    // rank: the active filtered subset (with a plain-language description) when
    // filters narrow the list, or the whole field otherwise.
    window._alignBrowseLauncherSync = function() {
      var titleEl = document.getElementById('myteam-board-launch-title');
      var subEl = document.getElementById('myteam-board-launch-sub');
      if (!titleEl || !subEl) return;
      var pids = window._myteamLastFilteredPids || [];
      var desc = window._myteamLastFilterDesc || '';
      var n = pids.length;
      if (desc) {
        titleEl.textContent = 'Rank these ' + n + ' by my values';
        subEl.textContent = 'Score your filtered list (' + desc + ') on the issues you care about, best match first — then add your top fits to your team.';
      } else {
        titleEl.textContent = 'Rank these ' + (n ? n + ' ' : '') + 'politicians by my values';
        subEl.textContent = 'Compare everyone on the issues you care about and add your best matches to your team — no profiles to open.';
      }
    };

    // Launch the Best-Matches board focused on the exact list the visitor has
    // filtered to in All Politicians. Falls back to the full field if nothing is
    // captured yet (e.g. board opened before the first filter pass).
    window._alignBoardFromBrowse = function() {
      var pids = (window._myteamLastFilteredPids || []).slice();
      if (typeof window.openAlignBoard !== 'function') return;
      if (!pids.length) { window.openAlignBoard('all'); return; }
      var desc = window._myteamLastFilterDesc || '';
      window.openAlignBoard('__focus', {
        pids: pids,
        label: desc ? (desc.length > 42 ? desc.slice(0, 40) + '…' : desc) : 'All politicians',
        sub: 'Your filtered list',
        ico: '🔎'
      });
    };

    // Remembers when the visitor deliberately chose a browse sort, so the
    // alignment-aware auto-default (Best Match for You) stops overriding it.
    window.myteamBrowseSortChanged = function() {
      window._myteamBrowseSortAuto = false;
      myteamBrowseFilter();
    };

    window.myteamBrowseReset = function() {
      var searchEl = document.getElementById('myteam-browse-search');
      var officeEl = document.getElementById('myteam-browse-office');
      var partyEl = document.getElementById('myteam-browse-party');
      var statusEl = document.getElementById('myteam-browse-status');
      var stateEl = document.getElementById('myteam-browse-state');
      var scoreEl = document.getElementById('myteam-browse-score');
      var showEl = document.getElementById('myteam-browse-show');
      var sortEl = document.getElementById('myteam-browse-sort');
      if (searchEl) searchEl.value = '';
      if (officeEl) officeEl.value = '';
      if (partyEl) partyEl.value = '';
      if (statusEl) statusEl.value = '';
      if (stateEl) stateEl.value = '';
      if (scoreEl) scoreEl.value = '';
      if (showEl) showEl.value = 'all';
      if (sortEl) sortEl.value = 'score-desc';
      window._acctHighOnly = false;
      window._myteamBrowseSortAuto = true;
      var suggestBox = document.getElementById('browse-search-suggest');
      if (suggestBox) { suggestBox.classList.remove('open'); suggestBox.innerHTML = ''; }
      setBrowseScope('all');
    };

    // ══ Search autocomplete ════════════════════════════════════════════════
    // As the voter types, offer the fastest routes to what they mean: matching
    // names, issue topics, office types, district shortcuts and value-based
    // goals. Each suggestion just rewrites the search box to a canonical query
    // and re-runs the (intent-aware) filter, so picking one is identical to
    // typing it — no separate code path to keep in sync.
    var _PDX_TOPIC_SUGGEST = [
      { ico: '🔫', label: 'Gun policy', q: 'guns' },
      { ico: '🎓', label: 'Education & schools', q: 'education' },
      { ico: '🏥', label: 'Healthcare', q: 'healthcare' },
      { ico: '💰', label: 'Taxes & spending', q: 'taxes' },
      { ico: '🛡', label: 'Immigration & border', q: 'immigration' },
      { ico: '🕊', label: 'Abortion', q: 'abortion' },
      { ico: '🏠', label: 'Housing & cost of living', q: 'housing' },
      { ico: '🌱', label: 'Climate & energy', q: 'climate' },
      { ico: '👮', label: 'Crime & policing', q: 'crime' },
      { ico: '🎖', label: 'Veterans', q: 'veterans' },
      { ico: '🧹', label: 'Accountability & ethics', q: 'accountability' },
      { ico: '🗳', label: 'Elections & voting', q: 'voting' },
      { ico: '🏭', label: 'Jobs & economy', q: 'economy' },
      { ico: '💧', label: 'Water', q: 'water' },
      { ico: '🏔', label: 'Public lands', q: 'public lands' },
      { ico: '🚀', label: 'Technology & privacy', q: 'tech' },
      { ico: '🧸', label: 'Family & child care', q: 'family' },
      { ico: '🏳️‍🌈', label: 'LGBTQ+ rights', q: 'lgbtq' }
    ];
    var _PDX_OFFICE_SUGGEST = [
      { ico: '🏛', label: 'U.S. House', q: 'us house' },
      { ico: '🏛', label: 'U.S. Senate', q: 'us senate' },
      { ico: '🏛', label: 'State Senate', q: 'state senate' },
      { ico: '🏛', label: 'State House', q: 'state house' },
      { ico: '⭐', label: 'Governor & statewide', q: 'governor' },
      { ico: '🦅', label: 'President', q: 'president' },
      { ico: '🏙', label: 'Mayor & local', q: 'mayor' }
    ];
    var _PDX_GOAL_SUGGEST = [
      { ico: '🎯', label: 'Best match for me', q: 'best match for me' },
      { ico: '🤝', label: 'Has pledge receipts', q: 'pledge receipts' },
      { ico: '🗳️', label: 'Open 2026 seats', q: 'open seats' },
      { ico: '📍', label: 'My district', q: 'my district' }
    ];

    function _pdxBold(label, q) {
      if (!q) return label;
      var i = label.toLowerCase().indexOf(q);
      if (i === -1) return label;
      return label.slice(0, i) + '<b>' + label.slice(i, i + q.length) + '</b>' + label.slice(i + q.length);
    }

    function _pdxBuildSuggestions(q) {
      var out = [];

      // 0) Issue Spotlights — a first-class, sourced view of a controversy. Surfaced
      //    at the very top when the query matches, so "stratos" / "data center" /
      //    "box elder" lead straight to the Spotlight rather than only to people.
      if (q && q.length >= 2 && window.PDXSpotlight && typeof window.PDXSpotlight.match === 'function') {
        try {
          window.PDXSpotlight.match(q).slice(0, 2).forEach(function (sp) {
            var sub = 'Issue Spotlight · ' + sp.place;
            try {
              if (typeof window.PDXSpotlight.strengthFor === 'function') {
                var st = window.PDXSpotlight.strengthFor(sp);
                if (st && st.label) sub += ' · ' + st.label;
              }
            } catch (e) {}
            out.push({ ico: '🔦', label: _pdxBold(sp.title, q), sub: sub,
              kind: 'Spotlight', q: sp.title, action: 'spotlight', slug: sp.slug });
          });
        } catch (e) {}
      }

      var push = function(arr, kind, max) {
        var n = 0;
        for (var i = 0; i < arr.length && n < max; i++) {
          var it = arr[i];
          if (!q || it.label.toLowerCase().indexOf(q) !== -1 || it.q.indexOf(q) !== -1) {
            out.push({ ico: it.ico, label: _pdxBold(it.label, q), sub: it.sub || '', kind: kind, q: it.q });
            n++;
          }
        }
      };

      // Track which people already appear as a receipt row so the name-match pass
      // below doesn't list the same person twice.
      var _receiptPids = {};

      // 0.5) The Receipts — contradictions & say-vs-do verdicts. This is what makes
      //    search the universal answer-finder: "lee guns", "broken promise on taxes"
      //    or just a name lands the voter straight on the exact receipt, verdict
      //    stamped inline. Ranked so the strongest contradictions lead.
      if (q && q.length >= 2 && window.PDXReceipts && typeof window.PDXReceipts.search === 'function') {
        try {
          window.PDXReceipts.search(q, 3).forEach(function (r) {
            _receiptPids[r.pid] = 1;
            var topic = (r.issue && r.issue.label) ? r.issue.label : '';
            var sub = [topic, r.headline].filter(Boolean).join(' · ');
            if (sub.length > 68) sub = sub.slice(0, 66) + '…';
            var badge = (typeof window.PDXReceipts.verdictBadge === 'function')
              ? window.PDXReceipts.verdictBadge(r) : '';
            out.push({ ico: '🧾', label: _pdxBold(r.name, q), sub: sub, badge: badge,
              kind: 'Receipt', action: 'receipt', pid: r.pid, issueKey: r.issueKey || '',
              q: r.name });
          });
        } catch (e) {}
      }

      // 0.7) Issue rankings — the question-first front door. "guns", "cost of
      //    living", "healthcare" offer a jump to the whole field RANKED on that
      //    issue by consistency (who backs up their words vs. who contradicts
      //    them), receipts one tap away — opens the PDXIssueView overlay.
      if (q && q.length >= 2 && window.PDXIssueView && typeof window.PDXIssueView.searchIssues === 'function') {
        try {
          window.PDXIssueView.searchIssues(q, 2).forEach(function (iss) {
            out.push({ ico: iss.icon || '🏛', label: _pdxBold(iss.label, q),
              sub: 'Rank everyone on this issue by consistency', kind: 'Issue',
              action: 'issue', coreKey: iss.key, q: iss.label });
          });
        } catch (e) {}
      }

      // 1) Matching people by name (most specific) — only once a couple of
      //    characters are typed, so the list isn't dominated by names up front.
      //    Each row carries its verdict badge inline when a receipt exists, so the
      //    say-vs-do read is visible before the voter even opens anything.
      if (q && q.length >= 2 && typeof CMP_DATA !== 'undefined') {
        var terms = q.split(/\s+/).filter(Boolean);
        var names = [], seen = {};
        var ids = Object.keys(CMP_DATA);
        for (var k = 0; k < ids.length && names.length < 4; k++) {
          var pid = ids[k];
          var d = CMP_DATA[pid];
          if (!d || !d.name || seen[d.name] || _receiptPids[pid]) continue;
          if (_browseNameMatch(d, terms)) {
            seen[d.name] = 1;
            var sub = [d.office, d.state].filter(Boolean).join(' · ');
            var badge = (window.PDXReceipts && typeof window.PDXReceipts.verdictBadge === 'function')
              ? window.PDXReceipts.verdictBadge(pid) : '';
            names.push({ ico: d.icon || '👤', label: _pdxBold(d.name, q), sub: sub,
              badge: badge, kind: 'Profile', q: d.name });
          }
        }
        out = out.concat(names);
      }

      // 2) Issue topics, 3) office types, 4) value goals.
      push(_PDX_TOPIC_SUGGEST, 'Topic', q ? 4 : 4);
      push(_PDX_OFFICE_SUGGEST, 'Office', q ? 3 : 2);
      push(_PDX_GOAL_SUGGEST, 'For you', q ? 3 : 3);

      return out.slice(0, 9);
    }

    window._pdxBrowseSuggest = function() {
      var input = document.getElementById('myteam-browse-search');
      var box = document.getElementById('browse-search-suggest');
      if (!input || !box) return;
      var q = (input.value || '').toLowerCase().trim();
      var items = _pdxBuildSuggestions(q);
      window._pdxSuggestState = { items: items, active: -1 };
      if (!items.length) {
        box.classList.remove('open'); box.innerHTML = '';
        input.setAttribute('aria-expanded', 'false');
        return;
      }
      var head = q ? '' : '<div class="bss-head">Try searching by topic, office or goal</div>';
      box.innerHTML = head + items.map(function(it, i) {
        return '<button type="button" role="option" class="bss-item" data-i="' + i + '" ' +
          'onmousedown="event.preventDefault()" onclick="pdxBrowseApplySuggest(' + i + ')">' +
          '<span class="bss-ico">' + it.ico + '</span>' +
          '<span class="bss-main"><span class="bss-label">' + it.label + '</span>' +
          (it.sub ? '<span class="bss-sub">' + it.sub + '</span>' : '') + '</span>' +
          (it.badge ? it.badge : '') +
          (it.kind ? '<span class="bss-kind">' + it.kind + '</span>' : '') +
          '</button>';
      }).join('');
      box.classList.add('open');
      input.setAttribute('aria-expanded', 'true');
    };

    window.pdxBrowseSearchInput = function() {
      myteamBrowseFilter();
      _pdxBrowseSuggest();
    };

    window.pdxBrowseApplySuggest = function(i) {
      var st = window._pdxSuggestState;
      if (!st || !st.items || !st.items[i]) return;
      var input = document.getElementById('myteam-browse-search');
      var box = document.getElementById('browse-search-suggest');
      // A Spotlight suggestion navigates to the Issue Spotlight surface instead of
      // filtering the roster.
      if (st.items[i].action === 'spotlight' && window.PDXSpotlight && typeof window.PDXSpotlight.open === 'function') {
        if (box) { box.classList.remove('open'); box.innerHTML = ''; }
        if (input) input.setAttribute('aria-expanded', 'false');
        window.PDXSpotlight.open(st.items[i].slug);
        return;
      }
      // A Receipt suggestion lands straight on the exact say-vs-do receipt —
      // verdict stamped, sourced — in a focused lightbox, rather than filtering
      // the roster. This is the "name + issue → the receipt" payoff.
      if (st.items[i].action === 'receipt' && window.PDXReceipts && typeof window.PDXReceipts.open === 'function') {
        if (box) { box.classList.remove('open'); box.innerHTML = ''; }
        if (input) input.setAttribute('aria-expanded', 'false');
        window.PDXReceipts.open(st.items[i].pid, st.items[i].issueKey || '');
        return;
      }
      // An Issue suggestion opens the issue-first ranked view — every tracked
      // politician ranked on that issue by consistency (the question-first front
      // door), rather than filtering the roster.
      if (st.items[i].action === 'issue' && window.PDXIssueView && typeof window.PDXIssueView.open === 'function') {
        if (box) { box.classList.remove('open'); box.innerHTML = ''; }
        if (input) input.setAttribute('aria-expanded', 'false');
        window.PDXIssueView.open(st.items[i].coreKey);
        return;
      }
      if (input) input.value = st.items[i].q;
      if (box) { box.classList.remove('open'); box.innerHTML = ''; }
      if (input) input.setAttribute('aria-expanded', 'false');
      window._myteamBrowseSortAuto = true; // let "best match for me" etc. drive the sort
      // Record the search on the guided spine (Move 3) so the trail starts from
      // what the voter looked for.
      try {
        if (window.PDXJourney && typeof window.PDXJourney.record === 'function' && st.items[i].q) {
          window.PDXJourney.record('search', { label: st.items[i].q, icon: '🔎',
            nav: { type: 'search', q: st.items[i].q } });
        }
      } catch (e) {}
      myteamBrowseFilter();
    };

    window.pdxBrowseSuggestBlur = function() {
      // Delay so a click on a suggestion registers before the list hides.
      setTimeout(function() {
        var box = document.getElementById('browse-search-suggest');
        var input = document.getElementById('myteam-browse-search');
        if (box) { box.classList.remove('open'); }
        if (input) input.setAttribute('aria-expanded', 'false');
      }, 160);
    };

    window.pdxBrowseSuggestKey = function(e) {
      var box = document.getElementById('browse-search-suggest');
      var st = window._pdxSuggestState;
      var open = box && box.classList.contains('open') && st && st.items && st.items.length;
      if (e.key === 'Escape') { if (box) box.classList.remove('open'); return true; }
      if (!open) return true;
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        var n = st.items.length;
        st.active = e.key === 'ArrowDown'
          ? (st.active + 1) % n
          : (st.active - 1 + n) % n;
        Array.prototype.forEach.call(box.querySelectorAll('.bss-item'), function(el) {
          el.classList.toggle('active', parseInt(el.getAttribute('data-i'), 10) === st.active);
        });
        return false;
      }
      if (e.key === 'Enter' && st.active >= 0) {
        e.preventDefault();
        pdxBrowseApplySuggest(st.active);
        return false;
      }
      return true;
    };

    // ══ Quick filter chips ═════════════════════════════════════════════════
    // One-tap shortcuts to the most-used searches. They read and write the same
    // dropdowns / search box / scope as everything else, so they combine freely
    // with manual filters and reflect the current state (highlighted when on).
    window._pdxRenderQuickChips = function() {
      var host = document.getElementById('browse-quick-chips');
      if (!host) return;
      var alignActive = (typeof _alignIssues !== 'undefined' && _alignIssues && _alignIssues.size > 0);
      var hasLoc = !!window._hasUserLocation;
      var scoreV = document.getElementById('myteam-browse-score') ? document.getElementById('myteam-browse-score').value : '';
      var statusV = document.getElementById('myteam-browse-status') ? document.getElementById('myteam-browse-status').value : '';
      var searchV = (document.getElementById('myteam-browse-search') ? document.getElementById('myteam-browse-search').value : '').toLowerCase().trim();

      var chips = [
        { cls: 'qc-match', on: !!window._alignBrowseSortActive, html: '🎯 Best match for me', act: 'match' },
        { cls: 'qc-loc', on: (typeof _browseScope !== 'undefined' && _browseScope === 'relevant'), html: hasLoc ? '📍 My district' : '📍 Set my location', act: 'loc' },
        { cls: '', on: scoreV === 'receipts', html: '🤝 Has pledge receipts', act: 'score-receipts' },
        { cls: 'qc-acct', on: !!window._acctHighOnly, html: '🛡️ High accountability', act: 'acct-high' },
        { cls: '', on: statusV === 'candidate', html: '🗳️ 2026 candidates', act: 'candidates' },
        { cls: '', on: searchV === 'guns', html: '🔫 Guns', act: 'topic:guns' },
        { cls: '', on: searchV === 'education', html: '🎓 Education', act: 'topic:education' },
        { cls: '', on: searchV === 'healthcare', html: '🏥 Healthcare', act: 'topic:healthcare' },
        { cls: '', on: searchV === 'taxes', html: '💰 Taxes', act: 'topic:taxes' }
      ];
      host.innerHTML = chips.map(function(c) {
        return '<button type="button" class="quick-chip ' + c.cls + (c.on ? ' is-on' : '') +
          '" onclick="_pdxQuickChip(\'' + c.act + '\')">' + c.html + '</button>';
      }).join('');
    };

    window._pdxQuickChip = function(act) {
      var searchEl = document.getElementById('myteam-browse-search');
      var sortEl = document.getElementById('myteam-browse-sort');
      var scoreEl = document.getElementById('myteam-browse-score');
      var statusEl = document.getElementById('myteam-browse-status');
      var box = document.getElementById('browse-search-suggest');
      if (box) { box.classList.remove('open'); box.innerHTML = ''; }

      if (act === 'match') {
        var alignActive = (typeof _alignIssues !== 'undefined' && _alignIssues && _alignIssues.size > 0);
        if (!alignActive) { if (window._krAlignGuideToPicker) window._krAlignGuideToPicker(); return; }
        window._myteamBrowseSortAuto = false;
        if (sortEl) sortEl.value = window._alignBrowseSortActive ? 'score-desc' : 'align-desc';
        myteamBrowseFilter();
        return;
      }
      if (act === 'loc') {
        if (!window._hasUserLocation) { if (window.toggleChangeLocation) window.toggleChangeLocation(); return; }
        setBrowseScope((typeof _browseScope !== 'undefined' && _browseScope === 'relevant') ? 'all' : 'relevant');
        return;
      }
      if (act === 'score-receipts') {
        if (scoreEl) scoreEl.value = (scoreEl.value === 'receipts' ? '' : 'receipts');
        myteamBrowseFilter();
        return;
      }
      if (act === 'acct-high') {
        // "Strong Character Signals" — narrow to politicians with a high
        // Accountability of Truth Score and rank them by it. Toggles off cleanly.
        window._acctHighOnly = !window._acctHighOnly;
        window._myteamBrowseSortAuto = false;
        if (sortEl) sortEl.value = window._acctHighOnly ? 'acct-desc'
          : ((typeof _alignIssues !== 'undefined' && _alignIssues && _alignIssues.size > 0) ? 'align-desc' : 'score-desc');
        myteamBrowseFilter();
        return;
      }
      if (act === 'candidates') {
        if (statusEl) statusEl.value = (statusEl.value === 'candidate' ? '' : 'candidate');
        myteamBrowseFilter();
        return;
      }
      if (act.indexOf('topic:') === 0) {
        var topic = act.slice(6);
        if (searchEl) {
          var cur = (searchEl.value || '').toLowerCase().trim();
          searchEl.value = (cur === topic) ? '' : topic;
        }
        window._myteamBrowseSortAuto = true;
        myteamBrowseFilter();
        return;
      }
    };

    // Office-type card definitions (icon, color, label) for each Relevant accordion.
    var _RELEVANT_OFFICE_DEFS = {
      president:      { label: 'PRESIDENT / EXECUTIVE', icon: '🦅', bg: 'linear-gradient(135deg, rgba(192,21,42,0.25), rgba(30,53,96,0.3))' },
      cabinet:        { label: 'CABINET / APPOINTED', icon: '🦅', bg: 'linear-gradient(135deg, rgba(139,92,246,0.15), rgba(30,53,96,0.3))' },
      senator:        { label: 'U.S. SENATE', icon: '🏛', bg: 'linear-gradient(135deg, rgba(59,130,246,0.2), rgba(30,53,96,0.3))' },
      representative: { label: 'U.S. HOUSE', icon: '🏛', bg: 'linear-gradient(135deg, rgba(34,197,94,0.15), rgba(30,53,96,0.3))' },
      governor:       { label: 'STATEWIDE EXECUTIVE OFFICES', icon: '⭐', bg: 'linear-gradient(135deg, rgba(168,85,247,0.2), rgba(30,53,96,0.3))' },
      state_senator:  { label: 'STATE SENATE', icon: '🏛', bg: 'linear-gradient(135deg, rgba(245,158,11,0.15), rgba(30,53,96,0.3))' },
      state_rep:      { label: 'STATE HOUSE', icon: '🏛', bg: 'linear-gradient(135deg, rgba(236,72,153,0.15), rgba(30,53,96,0.3))' },
      local:          { label: 'LOCAL GOV', icon: '🏙', bg: 'linear-gradient(135deg, rgba(20,184,166,0.15), rgba(30,53,96,0.3))' },
      candidate:      { label: 'CANDIDATES / NOMINEES', icon: '🗳', bg: 'linear-gradient(135deg, rgba(251,191,36,0.15), rgba(30,53,96,0.3))' },
      other:          { label: 'OTHER REPRESENTATIVES', icon: '👤', bg: 'linear-gradient(135deg, rgba(100,116,139,0.2), rgba(30,53,96,0.3))' }
    };

    // Top-level branches grouping office accordions into a Federal → State → Local tree.
    var _RELEVANT_LEVEL_DEFS = [
      { key: 'federal', label: 'FEDERAL LEVEL', icon: '🦅', offices: ['president', 'cabinet', 'senator', 'representative'] },
      { key: 'state',   label: 'STATE LEVEL',   icon: '🏛', offices: ['governor', 'state_senator', 'state_rep'] },
      { key: 'local',   label: 'LOCAL LEVEL',   icon: '🏙', offices: ['local'] },
      { key: 'other',   label: 'CANDIDATES & OTHER', icon: '🗳', offices: ['candidate', 'other'] }
    ];

    // ── District → team coverage ──────────────────────────────────────────────
    // Maps each "Relevant to Me" office group to the My Team ballot race key it
    // fills. Mirrors window.TEAM_POSITIONS and jumpToRelevantAccordion's mapping,
    // so the section can tell the voter — at a glance — which of their own
    // district seats already have a pick on their team and which remain open.
    var _RELEVANT_OFFICE_TO_RACE = {
      representative: 'house',
      senator:        'senate',
      governor:       'governor',
      state_senator:  'statesenate',
      state_rep:      'statehouse',
      local:          'local'
    };
    // The Federal/State/Local level each office lives under, so a coverage CTA can
    // open the right branch before scrolling to the seat.
    var _RELEVANT_OFFICE_LEVEL = {
      representative: 'federal', senator: 'federal',
      governor: 'state', state_senator: 'state', state_rep: 'state',
      local: 'local'
    };
    // Short, scannable seat names for the coverage strip ("still need: State House…").
    var _RELEVANT_OFFICE_SHORT = {
      representative: 'U.S. House', senator: 'U.S. Senate',
      governor: 'Statewide Exec', state_senator: 'State Senate',
      state_rep: 'State House', local: 'Local'
    };
    // First-person seat phrasing for the "add your …" guidance lines.
    var _RELEVANT_OFFICE_YOURS = {
      representative: 'your U.S. House representative',
      senator: 'your U.S. Senator',
      governor: 'your statewide executive',
      state_senator: 'your State Senator',
      state_rep: 'your State House representative',
      local: 'a local leader'
    };
    // The voter's OWN voting districts — the geographically specific seats only
    // people who live there elect (U.S. House, State Senate, State House). These get
    // top billing in the coverage tracker because "which of MY districts have I
    // covered" is the motivating question this section answers. Mirrors My Team's
    // _MYTEAM_DISTRICT_KEYS so the two surfaces frame coverage identically.
    var _RELEVANT_DISTRICT_OFFICES = { representative: 1, state_senator: 1, state_rep: 1 };
    // Plain-language word for each ballot level, used by the level-completion
    // guidance ("you've covered your federal seats — add your State Senator next").
    var _RELEVANT_LEVEL_WORD = { federal: 'federal', state: 'state', local: 'local' };

    // ── Statewide-office sub-grouping ─────────────────────────────────────────
    // Every statewide constitutional/executive office (Governor, Lt. Governor,
    // Attorney General, Treasurer, Auditor) shares the single 'governor' bucket,
    // so the office body used to dump them all into one flat, co-ranked field —
    // comparing a Governor against an Attorney General as if they were one race.
    // These defs let the body split that bucket into one clearly separated block
    // PER office, in ballot order, so each statewide race is scannable on its own
    // and its compare / alignment / add-to-team actions stay scoped to its field.
    var _RELEVANT_STATEWIDE_DEFS = [
      { key: 'governor',  label: 'Governor',         icon: '🏛️', test: function(o){ return o.indexOf('governor') !== -1 && o.indexOf('lt') === -1 && o.indexOf('lieutenant') === -1; } },
      { key: 'ltgov',     label: 'Lt. Governor',     icon: '🤝', test: function(o){ return (o.indexOf('lt') !== -1 || o.indexOf('lieutenant') !== -1) && o.indexOf('governor') !== -1; } },
      { key: 'attorney',  label: 'Attorney General', icon: '⚖️', test: function(o){ return o.indexOf('attorney general') !== -1; } },
      { key: 'treasurer', label: 'State Treasurer',  icon: '💰', test: function(o){ return o.indexOf('treasurer') !== -1; } },
      { key: 'auditor',   label: 'State Auditor',    icon: '📊', test: function(o){ return o.indexOf('auditor') !== -1; } },
      { key: 'other_sw',  label: 'Other Statewide',  icon: '⭐', test: function(){ return true; } }
    ];
    // Bucket one statewide politician into the first matching sub-office above.
    function _relevantStatewideKey(pid) {
      var d = CMP_DATA[pid];
      var o = (d && d.office ? d.office : '').toLowerCase();
      for (var i = 0; i < _RELEVANT_STATEWIDE_DEFS.length; i++) {
        if (_RELEVANT_STATEWIDE_DEFS[i].test(o)) return _RELEVANT_STATEWIDE_DEFS[i].key;
      }
      return 'other_sw';
    }

    // The exact set of candidate ids that Relevant to Me will render for a curated
    // statewide race (Governor → 'governor', U.S. Senate → 'senate'). This is the
    // single source of truth shared with the Key Races "See all N candidates"
    // button so its count can never disagree with the field shown below: it folds
    // together the hand-verified roster (always included) AND everyone in the live
    // data who classifies into that race's office, deduped. Returns [] for a
    // raceKey that is not one of the curated statewide seats, so callers fall back
    // to their own count. Lives in this block because it depends on the
    // classification helpers; published on window for the Key Races block.
    function _pdxStatewideRaceField(raceKey) {
      var out = [], seen = {};
      var push = function(pid) {
        if (!pid || typeof CMP_DATA === 'undefined' || !CMP_DATA[pid] || seen[pid]) return;
        seen[pid] = 1; out.push(pid);
      };
      // 1. The curated roster — authoritative members of this seat's field.
      (window.KEY_RACES_STATEWIDE || []).forEach(function(r) {
        if (r.raceKey !== raceKey) return;
        push(r.incumbentPid);
        (r.incumbentPids || []).forEach(push);
        (r.candidates || []).forEach(push);
      });
      // 2. Everyone in the live data who belongs to this race's office group, so a
      //    challenger who exists only in the database (not the static roster) still
      //    counts. Governor keeps only the Governor sub-office, excluding the other
      //    statewide executives (Lt. Governor, Attorney General, …) that share the
      //    same browse bucket but render under their own sub-headers.
      var wantType = raceKey === 'senate' ? 'senator' : (raceKey === 'governor' ? 'governor' : null);
      if (wantType && typeof CMP_DATA !== 'undefined') {
        Object.keys(CMP_DATA).forEach(function(pid) {
          if (seen[pid]) return;
          if (_classifyBrowseType(pid) !== wantType) return;
          if (_getPoliticianState(pid).toLowerCase() !== 'utah') return;
          if (raceKey === 'governor' && _relevantStatewideKey(pid) !== 'governor') return;
          push(pid);
        });
      }
      return out;
    }
    window._pdxStatewideRaceField = _pdxStatewideRaceField;

    // Live team selections ({ raceKey: pid }), read from the same store the team
    // builder writes to, so coverage can never drift from My Team. Returns {} when
    // nothing has been picked yet.
    function _relevantTeamSelections() {
      try {
        if (typeof _getTeamBallotSelections === 'function') return _getTeamBallotSelections() || {};
      } catch (e) {}
      return (window._ballotLoad ? (window._ballotLoad() || {}) : {});
    }

    // Whether the voter has already added someone from this office's seat to their
    // team — and, if so, who. Only district/ballot offices are "tracked"; others
    // (candidate lists, "other") return tracked:false and get no coverage UI.
    function _relevantOfficeCoverage(groupKey, sel) {
      var raceKey = _RELEVANT_OFFICE_TO_RACE[groupKey];
      if (!raceKey) return { tracked: false, filled: false };
      sel = sel || _relevantTeamSelections();
      var pid = sel[raceKey];
      var filled = !!(pid && CMP_DATA[pid]);
      return { tracked: true, raceKey: raceKey, filled: filled, pid: filled ? pid : null };
    }

    // Minimal HTML-text escaper. _esc lives in a different <script> block, so this
    // block keeps its own tiny copy for the few names it injects as text.
    function _relTxt(s) {
      return String(s == null ? '' : s)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    // Short, per-office subtitle clarifying WHY a seat is on the voter's ballot —
    // their EXACT district, the COUNTY-level field we can match when no exact
    // district is known, a STATEWIDE seat shared by everyone in the state, or a
    // FEDERAL seat shared by every American. Reads ctx.precision (set by the
    // renderer from the same location signals that drove the matching) so the
    // label always tells the truth about how precise the match really is.
    function _relevantOfficeSubtitle(groupKey, ctx) {
      if (!ctx || !ctx.focused) return '';
      var prec = (ctx.precision && ctx.precision[groupKey]) || null;
      var county = ctx.county || '';
      var state = ctx.state || 'your state';
      switch (groupKey) {
        case 'representative':
          if (ctx.houseDist) return 'Your U.S. House district · ' + ctx.houseDist;
          if (prec === 'county' && county) return 'Your U.S. House seat · ' + county;
          return 'Every U.S. House seat in ' + state + ' — set your district to narrow';
        case 'state_senator':
          if (prec === 'exact' && ctx.senateDist) return 'Your State Senate district · ' + ctx.senateDist;
          if (prec === 'county' && county) return county + ' Senate seats · set your district to pinpoint yours';
          return 'Every State Senate seat in ' + state + ' — set your area to narrow';
        case 'state_rep':
          if (prec === 'exact' && ctx.lowerDist) return 'Your State House district · ' + ctx.lowerDist;
          if (prec === 'county' && county) return county + ' House seats · set your district to pinpoint yours';
          return 'Every State House seat in ' + state + ' — set your area to narrow';
        case 'senator':        return 'Statewide — represents every ' + state + ' voter';
        case 'governor':       return 'Statewide — represents every ' + state + ' voter';
        case 'president':
        case 'cabinet':        return 'Federal — represents every American';
        case 'local':          return county ? 'Your community · ' + county : 'Your community';
        default: return '';
      }
    }

    // The basis on which a seat made it onto the voter's ballot, one of:
    //   'exact'    — matched to the voter's own district number
    //   'county'   — matched to the voter's county (their exact seat is one of these)
    //   'statewide'— a seat every voter in the state shares (U.S. Senate, Governor)
    //   'federal'  — a seat every American shares (President, Cabinet)
    // Drives the colored "why shown" pill in each office header and the legend.
    function _relevantPrecisionKind(groupKey, ctx) {
      var prec = (ctx && ctx.precision && ctx.precision[groupKey]) || null;
      switch (groupKey) {
        case 'representative':
          return ctx && ctx.houseDist ? 'exact' : (prec || 'statewide');
        case 'state_senator':
        case 'state_rep':
          return prec || 'statewide';
        case 'senator':
        case 'governor':
          return 'statewide';
        case 'president':
        case 'cabinet':
          return 'federal';
        case 'local':
          return 'local';
        default: return '';
      }
    }

    // Visual definitions for each match basis — kept in one place so the per-office
    // pill and the section legend stay perfectly in sync. Dark patriotic palette.
    var _RELEVANT_PRECISION_DEFS = {
      exact:     { ico: '✓', label: 'Your district',  rgb: '34,197,94'  },
      county:    { ico: '◑', label: 'County-level',   rgb: '245,158,11' },
      statewide: { ico: '★', label: 'Statewide',      rgb: '59,130,246' },
      federal:   { ico: '🦅', label: 'Federal',        rgb: '192,21,42'  },
      local:     { ico: '🏙', label: 'Local',          rgb: '20,184,166' }
    };

    // A compact colored pill rendered beside an office's count, naming WHY the seat
    // is on the voter's ballot (their district / county / statewide / federal).
    function _relevantPrecisionBadge(groupKey, ctx) {
      var kind = _relevantPrecisionKind(groupKey, ctx);
      var def = _RELEVANT_PRECISION_DEFS[kind];
      if (!def) return '';
      return '<span class="relevant-why-pill" style="--why-rgb:' + def.rgb + ';">' + def.ico + ' ' + def.label + '</span>';
    }

    // A one-line key explaining the colored "why shown" pills, shown once at the
    // top of the section. Only lists the bases actually present on this ballot so
    // it never explains a category the voter cannot see.
    function _relevantMatchLegend(officeGroups, ctx) {
      var present = {};
      ['representative', 'state_senator', 'state_rep', 'senator', 'governor', 'president', 'cabinet', 'local'].forEach(function(gk) {
        if (officeGroups[gk] && officeGroups[gk].length) {
          var kind = _relevantPrecisionKind(gk, ctx);
          if (_RELEVANT_PRECISION_DEFS[kind]) present[kind] = true;
        }
      });
      var order = ['exact', 'county', 'statewide', 'federal', 'local'];
      var items = order.filter(function(k) { return present[k]; });
      if (items.length <= 1) return ''; // nothing to disambiguate
      var chips = items.map(function(k) {
        var def = _RELEVANT_PRECISION_DEFS[k];
        return '<span class="relevant-legend-chip" style="--why-rgb:' + def.rgb + ';">' + def.ico + ' ' + def.label + '</span>';
      }).join('');
      return '<div class="relevant-match-legend">' +
        '<span class="relevant-legend-label">Why you\'re seeing each race:</span>' +
        '<div class="relevant-legend-chips">' + chips + '</div>' +
      '</div>';
    }

    // Within a single office (e.g. "U.S. House"), split the politicians into
    // clearly-labeled "Currently in Office" and "2026 Candidates" subsections so
    // a voter can instantly tell who holds the seat from who is running for it.
    // Former officeholders (rare here) land in a muted "Previously in Office"
    // group. Reuses _renderBrowseTeamCard so every card keeps its working
    // "Add to My Team", Compare and Profile buttons.
    // Polished compact card for the "Relevant to Me" ballot. Renders the same
    // best-in-class compact card used across the rest of the site — a premium,
    // green-framed "hero" card for sitting officeholders (photo, color-coded
    // Promise %, the Accountability/Truth chip, status + party badges, signature
    // highlight, and a Top-Match badge once the voter has set their issues) and a
    // lighter, clearly-secondary card for candidates / former members — while
    // keeping the team-building action set (Add to My Team, Compare, View
    // Profile) so this section stays focused on assembling the voter's own slate.
    // The matching #relevant-browse-grid CSS gives both tiers the full premium
    // chrome. My Team's _renderBrowseTeamCard is intentionally left untouched.
    // ── "Two ways to judge them" dual-signal scorecard (Relevant to Me) ──────────
    // The Relevant section is where a voter weighs the field, so it answers one
    // question — "does what they say match what they do?" — at two scopes, side by
    // side. The LEFT cell is the OVERALL ⚖️ Word vs Action read, across every
    // position the politician has stated. The RIGHT cell is that same read narrowed
    // to the visitor's chosen issues (_calcConsistencyScore, sourced from the same
    // PDXConsistency.officialRecord feed — a scope of the one system, not a rival).
    // Both cells tap through to their own explainer; thin records degrade to honest
    // neutral states ("Not enough record yet" / "Limited record") rather than
    // looking broken. It used to pair a pledge lane against a consistency lane at
    // equal weight, which is exactly the two-ranking-systems read this frame is
    // supposed to resolve.
    function _relevantDualSignal(pid) {
      var d = (typeof CMP_DATA !== 'undefined') ? CMP_DATA[pid] : null;
      if (!d) return '';
      var status = (typeof window._pdxOfficeStatus === 'function') ? window._pdxOfficeStatus(d) : 'office';
      var isCand = (status === 'candidate');

      // ── Left cell: the OVERALL ⚖️ Word vs Action read ──
      // RETIRED: the pledge side. This cell was "🤝 Pledge receipts", and it made
      // this the most literal two-systems surface in the app: a "Does what they
      // say match what they do?" header over two equal-weight cells, one of them a
      // pledge ledger. First the pledge rate went (a rate beside a rate, with
      // nothing saying which was the integrity signal), then the receipts — but
      // receipts at equal weight are still a second answer to the header's one
      // question. Both cells now show the SAME read: this one across every stated
      // position, the right one narrowed to the visitor's chosen issues. Campaign
      // pledges are inside both, tested against their sourced resolution.
      var slot = window._pdxLedgerSlot(d, { pid: pid, status: status });
      var promiseCell =
        '<div class="rel-dual-num rel-dual-num-na" style="color:' + (slot.tint || (slot.state === 'candidate' ? '#93c5fd' : '#9fb4d4')) + ';">' + slot.glyph + '</div>' +
        '<div class="rel-dual-rate" style="color:' + (slot.tint || '#9fb4d4') + ';">' + slot.sub + '</div>';

      // ── Say-vs-Do side (does their record back up their own words?) ──
      // SCORING CLEANUP: the retired Accountability composite is replaced here by
      // the real per-vote Say-vs-Do consistency score, pairing it with Promise
      // Follow-Through under one "Do they keep their word?" frame. Honest states:
      // needs the user's stances (else invite), warms records, never fakes a number.
      var svd = (typeof window._calcConsistencyScore === 'function') ? window._calcConsistencyScore(pid) : null;
      var svdCell, svdClick, svdTitle;
      if (svd && typeof svd.score === 'number') {
        var vCol = (typeof window._alignScoreColor === 'function') ? window._alignScoreColor(svd.score) : '#93c5fd';
        var vFlag = svd.contradictions > 0 ? ' · ⚑' + svd.contradictions : '';
        svdCell =
          '<div class="rel-dual-num" style="color:' + vCol + ';text-shadow:0 0 12px ' + vCol + '40;">' + svd.score + '<span class="rel-dual-pct">%</span></div>' +
          '<div class="rel-dual-rate" style="color:' + vCol + ';"><span class="rel-dual-dot" style="background:' + vCol + ';box-shadow:0 0 6px ' + vCol + ';"></span>Votes back words' + vFlag + '</div>';
        svdClick = 'if(window.keyRacesAlignQuickView)window.keyRacesAlignQuickView(\'' + pid + '\')';
        svdTitle = 'Say-vs-Do — how well their voting record backs up their own stated positions. Tap for the issue-by-issue breakdown.';
      } else if (svd && svd.pending) {
        svdCell = '<div class="rel-dual-num rel-dual-num-na">◷</div><div class="rel-dual-rate" style="color:#7d97bd;">Checking record…</div>';
        svdClick = 'if(window.keyRacesAlignQuickView)window.keyRacesAlignQuickView(\'' + pid + '\')';
        svdTitle = 'Say-vs-Do — checking their voting record.';
      } else if (svd && svd.stated > 0) {
        svdCell = '<div class="rel-dual-num rel-dual-num-na">◷</div><div class="rel-dual-rate" style="color:#7d97bd;">Limited record</div>';
        svdClick = 'if(window.keyRacesAlignQuickView)window.keyRacesAlignQuickView(\'' + pid + '\')';
        svdTitle = 'Say-vs-Do — they’ve stated positions, but there’s little or no voting record to verify against yet.';
      } else {
        svdCell = '<div class="rel-dual-num rel-dual-num-na" style="color:#93c5fd;">🎯</div><div class="rel-dual-rate" style="color:#93c5fd;">Set stances to see</div>';
        svdClick = "location.hash='#alignment-panel'";
        svdTitle = 'Set your stances to unlock Say-vs-Do consistency for the issues you care about.';
      }

      var pid_ = pid;
      return '<div class="rel-dual">' +
          '<div class="rel-dual-head">' +
            '<span class="rel-dual-head-txt">Does what they say match what they do?</span>' +
          '</div>' +
          '<div class="rel-dual-grid">' +
            '<button type="button" class="rel-dual-cell rel-dual-promise" onclick="event.stopPropagation();window._pdxScoreCompareInfo(event,\'' + pid_ + '\')" title="⚖️ Word vs Action — across every position they have stated, how often the record backs it up. Campaign pledges are measured inside this read. Tap for how it works.">' +
              '<div class="rel-dual-eyebrow"><span class="rel-dual-ico">⚖️</span> Word vs Action</div>' +
              promiseCell +
              '<div class="rel-dual-meaning">Across all their positions</div>' +
            '</button>' +
            '<button type="button" class="rel-dual-cell rel-dual-acct" onclick="event.stopPropagation();' + svdClick + '" title="' + svdTitle + '">' +
              '<div class="rel-dual-eyebrow"><span class="rel-dual-ico">🎯</span> On your issues</div>' +
              svdCell +
              '<div class="rel-dual-meaning">The same read, your issues only</div>' +
            '</button>' +
          '</div>' +
        '</div>';
    }
    window._relevantDualSignal = _relevantDualSignal;

    function _renderRelevantPersonCard(pid) {
      var d = CMP_DATA[pid];
      if (!d) return '';
      var isMy = _myPoliticians.has(pid);
      var status = (typeof window._pdxOfficeStatus === 'function') ? window._pdxOfficeStatus(d) : 'office';
      var isInOffice = status === 'office';

      var alignBar = (typeof _alignCardBar === 'function') ? _alignCardBar(pid) : '';
      var badges = (typeof _alignTopMatchBadge === 'function' ? _alignTopMatchBadge(pid) : '') + _pdxLocalBadge(pid) + _pdxHomeBadge(pid) + _pdxTeamBadge(pid);

      // Team-building action set, identical to the My Team browse cards so the
      // whole "build your team" flow reads as one consistent surface.
      var actions = _pdxTeamActions(pid);

      // Candidates / former members render as the lighter secondary card (no
      // premium glow, fewer issue tags, no Promise/Accountability emphasis — they
      // have no voting record to ground it yet), matching the best All-Politicians
      // candidate card. The personalized match bar only shows once the voter has
      // chosen issues, so the lighter card stays minimal by default.
      if (!isInOffice) {
        var candAlign = (alignBar && typeof _alignIssues !== 'undefined' && _alignIssues && _alignIssues.size > 0) ? alignBar : '';
        return window._pdxCardShell(pid, {
          cardClass: 'is-candidate',
          cardStyle: isMy ? 'border-color:rgba(74,222,128,0.35);' : '',
          controls: _pdxHeartCtrl(pid),
          badges: badges,
          maxIssues: 2,
          acct: false,
          statusEmphasis: 'high',
          extra: candAlign,
          actions: actions
        });
      }

      // Sitting officeholder: the premium hero card. The two signals a voter weighs
      // here — the formal in-office record (Promise %) and the character/consistency
      // read (Accountability) — are presented together as one paired, equal-weight
      // scorecard (so neither is buried), with the combined "Your Match" bar below it.
      // hideScore + acct:false suppress the old lopsided corner score and stray chip
      // so the dual scorecard is the single, scannable home for both numbers.
      var dual = (typeof _relevantDualSignal === 'function') ? _relevantDualSignal(pid) : '';
      // Explicit "holds this seat now" marker so the sitting officeholder reads
      // instantly on the Relevant-to-Me ballot, not just via the green card color.
      var incBadge = '<span class="chub-office-badge">✓ Current officeholder</span>';
      return window._pdxCardShell(pid, {
        cardClass: 'is-incumbent',
        controls: _pdxHeartCtrl(pid),
        badges: incBadge + badges,
        acct: false,
        hideScore: true,
        statusEmphasis: 'high',
        topExtra: dual,
        extra: alignBar,
        actions: actions
      });
    }

    // Compare-these-candidates prompt shown above a race's card grid. It turns the
    // Alignment Tool into the obvious next step right where a voter is weighing the
    // field: when issues aren't set yet it nudges them to pick the issues they care
    // about (framed as the way to tell otherwise-thin 2026 candidates apart); once
    // issues are set it confirms the cards below are ranked by personal match, names
    // the current front-runner, and points straight at adding that pick to the team.
    // Only shown when there are 2+ people in the race — comparison needs a field.
    function _relevantCompareCTA(pids, kind) {
      if (!pids || pids.length < 2) return '';
      var n = pids.length;
      var hasIssues = (typeof _alignIssues !== 'undefined' && _alignIssues && _alignIssues.size > 0);

      if (!hasIssues) {
        var lead = (kind === 'candidate')
          ? 'New names can look alike on paper — and 2026 candidates often have thin records.'
          : 'Weigh them side by side on what actually matters to you.';
        return '<div class="relevant-compare-cta">' +
            '<div class="relevant-compare-cta-ico" aria-hidden="true">🎯</div>' +
            '<div class="relevant-compare-cta-body">' +
              '<div class="relevant-compare-cta-title">See which of these ' + n + ' best matches your values</div>' +
              '<div class="relevant-compare-cta-sub">' + lead + ' Pick the issues you care about and the Alignment Tool ranks them by how well each matches you — then add your top pick to your team.</div>' +
            '</div>' +
            '<button type="button" class="relevant-compare-cta-btn" onclick="if(window._krAlignGuideToPicker)window._krAlignGuideToPicker();">Compare on the Issues →</button>' +
          '</div>';
      }

      // Issues set — name the strongest match from the live breakdown so the prompt
      // pays off the comparison and routes the voter to the obvious pick.
      var best = null;
      if (typeof _calcAlignmentBreakdown === 'function') {
        pids.forEach(function(pid) {
          var bd = _calcAlignmentBreakdown(pid);
          if (bd && (best === null || bd.overall > best.score)) {
            var d = CMP_DATA[pid];
            best = { pid: pid, score: bd.overall, name: d ? d.name : '' };
          }
        });
      }
      var col = (typeof _alignScoreColor === 'function' && best) ? _alignScoreColor(best.score) : '#a78bfa';
      var bestOnTeam = best && (typeof _myPoliticians !== 'undefined') && _myPoliticians.has(best.pid);
      var line;
      if (best && best.name && bestOnTeam) {
        line = '<b style="color:#86efac;">' + best.name + '</b> is your strongest fit here at <b style="color:' + col + ';">' + best.score + '%</b> — and they\'re on your team. ✓';
      } else if (best && best.name) {
        line = 'Strongest fit: <b style="color:' + col + ';">' + best.name + '</b> at <b style="color:' + col + ';">' + best.score + '%</b>. One tap adds them to your team.';
      } else {
        line = 'These cards are ranked by how well each matches the issues you chose — add your top pick to your team below.';
      }
      // When we can name a strongest fit who isn't already picked, lead with a
      // one-tap "Add" for that exact person — turning the comparison's conclusion
      // straight into a team pick without hunting for their card below.
      var bestFirst = (best && best.name) ? best.name.split(/\s+/)[0] : '';
      var addBtn = (best && best.name && !bestOnTeam)
        ? '<button type="button" class="relevant-compare-cta-btn add" onclick="event.stopPropagation();if(window.mypolToggleAnimated)window.mypolToggleAnimated(this,\'' + best.pid + '\');">⭐ Add ' + bestFirst + '</button>'
        : '';
      return '<div class="relevant-compare-cta is-set">' +
          '<div class="relevant-compare-cta-ico" aria-hidden="true">🎯</div>' +
          '<div class="relevant-compare-cta-body">' +
            '<div class="relevant-compare-cta-title">Ranked by your values · best match first</div>' +
            '<div class="relevant-compare-cta-sub">' + line + '</div>' +
          '</div>' +
          addBtn +
          '<button type="button" class="relevant-compare-cta-btn ghost" onclick="if(window._krAlignGuideToPicker)window._krAlignGuideToPicker();">⚙ Adjust Issues</button>' +
        '</div>';
    }

    // The prominent "Compare the field" action for one unified district seat. One
    // tap loads the seat's whole live lineup — the sitting officeholder (when
    // they're running again) plus every 2026 candidate for that same seat — into
    // the side-by-side Compare overlay, so a voter weighs exactly this race head-
    // to-head without hand-selecting anyone or leaving the district view. Styled
    // as the same blue research/decision step used per-race in Key Races, so the
    // flow reads top-to-bottom: see who's running → compare the field → add a pick.
    // Renders only for a real 2+ field (a lone, uncontested record has no race to
    // compare). The sub-line adapts to whether an incumbent is in the running.
    function _pdxFieldCompareBtn(fieldPids, opts) {
      opts = opts || {};
      var pids = (fieldPids || []).filter(function(pid) {
        return typeof CMP_DATA !== 'undefined' && CMP_DATA[pid];
      });
      if (pids.length < 2) return '';
      var n = pids.length;
      var sub = opts.openSeat
        ? 'No incumbent — line up all ' + n + ' candidates for this open seat side-by-side'
        : (opts.hasIncumbent
            ? 'Weigh the current officeholder against every challenger, side-by-side'
            : 'Put all ' + n + ' on this ballot side-by-side before you pick');
      return '<button type="button" class="kr-race-compare pdx-field-compare" style="margin-bottom:0.85rem;" ' +
          'onclick="event.stopPropagation();window.pdxCompareField(\'' + pids.join(',') + '\')" ' +
          'aria-label="Compare all ' + n + ' people running for this seat side by side">' +
          '<span class="kr-race-compare-ico" aria-hidden="true">⚖️</span>' +
          '<span class="kr-race-compare-text">' +
            '<span class="kr-race-compare-title">Compare the field · ' + n + ' in this race</span>' +
            '<span class="kr-race-compare-sub">' + sub + '</span>' +
          '</span>' +
          '<span class="kr-race-compare-go" aria-hidden="true">›</span>' +
        '</button>';
    }

    // ── District-level "Your Match in this race" panel ───────────────────────
    // Surfaces personalized alignment for an ENTIRE seat's field — the sitting
    // officeholder (when running) and every challenger together — right inside the
    // unified district view, so a voter never has to leave for the global Alignment
    // Tool to see who in this district best fits their values. One panel, two states:
    //   • No issues chosen yet → a lightweight, race-scoped QUICK SELECTOR: the key
    //     issues this field actually documents positions on, as one-tap toggle chips.
    //     Picking any one instantly ranks the race below — no separate tool, no
    //     leaving the view.
    //   • Issues chosen → a compact RANKED LEADERBOARD of the whole field, best match
    //     first, each with a colour-coded %/bar and a clear 👑 "Best match" flag on
    //     the top fit. Every row taps through to the issue-by-issue breakdown, and the
    //     strongest not-yet-picked match gets a one-tap "Add to team" — so browse →
    //     evaluate → add all happens in one place. A "Tune this race" chip row stays
    //     below so issues can be adjusted inline.
    // The chips carry data-align-issue and reuse the shared alignToggle handler, so
    // they stay in lock-step with every other picker and a pick re-ranks this race
    // (and the rest of the site) immediately. Renders only for a real 2+ field, and
    // works identically for an open seat, a contested primary, or an incumbent
    // defending the seat — the field is simply whatever was handed in.
    function _pdxSeatAlignBoard(fieldPids, opts) {
      opts = opts || {};
      if (typeof CMP_DATA === 'undefined' || typeof ISSUE_MAP === 'undefined') return '';
      var pids = (fieldPids || []).filter(function(pid) { return CMP_DATA[pid]; });
      if (pids.length < 2) return '';

      function esc(s) {
        return String(s == null ? '' : s)
          .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
      }
      function partyCol(party) {
        return party === 'R' ? '#f87171' : party === 'D' ? '#60a5fa'
          : (party === 'F' || party === 'Forward') ? '#22d3ee' : '#a78bfa';
      }

      var hasIssues = (typeof _alignIssues !== 'undefined' && _alignIssues && _alignIssues.size > 0);
      var nIssues = hasIssues ? _alignIssues.size : 0;

      // ── Race-relevant quick-selector chip set ──
      // The issues this field actually documents positions on, ranked by how many of
      // the field hold a documented stance (widest coverage first) so the chips are
      // the ones that most sharply separate these specific people. Topped up from a
      // short, broadly-relevant fallback so the selector is never empty for a thin
      // field; the voter's already-chosen issues lead so they read as active.
      var cov = {};
      if (typeof window._polPositionMap === 'function') {
        pids.forEach(function(pid) {
          var map = window._polPositionMap(pid, CMP_DATA[pid]) || {};
          Object.keys(map).forEach(function(k) { if (ISSUE_MAP[k]) cov[k] = (cov[k] || 0) + 1; });
        });
      }
      var pickKeys = Object.keys(cov).sort(function(a, b) {
        return (cov[b] - cov[a]) || ISSUE_MAP[a].label.localeCompare(ISSUE_MAP[b].label);
      });
      var FALLBACK = ['border_security', 'lower_taxes', 'gun_rights', 'lands_keep_public', 'social_security', 'gun_safety', 'immigration_reform', 'gov_services'];
      FALLBACK.forEach(function(k) { if (ISSUE_MAP[k] && pickKeys.indexOf(k) === -1) pickKeys.push(k); });

      var ordered = [];
      if (hasIssues) _alignIssues.forEach(function(k) { if (ISSUE_MAP[k] && ordered.indexOf(k) === -1) ordered.push(k); });
      pickKeys.forEach(function(k) { if (ordered.indexOf(k) === -1) ordered.push(k); });
      var chipKeys = ordered.slice(0, Math.max(8, nIssues));

      var chips = chipKeys.map(function(k) {
        var on = hasIssues && _alignIssues.has(k);
        return '<button type="button" class="pdx-align-pick' + (on ? ' active' : '') + '" ' +
            'data-align-issue="' + k + '" aria-pressed="' + (on ? 'true' : 'false') + '" ' +
            'onclick="event.stopPropagation();if(window.alignToggle)window.alignToggle(this);" ' +
            'title="' + esc(ISSUE_MAP[k].chip || ISSUE_MAP[k].label) + '">' +
            '<span class="pdx-align-pick-x" aria-hidden="true">' + (on ? '✓' : '＋') + '</span>' +
            esc(ISSUE_MAP[k].label) +
          '</button>';
      }).join('');
      var moreBtn = '<button type="button" class="pdx-align-pick more" onclick="event.stopPropagation();if(window._krAlignGuideToPicker)window._krAlignGuideToPicker();" title="Open the full Alignment Tool to weight issues and pick from every topic">⚙ More issues</button>';

      // ── No issues yet → quick selector only ──
      if (!hasIssues) {
        return '<div class="pdx-amatch is-setup" onclick="event.stopPropagation();">' +
            '<div class="pdx-amatch-head">' +
              '<span class="pdx-amatch-ico" aria-hidden="true">🎯</span>' +
              '<span class="pdx-amatch-title">Match this race to your values</span>' +
              '<span class="pdx-amatch-sub">Tap an issue — rank everyone in this district without leaving</span>' +
            '</div>' +
            '<div class="pdx-amatch-picks">' + chips + moreBtn + '</div>' +
          '</div>';
      }

      // ── Issues set → ranked leaderboard ──
      var rows = pids.map(function(pid) {
        var sc = (typeof _calcAlignmentScore === 'function') ? _calcAlignmentScore(pid) : null;
        return { pid: pid, d: CMP_DATA[pid], score: sc };
      });
      var scored = rows.filter(function(r) { return r.score !== null && r.score !== undefined; })
                       .sort(function(a, b) { return b.score - a.score; });
      var unscored = rows.filter(function(r) { return r.score === null || r.score === undefined; });

      if (!scored.length) {
        // Issues chosen, but nobody in this field carries enough record to score —
        // keep the selector visible so the voter can adjust, and say so honestly.
        return '<div class="pdx-amatch" onclick="event.stopPropagation();">' +
            '<div class="pdx-amatch-head">' +
              '<span class="pdx-amatch-ico" aria-hidden="true">🎯</span>' +
              '<span class="pdx-amatch-title">Your Match in this race</span>' +
              '<span class="pdx-amatch-sub">Not enough record yet to rank this field on your issues</span>' +
            '</div>' +
            '<div class="pdx-amatch-picks tune"><span class="pdx-amatch-tune-lbl">Tune this race:</span>' + chips + moreBtn + '</div>' +
          '</div>';
      }

      var rowsHtml = scored.map(function(r, i) {
        var d = r.d;
        var col = (typeof _alignScoreColor === 'function') ? _alignScoreColor(r.score) : '#a78bfa';
        var pcol = partyCol(d.party);
        var isBest = (i === 0 && r.score >= 50);
        var url = d.photo ? d.photo : ((typeof window._getPhotoUrl === 'function') ? window._getPhotoUrl(r.pid) : ((typeof BROWSE_PHOTOS !== 'undefined' && BROWSE_PHOTOS[r.pid]) ? BROWSE_PHOTOS[r.pid] : ''));
        var av = url
          ? '<span class="pdx-amatch-av" style="border-color:' + pcol + '99;"><img src="' + esc(url) + '" alt="" loading="lazy" onerror="this.style.display=\'none\'"></span>'
          : '<span class="pdx-amatch-av pdx-amatch-av-ph" style="border-color:' + pcol + '99;color:' + pcol + ';">' + esc((d.name || '?').slice(0, 1)) + '</span>';
        var badge = (typeof window._pdxStatusBadge === 'function') ? window._pdxStatusBadge(d, { size: 'sm' }) : '';
        return '<button type="button" class="pdx-amatch-row' + (isBest ? ' is-best' : '') + '" ' +
            'style="--mc:' + col + ';" ' +
            'onclick="event.stopPropagation();if(window.keyRacesAlignQuickView)window.keyRacesAlignQuickView(\'' + r.pid + '\');" ' +
            'title="' + esc(d.name) + ' — ' + r.score + '% match on your ' + nIssues + ' issue' + (nIssues > 1 ? 's' : '') + '. Tap for the issue-by-issue breakdown.">' +
            '<span class="pdx-amatch-rank">' + (isBest ? '👑' : (i + 1)) + '</span>' +
            av +
            '<span class="pdx-amatch-id">' +
              '<span class="pdx-amatch-name" style="color:' + pcol + ';">' + esc(d.name) + '</span>' +
              '<span class="pdx-amatch-meta">' + badge + (isBest ? '<span class="pdx-amatch-best">Best match for you</span>' : '') + '</span>' +
            '</span>' +
            '<span class="pdx-amatch-score">' +
              '<span class="pdx-amatch-bar"><span style="width:' + r.score + '%;background:linear-gradient(90deg,' + col + '88,' + col + ');"></span></span>' +
              '<span class="pdx-amatch-pct" style="color:' + col + ';">' + r.score + '<span style="font-size:0.62em;">%</span></span>' +
            '</span>' +
          '</button>';
      }).join('');

      var unscoredHtml = '';
      if (unscored.length) {
        unscoredHtml = '<div class="pdx-amatch-unscored">' +
            '<span class="pdx-amatch-unscored-lbl">⏳ Too little record to score yet:</span> ' +
            unscored.map(function(r) { return esc((r.d.name || '').split(/\s+/)[0]); }).join(', ') +
          '</div>';
      }

      // One-tap "add my best fit" — turns the ranking's conclusion straight into a
      // team pick without leaving the district. Only when the top match is a genuine
      // fit and isn't already on the team.
      var best = scored[0];
      var bestOnTeam = (typeof _myPoliticians !== 'undefined') && _myPoliticians.has && _myPoliticians.has(best.pid);
      var addBtn = '';
      if (best && !bestOnTeam && best.score >= 50) {
        var firstName = (best.d.name || '').split(/\s+/)[0];
        addBtn = '<button type="button" class="pdx-amatch-add" onclick="event.stopPropagation();if(window.mypolToggleAnimated)window.mypolToggleAnimated(this,\'' + best.pid + '\');">⭐ Add ' + esc(firstName) + ' to your team</button>';
      } else if (best && bestOnTeam) {
        addBtn = '<div class="pdx-amatch-onteam">✓ Your top match in this district is on your team</div>';
      }

      return '<div class="pdx-amatch is-ranked" onclick="event.stopPropagation();">' +
          '<div class="pdx-amatch-head">' +
            '<span class="pdx-amatch-ico" aria-hidden="true">🎯</span>' +
            '<span class="pdx-amatch-title">Your Match in this race</span>' +
            '<span class="pdx-amatch-sub">Ranked by your <b>' + nIssues + '</b> issue' + (nIssues > 1 ? 's' : '') + ' · best fit first</span>' +
          '</div>' +
          '<div class="pdx-amatch-board">' + rowsHtml + '</div>' +
          unscoredHtml +
          addBtn +
          '<div class="pdx-amatch-picks tune"><span class="pdx-amatch-tune-lbl">Tune this race:</span>' + chips + moreBtn + '</div>' +
        '</div>';
    }
    window._pdxSeatAlignBoard = _pdxSeatAlignBoard;

    // Renders one district seat's WHOLE field in a single place: the current
    // officeholder(s) and every candidate running for that same seat together in
    // one grid, instead of splitting them into stacked "Currently in Office" /
    // "2026 Candidates" lists a voter had to scan separately. The incumbent stays
    // the visual hero (gold/green card + "✅ In Office" badge) and challengers
    // read as the cooler blue tier ("🗳️ 2026 Candidate"), so who holds the seat
    // today versus who is running for it is obvious at a glance — while the whole
    // competitive landscape sits in front of the voter at once. Former holders of
    // the seat, who aren't part of the live race, follow in a quiet trailing group.
    function _renderRelevantStatusSplit(pids) {
      // Uniqueness guard. Every field handed here must show each person ONCE. The
      // upstream bucketing already dedups by id, but the live data occasionally
      // carries the same human under two ids (a re-seeded record, or an incumbent
      // who is also listed as a candidate for their own seat), which slipped past
      // an id-only check and rendered duplicate cards. Collapse on the politician's
      // id first, then on a normalized name, keeping the first occurrence so the
      // incumbent-first ordering below is preserved.
      var _seenId = {}, _seenName = {}, _uniq = [];
      (pids || []).forEach(function(pid) {
        if (!pid || _seenId[pid]) return;
        var d = CMP_DATA[pid];
        if (!d) return;
        var nameKey = String(d.name || '').toLowerCase().replace(/\s+/g, ' ').trim();
        if (nameKey && _seenName[nameKey]) return;
        _seenId[pid] = 1;
        if (nameKey) _seenName[nameKey] = 1;
        _uniq.push(pid);
      });
      pids = _uniq;

      var inOffice = [], candidates = [], former = [];
      (pids || []).forEach(function(pid) {
        var st = (typeof window._pdxOfficeStatus === 'function') ? window._pdxOfficeStatus(CMP_DATA[pid]) : 'office';
        if (st === 'candidate') candidates.push(pid);
        else if (st === 'former') former.push(pid);
        else inOffice.push(pid);
      });

      // The live race = who holds the seat now + everyone challenging for it.
      // An open seat has candidates but no sitting incumbent.
      var isOpenSeat = candidates.length > 0 && inOffice.length === 0;
      var hasIssues = (typeof _alignIssues !== 'undefined' && _alignIssues && _alignIssues.size > 0);

      // Default order keeps the incumbent(s) first, then candidates (challengers
      // read as the second tier). Once the voter has set their issues we instead
      // rank the entire combined field best-match-first, so "ranked by your
      // values" is literally true across incumbent and challengers alike.
      var liveField = _sortInOfficeFirst(inOffice.concat(candidates));
      if (hasIssues && liveField.length > 1 && typeof _calcAlignmentBreakdown === 'function') {
        liveField = liveField.slice().sort(function(a, b) {
          var ba = _calcAlignmentBreakdown(a), bb = _calcAlignmentBreakdown(b);
          return (bb ? bb.overall : -1) - (ba ? ba.overall : -1);
        });
      }

      // Honest framing for the race below — open seats and contested ballots get
      // a one-line "weigh the whole field" reminder.
      var note = '';
      if (isOpenSeat && candidates.length > 1) {
        note = 'No incumbent holds this seat — compare the full field below and back the person whose values and follow-through you trust, party label aside. Some are new candidates, so their profiles may still be thin.';
      } else if (isOpenSeat) {
        note = 'No incumbent holds this seat — weigh this candidate on values and follow-through. The profile may still be thin this early in the race.';
      } else if (inOffice.length && candidates.length) {
        note = 'The current officeholder and everyone challenging this seat are shown together — compare them on values and follow-through, not just party.';
      } else if (candidates.length > 1) {
        note = 'More than one name is on this ballot — compare them on values and follow-through, not just party.';
      }

      var out = '';
      if (liveField.length) {
        // Header + colour legend that frames the one combined grid (omitted for a
        // lone, uncontested record, which needs no "who's who" key).
        out += (typeof window._pdxSeatFieldHead === 'function')
          ? window._pdxSeatFieldHead(inOffice.length, candidates.length, former.length, { openSeat: isOpenSeat })
          : '';
        if (note) out += '<div class="relevant-open-note"><span style="flex-shrink:0;">🗳️</span><span>' + note + '</span></div>';
        // The full-field side-by-side launcher — the prominent, one-tap way to
        // compare exactly this seat's lineup (officeholder + every challenger).
        // Sits above the alignment prompt so the direct head-to-head is the first
        // thing a voter sees when weighing the race.
        out += _pdxFieldCompareBtn(liveField, { openSeat: isOpenSeat, hasIncumbent: inOffice.length > 0 });
        // Personalized district-level alignment, right where the decision is made:
        // a race-scoped quick selector when no issues are chosen yet, or a ranked
        // "Your Match in this race" leaderboard (best fit first, top match flagged,
        // one-tap add-to-team) once they are. Supersedes the older compare-CTA so a
        // voter sees who in THIS district fits their values without opening the
        // global tool. Falls back to that CTA if the board can't render a 2+ field.
        var _alignBoard = (typeof _pdxSeatAlignBoard === 'function') ? _pdxSeatAlignBoard(liveField) : '';
        out += _alignBoard || _relevantCompareCTA(liveField, isOpenSeat ? 'candidate' : 'office');
        // At-a-glance issue board: the whole field's documented stances laid against
        // the same key issues, so a voter compares everyone in the race head-to-head
        // without opening a profile. Only render when the field is ONE coherent seat
        // — this renderer is also handed multi-district range groups (county-level /
        // unfocused chambers), where a cross-field "race" comparison would be wrong.
        if (typeof window._pdxSeatIssueBoard === 'function' && liveField.length >= 2) {
          var _seatDistSet = {};
          liveField.forEach(function(pid) {
            var _dd = (typeof _getPoliticianDistrictOrCounty === 'function') ? _getPoliticianDistrictOrCounty(pid) : '';
            if (_dd) _seatDistSet[_dd] = 1;
          });
          if (Object.keys(_seatDistSet).length <= 1) {
            out += window._pdxSeatIssueBoard(liveField, { max: 4 });
          }
        }

        var _gridCls = 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-start';
        // When a sitting officeholder is being challenged AND we're not ranking the
        // whole field by the voter's values, split it into two clearly labeled
        // tiers — who holds the seat now, then who's running for it — so the
        // competitive landscape reads at a glance even before reading any badge.
        // Once issues are set we keep the single best-match-first grid so "ranked
        // by your values" stays literally true across incumbent and challengers.
        if (inOffice.length && candidates.length && !hasIssues && typeof window._pdxSeatRoleDivider === 'function') {
          out += window._pdxSeatRoleDivider('office', inOffice.length);
          out += '<div class="' + _gridCls + '" style="margin-bottom:1rem;">';
          _sortInOfficeFirst(inOffice).forEach(function(pid) { out += _renderRelevantPersonCard(pid); });
          out += '</div>';
          out += window._pdxSeatRoleDivider('cand', candidates.length, { openSeat: isOpenSeat });
          out += '<div class="' + _gridCls + '" style="margin-bottom:1rem;">';
          _sortInOfficeFirst(candidates).forEach(function(pid) { out += _renderRelevantPersonCard(pid); });
          out += '</div>';
        } else {
          out += '<div class="' + _gridCls + '" style="margin-bottom:1rem;">';
          liveField.forEach(function(pid) { out += _renderRelevantPersonCard(pid); });
          out += '</div>';
        }
      }

      // Former holders of this seat aren't part of the live race, so they trail
      // behind a quiet divider rather than mixing into the field above.
      if (former.length) {
        out += '<div class="pdx-field-former-divider">' +
            '<span class="pdx-field-former-pill">⏳ Previously held this seat <span style="opacity:0.75;">(' + former.length + ')</span></span>' +
            '<span class="pdx-field-former-rule"></span>' +
          '</div>';
        out += '<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-start" style="margin-bottom:1rem;">';
        _sortInOfficeFirst(former).forEach(function(pid) { out += _renderRelevantPersonCard(pid); });
        out += '</div>';
      }

      // Safety net: if status classification produced nothing (shouldn't happen),
      // fall back to a flat in-office-first grid so cards never disappear.
      if (!out) {
        out += '<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-start">';
        _sortInOfficeFirst(pids || []).forEach(function(pid) { out += _renderRelevantPersonCard(pid); });
        out += '</div>';
      }
      return out;
    }

    // Render the statewide-executive bucket as one clearly separated block PER
    // office (Governor, Lt. Governor, Attorney General, Treasurer, Auditor…),
    // in ballot order, instead of one chaotic combined field. Each office is a
    // collapsible card with a scannable header — icon, office name, a who-holds-it
    // hint and a count — so a voter can jump straight to the race they want. The
    // body of each reuses _renderRelevantStatusSplit, so every existing action
    // (compare the field, rank by my values, add to team, view profile) stays
    // intact and is now correctly scoped to that single statewide race.
    function _renderRelevantStatewideGrouped(officePids, prefix) {
      prefix = prefix || 'relevant-';

      // Partition the bucket into its constituent statewide offices.
      var buckets = {};
      (officePids || []).forEach(function(pid) {
        var k = _relevantStatewideKey(pid);
        (buckets[k] || (buckets[k] = [])).push(pid);
      });

      // A short "who holds it" hint for the collapsed header, so the office reads
      // at a glance without expanding it.
      function _swHint(pids) {
        var holder = null, candidates = 0, former = 0;
        (pids || []).forEach(function(pid) {
          var st = (typeof window._pdxOfficeStatus === 'function') ? window._pdxOfficeStatus(CMP_DATA[pid]) : 'office';
          if (st === 'candidate') candidates++;
          else if (st === 'former') former++;
          else if (!holder) holder = (CMP_DATA[pid] && CMP_DATA[pid].name) || null;
        });
        if (holder && candidates) return holder + ' + ' + candidates + ' challenging';
        if (holder) return holder;
        if (candidates) return 'Open seat · ' + candidates + (candidates === 1 ? ' candidate' : ' candidates');
        if (former) return 'Past officeholders';
        return '';
      }

      var html = '';
      var first = true;
      _RELEVANT_STATEWIDE_DEFS.forEach(function(def) {
        var pids = buckets[def.key];
        if (!pids || !pids.length) return;

        // Open the first populated office by default (usually Governor) so the
        // section never opens fully collapsed; the rest start closed to keep the
        // statewide list a tidy, tappable menu.
        var swKey = prefix + 'sw-' + def.key;
        var defaultOpen = first;
        var isOpen = _browseGroupState[swKey] !== undefined ? _browseGroupState[swKey] : defaultOpen;
        var expandedClass = isOpen ? ' expanded' : '';
        var hint = _swHint(pids);

        html += '<div class="relevant-sw-group' + expandedClass + '" id="' + swKey + '-group">';
        html += '<button class="relevant-sw-header" onclick="toggleBrowseAccordion(\'' + swKey + '-group\', \'' + swKey + '\')">';
        html += '<span class="relevant-sw-icon">' + def.icon + '</span>';
        html += '<span class="relevant-sw-text">';
        html += '<span class="relevant-sw-name">' + def.label + '</span>';
        if (hint) html += '<span class="relevant-sw-hint">' + _relTxt(hint) + '</span>';
        html += '</span>';
        html += '<span class="relevant-sw-count">' + pids.length + '</span>';
        html += _chevronWrapped('relevant-sw-chevron-wrap', 'relevant-sw-chevron');
        html += '</button>';
        html += '<div class="browse-sub-body"><div class="relevant-sw-inner">';
        // Honest empty / low-field framing. Count the roles actually present so the
        // note can never imply a contest that isn't there — and never mislabel a
        // FORMER holder as the current officeholder. Shown only when the seat is
        // uncontested or thin; a genuine officeholder-vs-challenger field needs no
        // note (the role-split grid below already tells that story).
        var _swHolders = 0, _swCands = 0, _swFormer = 0;
        pids.forEach(function(pid) {
          var _st = (typeof window._pdxOfficeStatus === 'function') ? window._pdxOfficeStatus(CMP_DATA[pid]) : 'office';
          if (_st === 'candidate') _swCands++;
          else if (_st === 'former') _swFormer++;
          else _swHolders++;
        });
        var _swNote = '';
        if (_swHolders && !_swCands) {
          _swNote = (_swHolders === 1 ? 'This is the current officeholder. ' : 'These are the current officeholders. ') +
            'No declared challengers yet — check back closer to the election.';
        } else if (!_swHolders && _swCands === 1) {
          _swNote = 'Only one candidate has declared for this seat so far — more may file as the race develops.';
        } else if (!_swHolders && !_swCands && _swFormer) {
          _swNote = 'Showing the most recent officeholder for reference — no current holder or declared candidate is on file for this seat yet.';
        }
        if (_swNote) {
          html += '<div class="relevant-open-note"><span style="flex-shrink:0;">🗳️</span><span>' + _relTxt(_swNote) + '</span></div>';
        }
        html += _renderRelevantStatusSplit(pids);
        html += '</div></div></div>';

        first = false;
      });

      // Safety net: if the defs somehow matched nothing, fall back to the flat
      // field so cards never vanish.
      if (!html) return _renderRelevantStatusSplit(officePids);
      return html;
    }

    // ── Local-office sub-grouping ─────────────────────────────────────────────
    // Every local seat — Mayor, City Council, School Board, County Commissioner,
    // Sheriff, Clerk … — shares the single 'local' bucket, so the office body used
    // to dump them into one flat, unlabeled list where a voter couldn't tell what
    // each person was actually running for. These defs split that bucket into one
    // clearly-labeled block PER kind of local government, in a sensible civic order
    // (city executive → city council → schools → county → everything else), so the
    // specific office each candidate competes for is obvious at a glance. Each block
    // reuses the exact same role-split grid as the rest of Relevant to Me, so the
    // incumbent-vs-challenger visual treatment is unchanged.
    var _RELEVANT_LOCAL_DEFS = [
      { key: 'mayor',   label: 'Mayor',              icon: '🏛️', test: function(o){ return o.indexOf('mayor') !== -1; } },
      { key: 'council', label: 'City Council',       icon: '🏙️', test: function(o){ return (o.indexOf('council') !== -1 || o.indexOf('alderman') !== -1 || o.indexOf('city commission') !== -1) && o.indexOf('county') === -1; } },
      { key: 'school',  label: 'School Board',        icon: '🎓', test: function(o){ return o.indexOf('school') !== -1 || o.indexOf('board of education') !== -1; } },
      { key: 'county',  label: 'County Government',   icon: '🏞️', test: function(o){ return o.indexOf('county') !== -1; } },
      { key: 'other_local', label: 'Other Local Offices', icon: '📍', test: function(){ return true; } }
    ];
    function _relevantLocalKey(pid) {
      var d = CMP_DATA[pid];
      var o = (d && d.office ? d.office : '').toLowerCase();
      for (var i = 0; i < _RELEVANT_LOCAL_DEFS.length; i++) {
        if (_RELEVANT_LOCAL_DEFS[i].test(o)) return _RELEVANT_LOCAL_DEFS[i].key;
      }
      return 'other_local';
    }

    function _renderRelevantLocalGrouped(officePids, prefix) {
      prefix = prefix || 'relevant-';

      // Partition the local bucket into its constituent kinds of local office.
      var buckets = {};
      (officePids || []).forEach(function(pid) {
        var k = _relevantLocalKey(pid);
        (buckets[k] || (buckets[k] = [])).push(pid);
      });

      // When everything is the same kind of local office there is nothing to
      // separate into collapsible sub-groups — but we still name that office
      // plainly above the list. Without this, a Local body where every candidate
      // shares one kind of seat rendered as a flat, unlabeled roster and the voter
      // couldn't tell what office it was for. A light static banner (not another
      // collapsible layer, so every card stays visible) fixes that.
      var populated = _RELEVANT_LOCAL_DEFS.filter(function(def) { return buckets[def.key] && buckets[def.key].length; });
      if (populated.length <= 1) {
        var solo = populated[0];
        if (!solo) return _renderRelevantStatusSplit(officePids);
        var soloHint = _lHint(buckets[solo.key]);
        return '<div class="relevant-local-solo-head">' +
            '<span class="relevant-local-solo-icon">' + solo.icon + '</span>' +
            '<span class="relevant-local-solo-name">' + solo.label + '</span>' +
            (soloHint ? '<span class="relevant-local-solo-hint">' + _relTxt(soloHint) + '</span>' : '') +
          '</div>' +
          _renderRelevantStatusSplit(officePids);
      }

      // A short "who holds it / who's running" hint for the collapsed header, so
      // each kind of local office reads at a glance without expanding it.
      function _lHint(pids) {
        var holder = null, candidates = 0, former = 0;
        (pids || []).forEach(function(pid) {
          var st = (typeof window._pdxOfficeStatus === 'function') ? window._pdxOfficeStatus(CMP_DATA[pid]) : 'office';
          if (st === 'candidate') candidates++;
          else if (st === 'former') former++;
          else if (!holder) holder = (CMP_DATA[pid] && CMP_DATA[pid].name) || null;
        });
        if (holder && candidates) return holder + ' + ' + candidates + ' challenging';
        if (holder) return holder;
        if (candidates) return candidates + (candidates === 1 ? ' candidate running' : ' candidates running');
        if (former) return 'Past officeholders';
        return '';
      }

      var html = '';
      var first = true;
      _RELEVANT_LOCAL_DEFS.forEach(function(def) {
        var pids = buckets[def.key];
        if (!pids || !pids.length) return;

        var lKey = prefix + 'local-' + def.key;
        var isOpen = _browseGroupState[lKey] !== undefined ? _browseGroupState[lKey] : first;
        var expandedClass = isOpen ? ' expanded' : '';
        var hint = _lHint(pids);

        html += '<div class="relevant-sw-group' + expandedClass + '" id="' + lKey + '-group">';
        html += '<button class="relevant-sw-header" onclick="toggleBrowseAccordion(\'' + lKey + '-group\', \'' + lKey + '\')">';
        html += '<span class="relevant-sw-icon">' + def.icon + '</span>';
        html += '<span class="relevant-sw-text">';
        html += '<span class="relevant-sw-name">' + def.label + '</span>';
        if (hint) html += '<span class="relevant-sw-hint">' + _relTxt(hint) + '</span>';
        html += '</span>';
        html += '<span class="relevant-sw-count">' + pids.length + '</span>';
        html += _chevronWrapped('relevant-sw-chevron-wrap', 'relevant-sw-chevron');
        html += '</button>';
        html += '<div class="browse-sub-body"><div class="relevant-sw-inner">';
        html += _renderRelevantStatusSplit(pids);
        html += '</div></div></div>';

        first = false;
      });

      // Safety net: if the defs somehow matched nothing, fall back to the flat
      // field so cards never vanish.
      if (!html) return _renderRelevantStatusSplit(officePids);
      return html;
    }

    function _renderRelevantGroupedChamber(officePids, groupKey, prefix) {
      prefix = prefix || 'rel-';
      var stateName = 'Utah';
      
      var ranges = (groupKey === 'state_senator') ? _SENATE_RANGES : _DISTRICT_RANGES;
      // Reuse the robust, multi-format district resolver so a representative is
      // grouped into the correct range no matter how their district is spelled.
      var distNumOf = function(pid) { return _relevantDistNum(pid); };

      var html = '';
      
      // Group by range
      ranges.forEach(function(rng) {
        var rangePids = officePids.filter(function(pid) {
          var dn = distNumOf(pid);
          return dn !== null && dn >= rng.min && dn <= rng.max;
        });
        
        if (rangePids.length === 0) return;
        
        var rngKey = prefix + groupKey + '-rng-' + rng.min + '-' + rng.max;
        var isRngOpen = _browseGroupState[rngKey] !== false; // expanded by default
        var rngExpandedClass = isRngOpen ? ' expanded' : '';
        var rngTitle = 'Districts ' + rng.min + '–' + rng.max + ' (' + rng.label + ')';

        html += '<div class="browse-range-group border border-gold-400/15 rounded-lg overflow-hidden bg-navy-900/30 mb-2' + rngExpandedClass + '" id="' + rngKey + '-group">';
        html += '<button class="w-full flex items-center justify-between px-3 py-2.5 bg-navy-800/50 hover:bg-navy-800/70 text-left border-none" onclick="toggleBrowseAccordion(\'' + rngKey + '-group\', \'' + rngKey + '\')" style="min-height: 42px;">';
        html += '<div class="flex items-center gap-1.5">';
        html += '<span class="text-[11px] text-gold-400">▦</span>';
        html += '<span class="font-condensed font-700 text-xs text-gold-300 uppercase tracking-wide">' + rngTitle + '</span>';
        html += '<span class="text-[10px] text-steel-400 bg-white/5 border border-white/5 rounded-full px-1.5 py-0.5 ml-1">' + rangePids.length + '</span>';
        html += '</div>';
        html += _chevronWrapped('w-5 h-5 flex items-center justify-center rounded-full bg-white/5 text-steel-400', 'w-2.5 h-2.5 text-steel-400 transition-transform duration-300');
        html += '</button>';
        html += '<div class="browse-sub-body"><div class="p-2 space-y-2">';
        html += _renderRelevantStatusSplit(rangePids);
        html += '</div></div></div>';
      });

      // Catch any politicians that didn't fit into the numeric ranges (e.g. statewide/no district)
      var otherPids = officePids.filter(function(pid) {
        var dn = distNumOf(pid);
        return dn === null;
      });
      
      if (otherPids.length > 0) {
        var otherKey = prefix + groupKey + '-rng-other';
        var isOtherOpen = _browseGroupState[otherKey] !== false;
        var otherExpandedClass = isOtherOpen ? ' expanded' : '';
        
        html += '<div class="browse-range-group border border-white/5 rounded-lg overflow-hidden bg-navy-900/30 mb-2' + otherExpandedClass + '" id="' + otherKey + '-group">';
        html += '<button class="w-full flex items-center justify-between px-3 py-2.5 bg-navy-800/50 hover:bg-navy-800/70 text-left border-none" onclick="toggleBrowseAccordion(\'' + otherKey + '-group\', \'' + otherKey + '\')" style="min-height: 42px;">';
        html += '<div class="flex items-center gap-1.5">';
        html += '<span class="text-[11px] text-steel-400">👤</span>';
        html += '<span class="font-condensed font-700 text-xs text-steel-300 uppercase tracking-wide">Other Districts</span>';
        html += '<span class="text-[10px] text-steel-400 bg-white/5 border border-white/5 rounded-full px-1.5 py-0.5 ml-1">' + otherPids.length + '</span>';
        html += '</div>';
        html += _chevronWrapped('w-5 h-5 flex items-center justify-center rounded-full bg-white/5 text-steel-400', 'w-2.5 h-2.5 text-steel-400 transition-transform duration-300');
        html += '</button>';
        html += '<div class="browse-sub-body"><div class="p-2 space-y-2">';
        html += _renderRelevantStatusSplit(otherPids);
        html += '</div></div></div>';
      }

      return html;
    }

    // Renders the Federal → State → Local accordion tree for a set of office
    // groups (shared by both the focused ballot view and the legacy fallback).
    // ctx carries focus metadata + optional extra HTML appended inside a level
    // (used to tuck the "explore the full chamber" browser under STATE LEVEL).
    function _renderRelevantTree(officeGroups, ctx) {
      ctx = ctx || {};

      function _renderOfficeAccordion(groupKey) {
        var officePids = officeGroups[groupKey] || [];
        var tDef = _RELEVANT_OFFICE_DEFS[groupKey];
        if (!tDef) return '';
        var isOfficeOpen = _browseGroupState['relevant-office-' + groupKey] !== undefined
          ? _browseGroupState['relevant-office-' + groupKey]
          : (ctx.focused === true); // focused ballot opens its seats by default
        var officeExpandedClass = isOfficeOpen ? ' expanded' : '';
        var subtitle = _relevantOfficeSubtitle(groupKey, ctx);

        var h = '';
        h += '<div class="browse-type-group' + officeExpandedClass + '" id="relevant-browse-group-' + groupKey + '">';
        h += '<button class="browse-type-header" onclick="toggleBrowseAccordion(\'relevant-browse-group-' + groupKey + '\', \'relevant-office-' + groupKey + '\')">';
        h += '<div class="browse-type-title">';
        h += '<div class="browse-type-icon" style="background:' + tDef.bg + ';">' + tDef.icon + '</div>';
        h += '<div style="display:flex;flex-direction:column;min-width:0;gap:0.18rem;">';
        h += '<span class="browse-type-name">' + tDef.label + '</span>';
        var _whyPill = _relevantPrecisionBadge(groupKey, ctx);
        // Coverage pill: does the voter already have a pick from this seat on
        // their team? Reads the live ballot so the answer matches My Team exactly.
        var _cov = _relevantOfficeCoverage(groupKey, ctx.teamSel);
        var _covPill = '';
        if (_cov.tracked) {
          _covPill = _cov.filled
            ? '<span class="relevant-cov-pill is-filled">✓ On your team</span>'
            : '<span class="relevant-cov-pill is-open">➕ Add your pick</span>';
        }
        if (subtitle || _whyPill || _covPill) {
          h += '<span style="display:inline-flex;flex-wrap:wrap;align-items:center;gap:0.32rem;min-width:0;">';
          if (_whyPill) h += _whyPill;
          if (_covPill) h += _covPill;
          if (subtitle) h += '<span class="browse-type-scope">📍 ' + subtitle + '</span>';
          h += '</span>';
        }
        h += '</div>';
        h += '<span class="browse-type-count">' + officePids.length + (officePids.length === 1 ? ' option' : ' options') + '</span>';
        h += '</div>';
        h += _chevronWrapped('browse-type-chevron-wrap', 'browse-type-chevron');
        h += '</button>';
        h += '<div class="browse-type-body"><div class="browse-type-inner">';

        // County-level chambers: we have the voter's county but not their single
        // state-legislative district, so the body lists every seat in the county.
        // Say so plainly — and offer the one tap that narrows it — instead of
        // letting the voter assume all of these people personally represent them.
        var _kind = _relevantPrecisionKind(groupKey, ctx);
        if (officePids.length > 1 && _kind === 'county' && (groupKey === 'state_senator' || groupKey === 'state_rep')) {
          var _chamberWord = groupKey === 'state_senator' ? 'State Senate' : 'State House';
          h += '<div class="relevant-narrow-note">' +
            '<span style="flex-shrink:0;">📍</span>' +
            '<span>Showing all ' + officePids.length + ' ' + _chamberWord + ' seats in <strong>' + (ctx.county || 'your county') + '</strong>. ' +
            'Your single district is one of these — <button type="button" onclick="window.toggleChangeLocation()" class="relevant-narrow-link">add your district</button> to pinpoint just yours.</span>' +
          '</div>';
        }

        if (officePids.length === 0) {
          h += '<div class="text-center py-6 px-4 bg-navy-950/20 border border-white/5 rounded-xl m-2">' +
            '<p class="font-condensed text-xs text-steel-400 m-0">No politicians are currently listed in our database for this specific district/office.</p>' +
            '</div>';
        } else {
          // Open-seat nudge: this office maps to a team slot the voter hasn't
          // filled yet, so point them at the one action that fills it — add the
          // candidate who earns their vote (compare first when there's a field).
          if (_cov.tracked && !_cov.filled) {
            var _yours = _RELEVANT_OFFICE_YOURS[groupKey] || 'your representative';
            var _addMsg = officePids.length > 1
              ? 'Compare the candidates in your district, then tap <strong>⭐ Add to My Team</strong> on the one who earns your vote. This seat is still <strong>open</strong> on your team.'
              : 'Tap <strong>⭐ Add to My Team</strong> to put ' + _relTxt(_yours) + ' on your team. This seat is still <strong>open</strong>.';
            // When there's a real field, give the voter a one-tap way to weigh
            // everyone running side by side before they commit a pick. Suppressed
            // for the statewide bucket, where the field spans several different
            // offices — each statewide sub-office below carries its own correctly
            // scoped "compare the field" instead.
            var _addCmp = (officePids.length > 1 && groupKey !== 'governor')
              ? ' <button type="button" class="relevant-addhint-cmp" onclick="window._relevantCompareOffice(\'' + groupKey + '\')">⚖️ Compare the field</button>'
              : '';
            h += '<div class="relevant-addhint"><span class="relevant-addhint-ico">➕</span><span>' + _addMsg + _addCmp + '</span></div>';
          }
          // Rank this office's whole field by the visitor's issues without opening
          // a single profile — shown whenever there's an actual field to compare.
          // Skipped for the statewide bucket: ranking a Governor against an
          // Attorney General as one list is meaningless, so each statewide
          // sub-office renders its own per-race ranking instead.
          if (officePids.length >= 2 && groupKey !== 'governor') {
            h += '<div class="relevant-rankrow">' +
              '<button type="button" class="relevant-rank-btn" onclick="window._alignBoardFromOffice && window._alignBoardFromOffice(\'' + groupKey + '\')">🎯 Rank these ' + officePids.length + ' by my values</button>' +
            '</div>';
          }
          if (groupKey === 'state_senator' || groupKey === 'state_rep') {
            h += _renderRelevantGroupedChamber(officePids, groupKey, 'relevant-');
          } else if (groupKey === 'governor') {
            h += _renderRelevantStatewideGrouped(officePids, 'relevant-');
          } else if (groupKey === 'local') {
            h += _renderRelevantLocalGrouped(officePids, 'relevant-');
          } else {
            h += _renderRelevantStatusSplit(officePids);
          }
        }
        
        h += '</div></div></div>';
        return h;
      }

      var html = '';
      _RELEVANT_LEVEL_DEFS.forEach(function(lvl) {
        var inner = '';
        var levelTotal = 0;
        lvl.offices.forEach(function(ok) {
          var pidsForOffice = officeGroups[ok];
          if (pidsForOffice && pidsForOffice.length) {
            levelTotal += pidsForOffice.length;
            inner += _renderOfficeAccordion(ok);
          } else {
            // Include empty accordions only for district offices (representative, state_senator, state_rep)
            // to show a clear and helpful empty message instead of just omitting them.
            if (ok === 'representative' || ok === 'state_senator' || ok === 'state_rep') {
              inner += _renderOfficeAccordion(ok);
            }
          }
        });
        // Append any extra content for this level (e.g. the chamber explorer),
        // which can render even when the level has no focused seats.
        var extra = (ctx.levelExtras && ctx.levelExtras[lvl.key]) || '';
        if (!inner && !extra) return;

        var isLevelOpen = _browseGroupState['relevant-level-' + lvl.key] !== undefined
          ? _browseGroupState['relevant-level-' + lvl.key]
          : ((ctx.focused === true || ctx.defaultView === true) && (lvl.key === 'federal' || lvl.key === 'state'));
        var levelExpandedClass = isLevelOpen ? ' expanded' : '';

        html += '<div class="relevant-level relevant-level-' + lvl.key + levelExpandedClass + '" id="relevant-level-group-' + lvl.key + '">';
        html += '<button class="relevant-level-header" onclick="toggleBrowseAccordion(\'relevant-level-group-' + lvl.key + '\', \'relevant-level-' + lvl.key + '\')">';
        html += '<div class="relevant-level-icon">' + lvl.icon + '</div>';
        html += '<span class="relevant-level-name">' + lvl.label + '</span>';
        html += '<span class="relevant-level-count">' + levelTotal + ' ' + (levelTotal === 1 ? 'OFFICIAL' : 'OFFICIALS') + '</span>';
        html += _chevronWrapped('relevant-level-chevron-wrap', 'relevant-level-chevron');
        html += '</button>';
        html += '<div class="relevant-level-body">' + inner + extra + '</div>';
        html += '</div>';
      });
      return html;
    }

    // Parse a plain district number for a politician (state senate/house/U.S.
    // House) from its resolved "District N (County)" label — used to match a
    // representative to the voter's exact district.
    function _relevantDistNum(pid) {
      var d = CMP_DATA[pid];
      if (!d) return null;
      // Read the district number straight from the record's own fields first — the
      // dedicated `district` field is most authoritative, then the (possibly
      // Firestore-overwritten) `state` field, the cached original state, and the
      // office text. _pdxDistNumFromStr normalizes every inconsistent format
      // ("District 15", "House District 15", "HD15", "UT-15", "(Dist. 15)", "15"),
      // so whatever spelling a record happens to use does not matter.
      var orig = window._originalStates && window._originalStates[pid];
      var sources = [d.district, d.state, orig, d.office];
      for (var i = 0; i < sources.length; i++) {
        var n = _pdxDistNumFromStr(sources[i]);
        if (n !== null) return n;
      }
      // Final fallback: the resolved "District N (County)" display label.
      return _pdxDistNumFromStr(_getPoliticianDistrictOrCounty(pid));
    }

    // Collapsible "explore every district" browser for one state chamber. Keeps
    // the full 29-seat Senate / 75-seat House navigable by reusing the shared
    // range-grouped tree (Districts 1–15, 16–30, …) instead of one long scroll.
    // Returns '' when there is nothing worth browsing. Renders ONE collapsed
    // section holding both state chambers; the shared browse tree gives each its
    // own correct district ranges and per-district county labels automatically.
    function _relevantExploreSection(stateName, senateDistNum, lowerDistNum) {
      var pids = Object.keys(CMP_DATA).filter(function(pid) {
        var t = _classifyBrowseType(pid);
        return (t === 'state_senator' || t === 'state_rep') && _getPoliticianState(pid) === stateName;
      });
      if (pids.length <= 1) return '';

      var yourBits = [];
      if (senateDistNum != null) yourBits.push('Senate ' + senateDistNum);
      if (lowerDistNum != null) yourBits.push('House ' + lowerDistNum);
      var yourLine = yourBits.length
        ? 'Your seats (' + yourBits.join(' · ') + ') stay highlighted in your ballot above.'
        : '';

      var wrapKey = 'relexplore-wrap';
      var isOpen = _browseGroupState[wrapKey] === true;
      var openClass = isOpen ? ' expanded' : '';

      var h = '';
      h += '<div class="browse-type-group' + openClass + '" id="' + wrapKey + '-group" style="border-color:rgba(245,200,66,0.22);margin-top:0.6rem;">';
      h += '<button class="browse-type-header" onclick="toggleBrowseAccordion(\'' + wrapKey + '-group\', \'' + wrapKey + '\')" style="background:rgba(245,200,66,0.05);">';
      h += '<div class="browse-type-title">';
      h += '<div class="browse-type-icon" style="background:linear-gradient(135deg, rgba(245,200,66,0.22), rgba(30,53,96,0.3));">🔎</div>';
      h += '<div style="display:flex;flex-direction:column;min-width:0;">';
      h += '<span class="browse-type-name" style="font-size:1.02rem;">Explore other ' + stateName + ' districts</span>';
      h += '<span class="font-condensed" style="font-size:0.62rem;letter-spacing:0.04em;color:#9a8a4a;text-transform:none;line-height:1.2;margin-top:1px;">State Senate &amp; State House, grouped by district range. ' + yourLine + '</span>';
      h += '</div>';
      h += '<span class="browse-type-count">' + pids.length + '</span>';
      h += '</div>';
      h += _chevronWrapped('browse-type-chevron-wrap', 'browse-type-chevron');
      h += '</button>';
      h += '<div class="browse-type-body"><div class="browse-type-inner">';
      h += _renderGroupedBrowse(pids, 'relexplore-', { forceOpen: false, defaultOpen: false });
      h += '</div></div></div>';
      return h;
    }

    // Open the matching Relevant-to-Me office group (and its parent Federal/
    // State/Local level) and scroll it into view. Powers the "Your 2026 Ballot"
    // quick-jump chips so voters can navigate straight to any race.
    window._relevantJump = function(levelKey, officeKey) {
      try {
        var lvl = document.getElementById('relevant-level-group-' + levelKey);
        if (lvl && !lvl.classList.contains('expanded')) {
          lvl.classList.add('expanded');
          _browseGroupState['relevant-level-' + levelKey] = true;
        }
        var grp = document.getElementById('relevant-browse-group-' + officeKey);
        if (grp && !grp.classList.contains('expanded')) {
          grp.classList.add('expanded');
          _browseGroupState['relevant-office-' + officeKey] = true;
        }
        var target = grp || lvl;
        if (target && typeof target.scrollIntoView === 'function') {
          target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      } catch (e) {}
    };

    // Load every candidate in one of the voter's own races into the Compare tool
    // and open it — the "explore my options before I commit" path the section
    // promises. Falls back to simply jumping to the office when there's only one
    // name to weigh (nothing to compare). The Compare overlay shows up to four
    // columns, so a deep field is capped to keep the table readable.
    window._relevantCompareOffice = function(groupKey) {
      try {
        var groups = window._relevantLastOfficeGroups || {};
        var pids = (groups[groupKey] || []).filter(function(pid) { return CMP_DATA[pid]; });
        if (pids.length < 2) {
          var lvl = (typeof _RELEVANT_OFFICE_LEVEL !== 'undefined' && _RELEVANT_OFFICE_LEVEL[groupKey]) || 'state';
          if (window._relevantJump) window._relevantJump(lvl, groupKey);
          return;
        }
        var capped = pids.slice(0, 4);
        if (typeof _cmpSelected !== 'undefined' && _cmpSelected) {
          _cmpSelected.clear();
          capped.forEach(function(pid) { _cmpSelected.add(pid); });
        }
        // Refresh the other grids' compare checkboxes so their state matches, then
        // open the overlay (mirrors how My Team's "Compare All" launches).
        if (typeof chubBuildAll === 'function') { try { chubBuildAll(); } catch (e) {} }
        if (typeof _mypolBuildGrid === 'function') { try { _mypolBuildGrid(); } catch (e) {} }
        if (typeof openCompare === 'function') openCompare();
      } catch (e) {}
    };

    // Open the Best-Matches board focused on one office's field — ranks just the
    // people running for (or holding) this seat by the visitor's chosen issues.
    window._alignBoardFromOffice = function(groupKey) {
      try {
        var groups = window._relevantLastOfficeGroups || {};
        var pids = (groups[groupKey] || []).filter(function(pid) { return CMP_DATA[pid]; });
        if (!pids.length || typeof window.openAlignBoard !== 'function') return;
        var tDef = (typeof _RELEVANT_OFFICE_DEFS !== 'undefined') ? _RELEVANT_OFFICE_DEFS[groupKey] : null;
        window.openAlignBoard('__focus', {
          pids: pids,
          label: (tDef && tDef.label) ? tDef.label : 'This office',
          sub: 'On your ballot',
          ico: (tDef && tDef.icon) ? tDef.icon : '🏛️'
        });
      } catch (e) {}
    };

    // ── Always-on default slate (no saved location) ─────────────────────────
    // The section must NEVER disappear behind a "choose your area" wall. When the
    // voter hasn't picked a location yet we still render a complete, organized
    // list — every Utah race grouped Federal → State → Local — with a compact
    // personalization banner on top inviting them to narrow it to their own
    // districts. Built straight from the curated Key Races rosters (referenced by
    // ID) plus a sweep of every in-state ballot office, so it can never come up
    // empty regardless of how individual records spell their state/district.
    window._renderRelevantDefaultSlate = function() {
      var relevantGrid = document.getElementById('relevant-browse-grid');
      var relevantCountBadge = document.getElementById('relevant-count-badge');
      var relevantLocText = document.getElementById('relevant-location-text');
      if (!relevantGrid) return;

      var byLoc     = window.KEY_RACES_BY_LOCATION || {};
      var statewide = window.KEY_RACES_STATEWIDE || [];

      var picked = {};
      function add(pid, gk) {
        if (!pid || !CMP_DATA[pid] || picked[pid]) return;
        picked[pid] = gk;
      }
      var RK = { house: 'representative', statesenate: 'state_senator', statehouse: 'state_rep', governor: 'governor', senate: 'senator', president: 'president' };
      var addRace = function(r, defGk) {
        var gk = RK[r.raceKey] || defGk;
        add(r.incumbentPid, gk);
        (r.incumbentPids || []).forEach(function(p) { add(p, gk); });
        (r.candidates || []).forEach(function(p) { add(p, gk); });
      };
      statewide.forEach(function(r) { addRace(r, 'governor'); });
      Object.keys(byLoc).forEach(function(loc) { (byLoc[loc] || []).forEach(function(r) { addRace(r, 'representative'); }); });

      // Sweep every Utah ballot-level official/candidate (plus federal executives,
      // who represent every voter) so the statewide preview is the full field, not
      // just the curated headline names.
      var BALLOT = { senator: 1, governor: 1, representative: 1, state_senator: 1, state_rep: 1, local: 1 };
      Object.keys(CMP_DATA).forEach(function(pid) {
        var t = _classifyBrowseType(pid);
        if (t === 'president' || t === 'cabinet') { add(pid, t); return; }
        if (_getPoliticianState(pid).toLowerCase() !== 'utah') return;
        if (BALLOT[t]) add(pid, t);
      });

      var officeGroups = {};
      Object.keys(picked).forEach(function(pid) { var g = picked[pid]; (officeGroups[g] = officeGroups[g] || []).push(pid); });
      var total = Object.keys(picked).length;
      if (relevantCountBadge) relevantCountBadge.textContent = total;
      window._relevantLastOfficeGroups = officeGroups;

      // No personalized ballot yet → hide the guided next-step banner and the
      // "why these names" hint (both assume a focused ballot).
      var _gEl = document.getElementById('relevant-guided-status');
      if (_gEl) { _gEl.innerHTML = ''; _gEl.style.display = 'none'; }
      var _relGridHint = document.getElementById('relevant-grid-hint');
      if (_relGridHint) _relGridHint.style.display = 'none';

      if (relevantLocText) {
        relevantLocText.innerHTML = '🇺🇸 Showing <strong class="text-blue-300">every Utah race</strong> — federal, statewide &amp; state legislature, grouped by office. ' +
          '<button type="button" onclick="window.toggleChangeLocation()" style="background:none;border:none;color:#60a5fa;text-decoration:underline;cursor:pointer;padding:0;font:inherit;">Set your area</button> to focus this to your exact districts.';
      }
      try { if (typeof window._homeRenderRelevantTag === 'function') window._homeRenderRelevantTag(); } catch (e) {}

      // Compact personalization banner — keeps the full list visible while making
      // "narrow this to MY districts" a one-tap action right where the list starts.
      var _areaChips = (typeof window._relevantAreaSwitcher === 'function') ? window._relevantAreaSwitcher(null, { big: false }) : '';
      var banner =
        '<div style="margin-bottom:1.1rem;padding:1.05rem 1.15rem;border-radius:1.1rem;background:linear-gradient(135deg,rgba(30,58,138,0.22),rgba(245,200,66,0.05));border:1px solid rgba(59,130,246,0.38);">' +
          '<div style="display:flex;align-items:baseline;gap:0.55rem;flex-wrap:wrap;margin-bottom:0.35rem;">' +
            '<span style="font-family:\'Bebas Neue\',sans-serif;letter-spacing:0.05em;font-size:1.3rem;color:#fff;">📍 Make this your ballot</span>' +
            '<span style="font-family:\'Barlow Condensed\',sans-serif;font-size:0.74rem;letter-spacing:0.03em;color:#9fb4d4;">Optional — the full list is below either way</span>' +
          '</div>' +
          '<p style="font-family:\'Barlow Condensed\',sans-serif;font-size:0.9rem;color:#cbd9ee;line-height:1.5;margin:0 0 0.85rem;max-width:44rem;">Pick your Utah area and this list narrows to <strong style="color:#fff;">your exact U.S. House, State Senate and State House districts</strong> — the people who hold those seats today and the 2026 candidates running for them.</p>' +
          (_areaChips ? '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:0.5rem;margin-bottom:0.75rem;">' + _areaChips + '</div>' : '') +
          '<button type="button" onclick="window.toggleChangeLocation()" class="font-condensed text-xs font-700 tracking-wider uppercase text-white bg-blue-600 hover:bg-blue-500 border border-blue-400/40 px-4 py-2.5 rounded-xl transition-all shadow-md min-h-[44px]" style="cursor:pointer;">📍 Enter a different location</button>' +
        '</div>';

      var ctx = {
        focused: false, defaultView: true, state: 'Utah',
        houseDist: '', senateDist: '', lowerDist: '',
        teamSel: (typeof _relevantTeamSelections === 'function') ? _relevantTeamSelections() : null,
        levelExtras: null
      };
      relevantGrid.innerHTML = banner + ((typeof _renderRelevantTree === 'function') ? _renderRelevantTree(officeGroups, ctx) : '');
    };

    // ── Authoritative voting-district resolver ────────────────────────────────
    // Resolve the voter's real district numbers for the three district offices
    // (U.S. House, State Senate, State House) from the SAME curated Key Races
    // boundary data the rest of the section renders. Returns numeric districts
    // (or null when one genuinely can't be determined). This is the single source
    // of truth used to STRICTLY filter the slate, so "Relevant to Me" can never
    // show a politician from a neighboring district — e.g. a U.S. House District 1
    // incumbent appearing for a voter the maps place in District 2.
    function _relevantVoterDistricts() {
      // Memoize on a cheap location signature. _isRelevantToUser now calls this
      // per-politician inside browse/Power-Map filter loops, and the resolver
      // does localStorage reads plus area inference — so recomputing it hundreds
      // of times per pass would be wasteful. The signature captures everything
      // the result depends on (saved location + active curated area), so the
      // cache refreshes the instant the voter changes where they vote.
      var loc0 = window._currentVoterLocation || {};
      var krId0 = '';
      try { krId0 = localStorage.getItem(window.KR_LOCATION_KEY || 'politidex_keyraces_location') || ''; } catch (e) {}
      var sig = [loc0.state || '', loc0.county || '', loc0.city || '', loc0.district || '',
                 loc0.stateSenateDistrict || '', loc0.stateHouseDistrict || '', krId0].join('|');
      if (window._relevantVoterDistrictsCache && window._relevantVoterDistrictsCache.sig === sig) {
        return window._relevantVoterDistrictsCache.val;
      }
      var out = { representative: null, state_senator: null, state_rep: null };
      try {
        var loc = window._currentVoterLocation || {};
        // The voter's saved/detected U.S. House district is authoritative for
        // Congress whenever it parses to a number.
        var ud = parseInt(String(loc.district || '').replace(/[^0-9]/g, ''), 10);
        if (!isNaN(ud)) out.representative = ud;

        // Exact State Senate / State House districts the voter pinpointed on the
        // interactive map are the single most authoritative signal we have for
        // those chambers — they are an explicit "this is my seat" from the voter,
        // so they outrank the curated-area inference below. Without this, a voter
        // who map-selected State Senate 6 / State House 15 had those exact picks
        // silently dropped and the section fell back to a broader (often wrong)
        // district — part of the "fill this seat shows the wrong district" bug.
        var uss = parseInt(String(loc.stateSenateDistrict || '').replace(/[^0-9]/g, ''), 10);
        if (!isNaN(uss)) out.state_senator = uss;
        var ush = parseInt(String(loc.stateHouseDistrict || '').replace(/[^0-9]/g, ''), 10);
        if (!isNaN(ush)) out.state_rep = ush;

        // Fill any remaining offices from the voter's curated area — an explicit
        // pick wins, otherwise the area inferred from their saved city/county.
        // _krDistrictsForLocation reads the rebuilt, boundary-derived race data,
        // so the numbers mirror Utah's official 2026 districts exactly (e.g. Davis
        // County → U.S. House 2, never the stale literal's District 1).
        var id = krId0;
        if (!id || !((window.KEY_RACES_BY_LOCATION || {})[id])) {
          id = (typeof window._krInferLocation === 'function') ? (window._krInferLocation() || '') : '';
        }
        if (id && typeof window._krDistrictsForLocation === 'function') {
          var d = window._krDistrictsForLocation(id);
          if (d) {
            if (out.representative == null && d.congress != null) out.representative = d.congress;
            if (out.state_senator  == null && d.senate   != null) out.state_senator  = d.senate;
            if (out.state_rep      == null && d.house    != null) out.state_rep      = d.house;
          }
        }
      } catch (e) {}
      window._relevantVoterDistrictsCache = { sig: sig, val: out };
      return out;
    }

    // ── Strict district enforcement ───────────────────────────────────────────
    // The authoritative guard applied to the finished office groups: for each
    // district office whose district we actually know, keep only the voter's own
    // curated roster for that seat plus any politician whose OWN resolved district
    // number matches. Statewide offices (President, U.S. Senate, Governor) and
    // local offices are never touched.
    //
    // `rosters` is the per-office allow-list from _pdxVoterBallot — the curated
    // incumbent + challengers for the voter's exact seat. Anyone on it is kept
    // even if a synced record lost its district number, so the voter's real reps
    // are never dropped. Everyone else must PROVE they share the district: an
    // unresolved district is now treated as a mismatch and removed, because for a
    // seat where we hold the authoritative roster a district we cannot confirm is
    // far more likely a neighbouring-district bleed than the voter's own rep. This
    // closes the leak where a bare-"Utah" record slid through the old
    // "unknown district → keep" rule.
    function _relevantEnforceDistricts(officeGroups, dists, rosters) {
      rosters = rosters || {};
      ['representative', 'state_senator', 'state_rep'].forEach(function(gk) {
        var want = dists[gk];
        if (want == null || isNaN(want)) return;          // district unknown → leave office as-is
        var pids = officeGroups[gk];
        if (!pids || !pids.length) return;
        var allow = rosters[gk] || [];
        officeGroups[gk] = pids.filter(function(pid) {
          if (allow.indexOf(pid) !== -1) return true;     // voter's own curated roster is always kept
          var dn = (typeof _relevantDistNum === 'function') ? _relevantDistNum(pid) : null;
          if (dn === null) return false;                  // unknown district & not on roster → strict cut
          return dn === want;
        });
        if (!officeGroups[gk].length) delete officeGroups[gk];
      });
    }

    // Bare county token (e.g. "davis", "salt lake") → the set of U.S. House
    // districts that county actually spans, built ONCE from the authoritative
    // curated area table (KEY_RACES_LOCATIONS). Counties that straddle two
    // congressional districts (Salt Lake → 1 & 4, Utah → 3 & 4) return both, so
    // the county fallback stays correct without ever inventing a wrong district.
    function _relevantCountyCongressDistricts(cLower) {
      var cache = window._relevantCountyCDsCache;
      if (!cache) {
        cache = {};
        try {
          (window.KEY_RACES_LOCATIONS || []).forEach(function(loc) {
            if (!loc || loc.congressDistrict == null) return;
            var key = String(loc.county || '').toLowerCase().replace(/\s*county\s*/g, '').trim();
            if (!key) return;
            (cache[key] = cache[key] || []);
            if (cache[key].indexOf(loc.congressDistrict) === -1) cache[key].push(loc.congressDistrict);
          });
        } catch (e) {}
        window._relevantCountyCDsCache = cache;
      }
      return cache[cLower] || [];
    }

    // Internal implementation. The public window.renderRelevantToMe wrapper
    // (defined just below) invokes this inside a try/catch so that a single
    // unexpected error can never again leave the section silently stuck on its
    // "0" HTML default — which is exactly what used to happen.
    function _renderRelevantToMeImpl() {
      // ── Cross-block data bridge ──────────────────────────────────────────
      // The curated Key Races rosters, the storage key and the two location
      // helpers are declared inside a DIFFERENT <script> block's IIFE and are
      // published on `window` there. Referencing them by bare name from here
      // threw a ReferenceError the instant a voter had a saved location — the
      // original cause of the perpetual "0 politicians". Alias them into locals
      // so every reference below resolves explicitly, with safe defaults if the
      // Key Races block has not run yet.
      var KR_LOCATION_KEY       = window.KR_LOCATION_KEY || 'politidex_keyraces_location';
      var KEY_RACES_BY_LOCATION = window.KEY_RACES_BY_LOCATION || {};
      var KEY_RACES_STATEWIDE   = window.KEY_RACES_STATEWIDE || [];
      var _krInferLocation      = (typeof window._krInferLocation === 'function') ? window._krInferLocation : function() { return ''; };
      var _krLocationMeta       = (typeof window._krLocationMeta === 'function') ? window._krLocationMeta : function() { return { label: 'Utah', city: '', county: '' }; };

      var relevantGrid = document.getElementById('relevant-browse-grid');
      var relevantCountBadge = document.getElementById('relevant-count-badge');
      var relevantLocText = document.getElementById('relevant-location-text');
      if (!relevantGrid) return;

      // Show the "why these names appear" helper only once there's a personalized
      // ballot to explain — above the location prompt it would just add noise.
      var _relGridHint = document.getElementById('relevant-grid-hint');
      if (_relGridHint) _relGridHint.style.display = window._hasUserLocation ? 'flex' : 'none';

      // Until the visitor has actually chosen an area, never pre-load a default
      // (Utah) slate dressed up as "their" representatives. Show a clean,
      // non-partisan prompt with the Detect / Map actions instead; the real local
      // and federal representatives populate only once a location is set. The
      // section header stays visible and neutral (see updateRelevantLocationText).
      if (!window._hasUserLocation) {
        if (relevantCountBadge) relevantCountBadge.textContent = '0';
        window._relevantLastOfficeGroups = {};
        relevantGrid.innerHTML = (typeof window._relevantLocationPrompt === 'function') ? window._relevantLocationPrompt() : '';
        return;
      }

      var krData = (typeof window.keyRacesRelevantData === 'function') ? window.keyRacesRelevantData() : null;
      var locId = localStorage.getItem(KR_LOCATION_KEY) || _krInferLocation();

      // If locId is valid, retrieve krData for that locId to ensure we have the correct data:
      if (locId && KEY_RACES_BY_LOCATION[locId]) {
        krData = (function() {
          try {
            var races = KEY_RACES_BY_LOCATION[locId];
            var meta = _krLocationMeta(locId);
            var explicit = !!(localStorage.getItem(KR_LOCATION_KEY) && KEY_RACES_BY_LOCATION[localStorage.getItem(KR_LOCATION_KEY)]);
            var matched = explicit || (_krInferLocation() !== '');
            var pidsOf = function(r) {
              var a = [];
              var push = function(p) { if (p && a.indexOf(p) === -1) a.push(p); };
              push(r.incumbentPid);
              (r.incumbentPids || []).forEach(push);
              (r.candidates || []).forEach(push);
              return a;
            };
            var distOf = function(r) {
              var m = String(r.district || r.short || '').match(/(\d+)\s*$/);
              return m ? m[1] : null;
            };
            var out = {
              locId: locId, label: meta.label, city: meta.city, county: meta.county,
              state: 'Utah', matched: matched, byRace: {}, statewide: {}
            };
            races.forEach(function(r) {
              out.byRace[r.raceKey] = { district: distOf(r), pids: pidsOf(r) };
            });
            (KEY_RACES_STATEWIDE || []).forEach(function(r) {
              out.statewide[r.raceKey] = pidsOf(r);
            });
            return out;
          } catch (e) { return null; }
        })();
      }

      var stateName = (window._currentVoterLocation && window._currentVoterLocation.state) || 'Utah';
      var userCounty = (window._currentVoterLocation && (window._currentVoterLocation.county || window._currentVoterLocation.city || '')) || '';
      var userDistrict = (window._currentVoterLocation && window._currentVoterLocation.district) || '';

      // Normalize county name
      var normalizedCounty = '';
      if (userCounty) {
        var ucLower = userCounty.toLowerCase();
        if (ucLower.includes('davis') || ucLower.includes('layton')) normalizedCounty = 'Davis County';
        else if (ucLower.includes('utah') || ucLower.includes('provo') || ucLower.includes('orem')) normalizedCounty = 'Utah County';
        else if (ucLower.includes('washington') || ucLower.includes('st. george') || ucLower.includes('st george')) normalizedCounty = 'Washington County';
        else if (ucLower.includes('weber') || ucLower.includes('ogden')) normalizedCounty = 'Weber County';
        else normalizedCounty = userCounty;
      }

      // Whether we hold the voter's AUTHORITATIVE exact-district ballot: a curated
      // Utah area they explicitly picked, or one inferred from their saved
      // city/county. (The same determination is referenced again further down for
      // the district lookups; computed here so the header and the narrowing tiers
      // below can both rely on it.)
      var isUtah = (stateName || '').toLowerCase() === 'utah';
      var krMatched = !!(krData && isUtah && krData.matched);

      // When the active area is a matched curated area but the modal county is
      // blank — e.g. the voter set their area through the "Your Key Races"
      // selector rather than the location modal — adopt that area's county so the
      // header reads correctly and the county heuristics still narrow to it.
      if (!normalizedCounty && krMatched && krData && krData.county) {
        normalizedCounty = krData.county;
      }

      // Narrowing signals from the voter's own input. We only widen out to the
      // whole statewide field when the voter has given us NOTHING more specific —
      // no district AND no county. With either signal present the section stays
      // focused on their district / county rather than dumping every Utah office.
      var userDistrictNum = parseInt(String(userDistrict || '').replace(/[^0-9]/g, ''), 10);
      var hasDistrict = !isNaN(userDistrictNum);
      var hasCounty = !!normalizedCounty;
      var hasNarrowingSignal = hasDistrict || hasCounty;

      // Decide whether a politician actually represents the selected county.
      //
      // This is deliberately CONSERVATIVE and authoritative-first. The earlier
      // version led with a broad "does this word appear anywhere in the record"
      // scan over name + office + state + bio + district label. That scan was the
      // main reason the section ballooned out to most of the state:
      //   • the county "Utah" appears in EVERY Utah politician's `state` field, so
      //     every single Utah figure matched a Utah-County voter, and
      //   • county names like "Davis", "Weber" and "Washington" are common
      //     surnames and bio words, so unrelated people matched by coincidence.
      // Instead we now key off the authoritative district→county maps and the
      // curated ballot roster, and only fall back to a NAME match for local
      // offices (which carry no legislative district) — and even then we match on
      // the resolved district/county label and office text, never the bare state
      // field or free-text bio.
      function isPoliticianInSelectedCounty(pid) {
        var d = CMP_DATA[pid];
        if (!d) return false;
        if (!normalizedCounty) return false;

        var cLower = normalizedCounty.toLowerCase().replace(/\s*county\s*/g, '').trim(); // e.g. "davis", "utah", "washington", "weber"
        var t = _classifyBrowseType(pid);
        var pDist = _relevantDistNum(pid); // normalizes "District 16"/"D16"/"UT-16"/"16" → 16

        // 1. Curated Key Races roster — anyone explicitly placed on this county's
        //    ballot belongs to it, even when their district number can't be parsed.
        var locIdMap = { 'Davis County': 'davis', 'Utah County': 'utah_co', 'Washington County': 'washington', 'Weber County': 'weber' };
        var targetLocId = locIdMap[normalizedCounty];
        if (targetLocId && KEY_RACES_BY_LOCATION[targetLocId]) {
          var inRoster = false;
          KEY_RACES_BY_LOCATION[targetLocId].forEach(function(r) {
            if (r.incumbentPid === pid) inRoster = true;
            if (r.incumbentPids && r.incumbentPids.indexOf(pid) !== -1) inRoster = true;
            if (r.candidates && r.candidates.indexOf(pid) !== -1) inRoster = true;
          });
          if (inRoster) return true;
        }

        // 2. State legislators — match ONLY on the authoritative district→county
        //    maps. A legislator whose district is known but lies in another county
        //    is excluded outright, so neighboring districts never bleed in.
        if (t === 'state_senator') {
          if (pDist === null) return false;
          var sInfo = _UTAH_SENATE_INFO[pid];
          if (sInfo && sInfo.c && sInfo.c.toLowerCase().indexOf(cLower) !== -1) return true;
          var sCounty = _UTAH_SENATE_COUNTY[pDist];
          return !!(sCounty && sCounty.toLowerCase().indexOf(cLower) !== -1);
        }
        if (t === 'state_rep') {
          if (pDist === null) return false;
          var hInfo = _UTAH_HOUSE_INFO[pid];
          if (hInfo && hInfo.c && hInfo.c.toLowerCase().indexOf(cLower) !== -1) return true;
          var hCounty = _UTAH_HOUSE_COUNTY[pDist];
          return !!(hCounty && hCounty.toLowerCase().indexOf(cLower) !== -1);
        }

        // 3. U.S. House — congressional-district → county coverage, derived from
        //    the SAME curated area table (KEY_RACES_LOCATIONS) the section renders
        //    so it can never drift from the boundaries shown elsewhere. The old
        //    hand-written map was wrong — it placed Davis & Weber in District 1 and
        //    Washington in District 2 — which is exactly what surfaced District 1's
        //    Blake Moore for Davis County (District 2) voters. A congressperson now
        //    matches a county only when that county actually sits in their district.
        if (t === 'representative') {
          if (pDist === null) return false;
          var cds = _relevantCountyCongressDistricts(cLower);
          return cds.indexOf(pDist) !== -1;
        }

        // 4. Local offices (mayors, county seats) carry no legislative district,
        //    so match them on their RESOLVED district/county label and office text
        //    only — plus the county's principal cities. Never the bare state field
        //    or bio, which over-match.
        var label = (_getPoliticianDistrictOrCounty(pid) + ' ' + (d.office || '')).toLowerCase();
        var CITY_TOKENS = {
          'davis':      ['davis', 'layton', 'kaysville', 'clearfield', 'bountiful', 'farmington', 'centerville', 'syracuse', 'clinton'],
          'utah':       ['provo', 'orem', 'lehi', 'american fork', 'spanish fork', 'springville', 'pleasant grove'],
          'washington': ['washington', 'st. george', 'st george', 'hurricane', 'ivins', 'santa clara'],
          'weber':      ['weber', 'ogden', 'roy', 'north ogden', 'south ogden']
        };
        var tokens = CITY_TOKENS[cLower] || [cLower];
        for (var ti = 0; ti < tokens.length; ti++) {
          if (label.indexOf(tokens[ti]) !== -1) return true;
        }
        return false;
      }

      var picked = {}; // pid -> office groupKey (dedup)
      function add(pid, groupKey) {
        if (!pid || !CMP_DATA[pid]) return;
        if (picked[pid]) return;
        picked[pid] = groupKey;
      }
      // Like add(), but AUTHORITATIVE: it overrides a group an earlier, weaker
      // signal already assigned. Used for the curated statewide rosters, whose
      // race membership is hand-verified and must win over the free-text `office`
      // classification — which can drift in the live data (e.g. a Governor
      // challenger whose record reads "Candidate for Governor / Fed" and would
      // otherwise be misfiled under U.S. House, vanishing from the Governor field
      // even though the race card promised the full two-person lineup).
      function force(pid, groupKey) {
        if (!pid || !CMP_DATA[pid]) return;
        picked[pid] = groupKey;
      }

      var houseDist  = null;
      var senateDist = null;
      var lowerDist  = null;

      // The voter's OWN authoritative districts — their explicitly saved congress
      // district plus any State Senate / State House seat they pinpointed on the
      // map, backfilled from their resolved curated area. This resolver leads so
      // the section locks onto the voter's real districts whether or not their
      // area is a "matched" curated roster.
      var _voterDists = _relevantVoterDistricts();
      if (_voterDists.representative != null) houseDist  = String(_voterDists.representative);
      if (_voterDists.state_senator  != null) senateDist = String(_voterDists.state_senator);
      if (_voterDists.state_rep      != null) lowerDist  = String(_voterDists.state_rep);

      // Fall back to the curated matched-area roster's districts for any seat the
      // voter hasn't pinned themselves. We only ever FILL a still-unknown district
      // here — never overwrite one the voter authoritatively gave us — so the
      // numbers the section filters by always agree with the seat cards in My Team
      // (which resolve districts the same way). The old code did the reverse: it
      // let the free-text saved `district` field clobber the curated congressional
      // district, which is exactly what surfaced U.S. House District 1 candidates
      // for a District 2 voter filling a seat.
      if (krMatched) {
        if ((houseDist  == null || houseDist  === '') && krData.byRace.house)       houseDist  = krData.byRace.house.district;
        if ((senateDist == null || senateDist === '') && krData.byRace.statesenate) senateDist = krData.byRace.statesenate.district;
        if ((lowerDist  == null || lowerDist  === '') && krData.byRace.statehouse)  lowerDist  = krData.byRace.statehouse.district;
      }

      // Last resort for the congressional seat only: the saved free-text district
      // field, used solely when nothing more authoritative resolved it.
      if ((houseDist == null || houseDist === '') && userDistrict) {
        houseDist = userDistrict;
      }

      // Dynamic matching logic to connect location/districts to politicians
      Object.keys(CMP_DATA).forEach(function(pid) {
        var d = CMP_DATA[pid];
        var t = _classifyBrowseType(pid);
        var pState = _getPoliticianState(pid);

        // Federal executives are always relevant
        if (t === 'president' || t === 'cabinet') {
          add(pid, t);
          return;
        }

        // For other offices, state must match user's selected state
        if (pState.toLowerCase() !== stateName.toLowerCase()) {
          return;
        }

        // U.S. Senators and Governors are statewide offices
        if (t === 'senator' || t === 'governor') {
          add(pid, t);
          return;
        }

        // District offices (U.S. House, State Senate, State House) are resolved
        // AFTER this loop rather than here: from the curated roster when we hold
        // the voter's authoritative exact ballot (krMatched), otherwise via the
        // tiered district → county → state fallback below. Doing it in one place
        // keeps a matched area precise (no neighboring-district bleed) while
        // guaranteeing every other in-state voter still gets a full slate instead
        // of a blank section.
        if (t === 'local') {
          // Local offices are never part of the curated district roster, so they
          // always rely on the county heuristic.
          if (isPoliticianInSelectedCounty(pid)) {
            add(pid, t);
          }
        }
      });

      // ── Never-empty fallback: the voter's in-state slate ────────────────────
      // When we do NOT hold an authoritative exact-district ballot for this voter
      // (their area could not be matched to a curated county roster — no county
      // saved, or a county outside the curated set), the precise county/district
      // heuristics can legitimately match nothing. That is what left the section
      // showing 0. Instead of a blank race, fall back to the voter's in-state
      // field for each district office — refined to their saved district or
      // county when that detail is available, and dropping to the whole-state
      // field only when nothing more specific matches. This guarantees a voter
      // always sees their U.S. House, State Senate and State House races. A
      // matched area (krMatched) is left untouched so its exact roster stays
      // precise.
      if (!krMatched) {
        ['representative', 'state_senator', 'state_rep'].forEach(function(officeType) {
          var inState = Object.keys(CMP_DATA).filter(function(pid) {
            return _classifyBrowseType(pid) === officeType &&
                   _getPoliticianState(pid).toLowerCase() === stateName.toLowerCase();
          });
          if (!inState.length) return;

          // Tier 1 — exact district. _relevantDistNum normalizes the inconsistent
          // formats in the data ("District 16", "D16", "UT-16", "16", "(UT-01)"…)
          // down to a plain number, so whatever formatting a record happens to use
          // does not matter. The voter's single saved district is their U.S. House
          // (congressional) district, so only that office keys off it.
          var refined = [];
          var wantDist = (officeType === 'representative' && hasDistrict) ? userDistrictNum : null;
          if (wantDist != null && !isNaN(wantDist)) {
            refined = inState.filter(function(pid) { return _relevantDistNum(pid) === wantDist; });
          }
          // Tier 2 — county match.
          if (!refined.length && hasCounty) {
            refined = inState.filter(function(pid) { return isPoliticianInSelectedCounty(pid); });
          }
          // Tier 3 — the whole in-state field. Applied ONLY when the voter gave us
          // no narrowing signal at all (no district AND no county). When they DID
          // give us a county/district but it matched no one for this office, the
          // office is left empty on purpose so it renders its own "no one listed
          // for your district" note — instead of dumping every politician in the
          // state into a section that is supposed to be the voter's own ballot.
          if (!refined.length && !hasNarrowingSignal) refined = inState;

          refined.forEach(function(pid) { add(pid, officeType); });
        });
      }

      // Merge the curated Key Races roster so the voter's actual races always show
      // their FULL field — incumbents, open seats, and still-thin challenger
      // profiles the county heuristics can miss. District races (U.S. House, State
      // Senate, State House) are merged ONLY for a matched area; otherwise we would
      // inject the default fallback area's candidates into someone else's ballot.
      // Statewide races (Governor, U.S. Senate) represent every voter in the state,
      // so they merge for any Utah voter — matched or not — guaranteeing every
      // statewide challenger appears. All merges are deduped by add().
      if (krData && (krMatched || isUtah)) {
        var RACEKEY_TO_OFFICE = {
          house: 'representative', statesenate: 'state_senator',
          statehouse: 'state_rep', governor: 'governor',
          senate: 'senator', president: 'president'
        };
        var _mergeRacePids = function(raceKey, pids, authoritative) {
          var gk = RACEKEY_TO_OFFICE[raceKey];
          if (!gk || !pids) return;
          var place = authoritative ? force : add;
          pids.forEach(function(pid) { place(pid, gk); });
        };
        if (krMatched) {
          Object.keys(krData.byRace || {}).forEach(function(rk) {
            _mergeRacePids(rk, (krData.byRace[rk] || {}).pids);
          });
        }
        if (isUtah) {
          // Statewide rosters are authoritative: a curated Governor / U.S. Senate
          // candidate is forced into the matching office group even if a drifting
          // `office` string already filed them elsewhere, so the field the race
          // card counts is exactly the field shown here.
          Object.keys(krData.statewide || {}).forEach(function(rk) {
            _mergeRacePids(rk, krData.statewide[rk], true);
          });
        }
      }

      // ── Exact-district match for the voter's own ballot ──────────────────────
      // The curated roster references incumbents BY ID, but our live data
      // (Firestore) routinely carries the sitting representative for a district
      // that the static incumbent maps don't name yet — e.g. a newly seated state
      // representative. When that happens, the id-based merge above contributes
      // nothing for that seat and the office renders an empty "no politicians
      // listed" card even though the representative exists in the data (this is
      // exactly what hid House District 15's representative). So for a matched
      // area we ALSO pull in any in-state politician whose OWN resolved district
      // number equals the area's district for that office. _relevantDistNum
      // normalizes every inconsistent district format to a plain number, so the
      // match is reliable regardless of how a record spells its district.
      if (krMatched) {
        var _wantByType = {
          representative: parseInt(houseDist, 10),   // U.S. House (congressional)
          state_senator:  parseInt(senateDist, 10),  // Utah State Senate
          state_rep:      parseInt(lowerDist, 10)     // Utah State House
        };
        Object.keys(CMP_DATA).forEach(function(pid) {
          var t = _classifyBrowseType(pid);
          var want = _wantByType[t];
          if (want === undefined || isNaN(want)) return;
          if (_getPoliticianState(pid).toLowerCase() !== stateName.toLowerCase()) return;
          if (_relevantDistNum(pid) === want) add(pid, t);
        });
      }

      // ── Guaranteed Utah slate — the section must never come up empty ─────────
      // Every fallback tier above ultimately keys off the politician's `state`
      // field (through _getPoliticianState) or off an area being an exact "matched"
      // ballot. Both are fragile: the `state` field is mutable (Firestore can
      // overwrite a clean "Utah" with a bare office/district string such as
      // "House District 9"), and a vague "Utah / your area" selection is never a
      // "matched" area — so its curated district rosters are skipped and the
      // district reps fall through to a predicate that can quietly exclude them.
      // When those conditions line up, the tiers drop the same people at once and
      // the section renders empty. To make zero results effectively impossible for
      // a Utah voter, build the slate straight from the curated Key Races rosters,
      // which reference politicians BY ID and therefore do not depend on any
      // state-field formatting. For a vague selection this guarantees a solid slate
      // (statewide offices PLUS the major district reps); a precisely matched area
      // keeps its exact ballot and only borrows this as an empty-guard.
      var RACEKEY_TO_OFFICE_ALL = {
        house: 'representative', statesenate: 'state_senator',
        statehouse: 'state_rep', governor: 'governor', senate: 'senator'
      };
      function _addCuratedUtahSlate() {
        var addRace = function(r, defGk) {
          var gk = RACEKEY_TO_OFFICE_ALL[r.raceKey] || defGk;
          add(r.incumbentPid, gk);
          (r.incumbentPids || []).forEach(function(p) { add(p, gk); });
          (r.candidates || []).forEach(function(p) { add(p, gk); });
        };
        // Statewide offices every Utah voter shares (Governor, U.S. Senate).
        (KEY_RACES_STATEWIDE || []).forEach(function(r) { addRace(r, 'governor'); });
        // Major district reps across the supported Utah areas (U.S. House, State
        // Senate, State House) so the slate is substantive — not just two names.
        Object.keys(KEY_RACES_BY_LOCATION || {}).forEach(function(loc) {
          (KEY_RACES_BY_LOCATION[loc] || []).forEach(function(r) { addRace(r, 'representative'); });
        });
        // Sweep in any remaining Utah office-holders/candidates the curated rosters
        // don't name explicitly (e.g. the other Utah U.S. House members). Restricted
        // to ballot offices so the slate stays a focused ballot, not the whole
        // statewide directory of mayors and county seats.
        var BALLOT_TYPES = { senator: 1, governor: 1, representative: 1, state_senator: 1, state_rep: 1 };
        Object.keys(CMP_DATA).forEach(function(pid) {
          var t = _classifyBrowseType(pid);
          if (BALLOT_TYPES[t] && _getPoliticianState(pid).toLowerCase() === 'utah') add(pid, t);
        });
      }

      // Apply the curated whole-state slate ONLY when the voter has given us no
      // narrowing signal — a vague state-level pick such as "Utah / your area"
      // with no county and no district — or as a last-resort empty guard. This is
      // what turns a blank state-only selection into a solid, always-populated
      // statewide slate. When the voter HAS a county or district selected we
      // deliberately skip it: the tiered district → county matching above has
      // already built their focused ballot, and sweeping in every Utah office
      // here is exactly what made the section show "most of Utah".
      if (isUtah && !hasNarrowingSignal && (!krMatched || Object.keys(picked).length === 0)) {
        _addCuratedUtahSlate();
      }

      // Final non-Utah safety net: if the section is still empty but the voter's
      // state does have politicians in our data, surface every in-state figure
      // rather than the empty "no politicians found" card. Classification or data
      // quirks should never leave a voter with representation looking at a blank
      // section.
      if (Object.keys(picked).length === 0) {
        Object.keys(CMP_DATA).forEach(function(pid) {
          if (_getPoliticianState(pid).toLowerCase() === stateName.toLowerCase()) {
            add(pid, _classifyBrowseType(pid));
          }
        });
      }

      // Bucket the picked pids into their office groups.
      var officeGroups = {};
      Object.keys(picked).forEach(function(pid) {
        var g = picked[pid];
        (officeGroups[g] = officeGroups[g] || []).push(pid);
      });

      // ── Strict district enforcement (the trust guarantee) ────────────────────
      // Every tier above is additive and several lean on heuristics (county
      // coverage, in-state sweeps, curated rosters). On their own they can let a
      // neighboring-district politician slip into a district office group. This
      // final pass removes any such bleed: for each district office whose district
      // we know (resolved above into houseDist / senateDist / lowerDist from the
      // voter's matched ballot, saved district, or inferred curated area), only
      // politicians whose OWN district matches survive. Result: a District 2 voter
      // never sees a District 1 representative, while statewide and local offices
      // are left exactly as picked.
      _relevantEnforceDistricts(officeGroups, {
        representative: (houseDist  != null && houseDist  !== '') ? parseInt(houseDist, 10)  : null,
        state_senator:  (senateDist != null && senateDist !== '') ? parseInt(senateDist, 10) : null,
        state_rep:      (lowerDist  != null && lowerDist  !== '') ? parseInt(lowerDist, 10)  : null
      }, (function() {
        // The voter's own curated roster (incumbent + challengers) per seat, from
        // the shared source of truth — kept even when a synced record's district
        // no longer parses, so enforcement never drops the voter's real reps.
        var _vbEnf = (typeof window._pdxVoterBallot === 'function') ? window._pdxVoterBallot() : null;
        if (!_vbEnf || !_vbEnf.byOffice) return {};
        return {
          representative: (_vbEnf.byOffice.representative || {}).pids || [],
          state_senator:  (_vbEnf.byOffice.state_senator  || {}).pids || [],
          state_rep:      (_vbEnf.byOffice.state_rep      || {}).pids || []
        };
      })());

      // Recompute the count from the ENFORCED groups so the badge and the
      // zero-result guard below reflect exactly what is shown.
      var total = 0;
      Object.keys(officeGroups).forEach(function(g) { total += officeGroups[g].length; });
      if (relevantCountBadge) relevantCountBadge.textContent = total;

      // Publish the freshly-bucketed slate so the "Compare the field" actions
      // (coverage strip + open-office hints) can hand an office's whole field
      // straight to the Compare tool without recomputing the match.
      window._relevantLastOfficeGroups = officeGroups;

      // Header line: reflect the voter's ACTUAL location as specifically as we can
      // — "Layton / Davis County" for a matched curated area, "City / County" for a
      // free-text entry, the county alone when that is all we have, and only the
      // vague "your area" when the voter gave us nothing more than a state. The
      // exact district numbers (when known) are appended so the line doubles as a
      // ballot summary.
      if (relevantLocText) {
        var headerArea;
        if (krMatched && krData && krData.label) {
          headerArea = krData.label;                       // e.g. "Layton / Davis County"
        } else if (normalizedCounty) {
          var _cityRaw = ((window._currentVoterLocation && window._currentVoterLocation.city) || '').trim();
          var _cityClean = (_cityRaw && _cityRaw.toLowerCase() !== normalizedCounty.toLowerCase() && _cityRaw.toLowerCase().indexOf('county') === -1)
            ? _cityRaw.replace(/\b\w/g, function(c) { return c.toUpperCase(); })
            : '';
          headerArea = _cityClean ? (_cityClean + ' / ' + normalizedCounty) : normalizedCounty;
        } else {
          headerArea = 'your area';
        }
        var stateDisplay = stateName || 'Utah';
        var _distBits = [];
        if (houseDist)  _distBits.push('U.S. House Dist. ' + houseDist);
        if (senateDist) _distBits.push('State Senate Dist. ' + senateDist);
        if (lowerDist)  _distBits.push('State House Dist. ' + lowerDist);
        var _distSuffix = _distBits.length
          ? ' <span style="color:#9fb4d4;">· ' + _distBits.join(' · ') + '</span>'
          : '';
        relevantLocText.innerHTML = '📍 Showing politicians for <strong class="text-blue-300">' + headerArea + '</strong>, ' + stateDisplay + _distSuffix + ' – your direct representatives. ' +
          '<button type="button" onclick="window.toggleChangeLocation()" style="background:none;border:none;color:#60a5fa;text-decoration:underline;cursor:pointer;padding:0;font:inherit;">change area</button>';
      }

      // ── Per-office match precision ─────────────────────────────────────────
      // Record HOW each district office was matched so the renderer can label it
      // truthfully: 'exact' when we resolved the voter's own district number,
      // 'county' when we could only match their county (their seat is one of the
      // set), and 'statewide' when we fell back to the whole in-state field. This
      // is derived from the very same location signals that drove the matching
      // above, so the label can never disagree with what was actually selected.
      function _precOf(officeType, distVal) {
        if (distVal) return 'exact';
        if (hasCounty) return 'county';
        return 'statewide';
      }
      var _precision = {
        representative: _precOf('representative', houseDist),
        state_senator:  _precOf('state_senator', senateDist),
        state_rep:      _precOf('state_rep', lowerDist)
      };

      var ctx = {
        focused: true, state: stateName,
        precision: _precision,
        county: normalizedCounty || '',
        houseDist: houseDist ? ('District ' + houseDist) : '',
        senateDist: senateDist ? ('District ' + senateDist) : '',
        lowerDist: lowerDist ? ('District ' + lowerDist) : '',
        teamSel: _relevantTeamSelections(),
        levelExtras: null
      };

      // Give voters a clear on-ramp into the FULL district tree for their own
      // chambers — so "I want to see other options before I pick" has a home
      // right inside this section instead of sending them elsewhere. Tucked under
      // STATE LEVEL (where the many-seat chambers live) and collapsed by default
      // so it never competes with the voter's own focused ballot above it.
      try {
        var _exploreState = stateName || 'Utah';
        var _stateExplore = _relevantExploreSection(
          _exploreState,
          (senateDist != null && senateDist !== '') ? parseInt(senateDist, 10) : null,
          (lowerDist  != null && lowerDist  !== '') ? parseInt(lowerDist, 10)  : null
        );
        if (_stateExplore) ctx.levelExtras = { state: _stateExplore };
      } catch (e) {}

      // NOTE: The "Your 2026 Ballot" overview (a coverage strip plus district and
      // statewide ballot chips that once sat atop this list) was removed as
      // redundant. The header's "Start Here" guided banner already tracks district
      // coverage with one-tap jump-to-race, and the grouped race cards below are
      // where voters actually research and add candidates — so a second ballot
      // overview here only added repetition and scrolling.

      // ── District coverage tracker ──────────────────────────────────────────
      // Turn the voter's own seats into a progress goal: how many already have a
      // pick on their team, and which one to fill next. Mirrors the My Team
      // coverage map — district seats get their own sub-stat, and the guidance
      // always names a single next gap with level-completion framing — so the two
      // surfaces guide the voter the same way and can never disagree.
      var _covOrder = ['representative', 'senator', 'state_senator', 'state_rep', 'governor', 'local'];
      var _covOffices = _covOrder.filter(function(k) { return officeGroups[k] && officeGroups[k].length; });
      var _covOpen = [];
      var _covFilled = 0;
      _covOffices.forEach(function(k) {
        if (_relevantOfficeCoverage(k, ctx.teamSel).filled) _covFilled++;
        else _covOpen.push(k);
      });
      var _covTotal = _covOffices.length;

      // The voter's OWN voting districts (U.S. House, State Senate, State House),
      // tracked separately so the motivating "how many of MY districts are filled"
      // question is answered up top no matter how many statewide seats are present.
      var _covDistOffices = _covOffices.filter(function(k) { return _RELEVANT_DISTRICT_OFFICES[k]; });
      var _covDistOpen = _covOpen.filter(function(k) { return _RELEVANT_DISTRICT_OFFICES[k]; });
      var _covDistTotal = _covDistOffices.length;
      var _covDistFilled = _covDistTotal - _covDistOpen.length;
      var _covDistDone = _covDistTotal > 0 && _covDistOpen.length === 0;

      // Open seats sharing a given ballot level, and the levels already fully
      // covered — the inputs for "complete your federal coverage" / "you've covered
      // your federal seats" framing.
      function _covOpenInLevel(lv) { return _covOpen.filter(function(k) { return (_RELEVANT_OFFICE_LEVEL[k] || '') === lv; }); }
      function _covOfficesInLevel(lv) { return _covOffices.filter(function(k) { return (_RELEVANT_OFFICE_LEVEL[k] || '') === lv; }); }

      // The coverage figures above power the header's "Start Here" guided banner
      // below (the section's first-glance next step). The former "Your district
      // coverage" strip that also read from them was removed together with the
      // "Your 2026 Ballot" overview, since the guided banner already conveys the
      // same progress and next-gap nudge without the duplication.
      var _guidedHtml = '';
      var _guidedComplete = false;
      if (_covTotal > 0) {
        var _covDone = _covFilled >= _covTotal;

        // ── "Start Here" guided status banner (district-focused) ──────────────
        // The section's single coverage surface, rendered into the section header
        // so the guided next step greets the voter before they scroll. It takes the
        // voter's OWN voting-districts lens: each district becomes a tappable
        // covered/open chip, one clear next step is named, and the round trip to
        // the team stays one tap away.
        _guidedComplete = _covDone;
        var _gDistNum = { representative: houseDist, state_senator: senateDist, state_rep: lowerDist };

        // Per-district chips — green when a pick is on the team, amber when the
        // district still needs attention. Tapping jumps straight to that race.
        var _gChips = _covDistOffices.map(function(k) {
          var _c = _relevantOfficeCoverage(k, ctx.teamSel);
          var _lvl = _RELEVANT_OFFICE_LEVEL[k] || 'state';
          var _short = _relTxt(_RELEVANT_OFFICE_SHORT[k] || k);
          var _dn = _gDistNum[k];
          var _sub = _dn ? ('District ' + _relTxt(_dn)) : 'Your district';
          var _stat;
          if (_c.filled) {
            var _nm = (CMP_DATA[_c.pid] && CMP_DATA[_c.pid].name) ? _relTxt(CMP_DATA[_c.pid].name) : 'On your team';
            _stat = '✓ ' + _nm;
          } else {
            _stat = '➕ Needs a pick';
          }
          return '<button type="button" class="rel-guide-chip ' + (_c.filled ? 'is-filled' : 'is-open') + '" ' +
            'onclick="_relevantJump(\'' + _lvl + '\',\'' + k + '\')">' +
            '<span class="rgc-name">🏛 ' + _short + '</span>' +
            '<span class="rgc-sub">' + _sub + '</span>' +
            '<span class="rgc-stat">' + _stat + '</span>' +
          '</button>';
        }).join('');

        // The single next step — a still-open voting district first (the seats
        // unique to this voter), then any other open seat. The lead celebrates a
        // district already covered before naming the next gap, so the nudge always
        // points toward a balanced, complete team.
        var _gNext = _covDistOpen[0] || _covOpen[0];
        var _gNextLine, _gPrimaryBtn = '';
        if (_guidedComplete) {
          _gNextLine = '🎉 <strong>Every seat on your ballot has a pick.</strong> See your finished ballot to print or share it, or review your slate up top.';
          _gPrimaryBtn = '<button type="button" class="rel-guide-btn is-primary" onclick="window.openBallotSummary && window.openBallotSummary()">📋 See My Ballot</button>';
        } else if (_gNext) {
          var _gShort = _relTxt(_RELEVANT_OFFICE_SHORT[_gNext] || _gNext);
          var _gYours = _relTxt(_RELEVANT_OFFICE_YOURS[_gNext] || ('your ' + _gShort + ' seat'));
          var _gLvl = _RELEVANT_OFFICE_LEVEL[_gNext] || 'state';
          var _gIsDistrict = !!_RELEVANT_DISTRICT_OFFICES[_gNext];
          var _gCoveredDist = _covDistOffices.filter(function(k) {
            return k !== _gNext && _relevantOfficeCoverage(k, ctx.teamSel).filled;
          });
          if (_gIsDistrict && _gCoveredDist.length) {
            var _gDone = _relTxt(_RELEVANT_OFFICE_SHORT[_gCoveredDist[0]] || 'a district');
            _gNextLine = 'You’ve covered your <strong>' + _gDone + '</strong> district — next, add <span class="rgn-open">' + _gYours + '</span> to your team.';
          } else if (_gIsDistrict) {
            _gNextLine = 'Your next voting district to cover: add <span class="rgn-open">' + _gYours + '</span> to your team.';
          } else if (_covDistTotal > 0 && _covDistOpen.length === 0) {
            _gNextLine = '🎉 <strong>All your voting districts are covered.</strong> Round out your team by adding <span class="rgn-open">' + _gYours + '</span>.';
          } else {
            _gNextLine = 'Start your team: add <span class="rgn-open">' + _gYours + '</span>.';
          }
          _gPrimaryBtn = '<button type="button" class="rel-guide-btn is-primary" onclick="_relevantJump(\'' + _gLvl + '\',\'' + _gNext + '\')">➕ Add ' + _gShort + '</button>';
        }

        // Headline progress takes the voting-districts view when the voter has any
        // (the motivating "which of MY districts are covered" metric); otherwise it
        // falls back to the full seat count so a districtless ballot still tracks.
        var _gUseDist = _covDistTotal > 0;
        var _gNum = _gUseDist ? _covDistFilled : _covFilled;
        var _gDen = _gUseDist ? _covDistTotal : _covTotal;
        var _gPct = _gDen ? Math.round((_gNum / _gDen) * 100) : 0;
        var _gFracLabel = _gUseDist
          ? (_covDistFilled + ' of ' + _covDistTotal + ' voting district' + (_covDistTotal === 1 ? '' : 's'))
          : (_covFilled + ' of ' + _covTotal + ' seat' + (_covTotal === 1 ? '' : 's'));
        var _gEyebrow = _guidedComplete ? '✓ Your Team Is Taking Shape' : '🧭 Start Here · Build Your Team';
        var _gTitle = _guidedComplete
          ? (_gUseDist ? 'Your Districts Are Covered' : 'Your Team Is Set')
          : (_gUseDist ? 'Cover Your Districts' : 'Build Your Team');

        var _gActions = _gPrimaryBtn;
        if (!_guidedComplete) {
          _gActions += '<button type="button" class="rel-guide-btn is-team" onclick="window._relevantScrollToTeam && window._relevantScrollToTeam()">🗳️ My Voting Team ' + _covFilled + '/' + _covTotal + ' ↑</button>';
        }

        _guidedHtml =
          '<div class="rel-guide-eyebrow">' + _gEyebrow + '</div>' +
          '<div class="rel-guide-head">' +
            '<span class="rel-guide-title">' + _gTitle + '</span>' +
            '<span class="rel-guide-frac">' + _gFracLabel + ' on your team</span>' +
          '</div>' +
          '<div class="rel-guide-bar"><div class="rel-guide-fill" style="width:' + _gPct + '%;"></div></div>' +
          (_gChips ? '<div class="rel-guide-chips">' + _gChips + '</div>' : '') +
          '<p class="rel-guide-next">' + _gNextLine + '</p>' +
          '<div class="rel-guide-actions">' + _gActions + '</div>';
      }

      // ── Closing hand-off back to My Team ────────────────────────────────────
      // The dynamic "relevant-team-bridge" progress block that used to render at
      // the very end of the grid was removed: it was a third team-progress surface
      // inside the research section (on top of the now-removed pill and guided
      // banner) and duplicated the static "Done researching? → My Voting Team"
      // hand-off that already closes the section. Keeping just the static one
      // leaves a single, clean exit back to the one builder.
      var closingBridge = '';

      // The "Your 2026 Ballot" overview block (district-coverage strip, the
      // district/statewide ballot chips, and the inline area switcher) was removed
      // here. It duplicated the header's guided "Start Here" banner and the race
      // cards below, adding clutter and scrolling. `overview` stays defined as an
      // empty string so the section now flows straight from the values frame into
      // the race list. Area switching remains available via the section header's
      // map card and the no-location "Make this your ballot" banner.
      var overview = '';

      // Values-first frame for the whole section: this is about the person, not
      // the party — their values, their follow-through, and how they align with
      // you. Shown above the ballot so the lens is set before the first race.
      var valuesBanner =
        '<div class="relevant-values-banner">' +
          '<div class="rvb-ico">⚖️</div>' +
          '<div style="min-width:0;">' +
            '<div class="rvb-title">Judge the Person, Not the Party</div>' +
            '<p class="rvb-text">Every race below is about <strong class="rvb-you">your</strong> ballot. Weigh each candidate on their <strong>values</strong>, their <strong>follow-through</strong> on past promises, and how closely they align with <strong class="rvb-you">you</strong> — not just the letter after their name. Open seats list the whole field so you can compare everyone running.</p>' +
          '</div>' +
        '</div>';

      // Sync the header's guided-status banner. Reached on both the zero-result
      // and normal render paths, so it shows the live next step when there's a
      // tracked ballot and stays hidden otherwise.
      var _gEl = document.getElementById('relevant-guided-status');
      if (_gEl) {
        if (_guidedHtml) {
          _gEl.innerHTML = _guidedHtml;
          _gEl.className = 'rel-guide' + (_guidedComplete ? ' is-complete' : '');
          _gEl.style.display = 'block';
        } else {
          _gEl.innerHTML = '';
          _gEl.style.display = 'none';
        }
      }

      if (total === 0) {
        var areaName = normalizedCounty || 'this location';
        var noResultsHtml = '<div class="text-center py-10 px-4 bg-navy-900/40 border border-white/5 rounded-2xl mt-4">' +
          '<div class="text-4xl mb-3" style="opacity:0.55;">🔍</div>' +
          '<h4 class="font-display text-xl tracking-wider text-white uppercase">No politicians found for ' + areaName + '</h4>' +
          '<p class="font-condensed text-steel-400 mt-1 max-w-md mx-auto" style="font-size:0.9rem;line-height:1.55;">We couldn\'t find any matching politicians in our database for this area yet. Try changing your state, county, or district to find your representatives.</p>' +
          '<button type="button" onclick="window.toggleChangeLocation()" class="mt-4 font-condensed text-xs font-700 tracking-wider uppercase text-white bg-blue-600 hover:bg-blue-500 border border-blue-400/40 px-4 py-2.5 rounded-xl transition-all shadow-md inline-flex items-center gap-1.5 min-h-[44px]">📍 Adjust Location</button>' +
          '</div>';
        relevantGrid.innerHTML = valuesBanner + overview + noResultsHtml;
        return;
      }

      var matchLegend = _relevantMatchLegend(officeGroups, ctx);
      relevantGrid.innerHTML = valuesBanner + overview + matchLegend + _renderRelevantTree(officeGroups, ctx) + closingBridge;
    }

    // Public entry point. Runs the implementation inside a guard so that any
    // unexpected error degrades gracefully to a guaranteed, non-empty Utah slate
    // (or a clear "choose your area" prompt) instead of silently leaving the
    // count badge stuck at 0 and the grid blank.
    window.renderRelevantToMe = function() {
      try {
        _renderRelevantToMeImpl();
      } catch (e) {
        try { console.warn('renderRelevantToMe: recovering via safe fallback —', e); } catch (_) {}
        try { _renderRelevantToMeSafeFallback(); } catch (_) {}
      }
      // Keep the pinned "Your Team" progress bar at the top of this section honest
      // on every repaint (location change, team change, initial load).
      if (typeof window._relSyncTeamProgress === 'function') { try { window._relSyncTeamProgress(); } catch (_) {} }
      // Refresh the Home Base / Research mode tag on every relevant repaint.
      if (typeof window._homeRenderRelevantTag === 'function') { try { window._homeRenderRelevantTag(); } catch (_) {} }
    };

    // Last-resort renderer. Builds the slate straight from the curated Key Races
    // rosters, which reference politicians BY ID and therefore never depend on
    // any mutable `state` formatting or district-matching heuristic. Invoked only
    // when the main implementation throws — guaranteeing a located voter always
    // sees their statewide offices and the major district reps rather than a
    // blank section.
    function _renderRelevantToMeSafeFallback() {
      var relevantGrid = document.getElementById('relevant-browse-grid');
      var relevantCountBadge = document.getElementById('relevant-count-badge');
      if (!relevantGrid) return;
      var _relGridHintFb = document.getElementById('relevant-grid-hint');
      if (_relGridHintFb) _relGridHintFb.style.display = window._hasUserLocation ? 'flex' : 'none';
      // The fallback slate has no computed coverage, so the guided banner can't be
      // trusted — hide it rather than leave a stale next step from a prior render.
      var _gElFb = document.getElementById('relevant-guided-status');
      if (_gElFb) { _gElFb.innerHTML = ''; _gElFb.style.display = 'none'; }
      if (!window._hasUserLocation) {
        // No location yet — show the clean, non-partisan location prompt rather
        // than a pre-loaded default slate. The visitor's real local/federal
        // representatives appear only after they set an area.
        if (relevantCountBadge) relevantCountBadge.textContent = '0';
        window._relevantLastOfficeGroups = {};
        relevantGrid.innerHTML = (typeof window._relevantLocationPrompt === 'function') ? window._relevantLocationPrompt() : '';
        return;
      }
      var byLoc = window.KEY_RACES_BY_LOCATION || {};
      var statewide = window.KEY_RACES_STATEWIDE || [];
      var picked = {};
      var RK = { house: 'representative', statesenate: 'state_senator', statehouse: 'state_rep', governor: 'governor', senate: 'senator' };
      var addRace = function(r, gk) {
        var pids = [];
        if (r.incumbentPid) pids.push(r.incumbentPid);
        (r.incumbentPids || []).forEach(function(p) { pids.push(p); });
        (r.candidates || []).forEach(function(p) { pids.push(p); });
        pids.forEach(function(pid) { if (pid && CMP_DATA[pid] && !picked[pid]) picked[pid] = (RK[r.raceKey] || gk); });
      };
      statewide.forEach(function(r) { addRace(r, 'governor'); });
      // Prefer the voter's OWN curated area (explicit pick, else inferred from
      // their saved city/county) so the fallback shows their district reps — not
      // every area's. Only when no area can be resolved do we sweep all areas, so
      // an unlocatable voter still gets a populated slate instead of a blank one.
      var _fbId = '';
      try { _fbId = (localStorage.getItem(window.KR_LOCATION_KEY || 'politidex_keyraces_location') || ''); } catch (e) {}
      if (!_fbId || !byLoc[_fbId]) {
        _fbId = (typeof window._krInferLocation === 'function') ? (window._krInferLocation() || '') : '';
      }
      if (_fbId && byLoc[_fbId]) {
        (byLoc[_fbId] || []).forEach(function(r) { addRace(r, 'representative'); });
      } else {
        Object.keys(byLoc).forEach(function(loc) { (byLoc[loc] || []).forEach(function(r) { addRace(r, 'representative'); }); });
      }
      var officeGroups = {};
      Object.keys(picked).forEach(function(pid) { var g = picked[pid]; (officeGroups[g] = officeGroups[g] || []).push(pid); });
      // Apply the same strict district guard as the main path so the fallback can
      // never surface a neighboring district's representative either. Pass the
      // voter's own curated roster (incumbent + challengers) per seat from the
      // shared resolver as the allow-list, exactly like the main path — otherwise a
      // synced record whose district no longer parses would be wrongly dropped and
      // the voter could lose their real rep in this fallback view.
      try {
        _relevantEnforceDistricts(officeGroups, _relevantVoterDistricts(), (function() {
          var _vbFb = (typeof window._pdxVoterBallot === 'function') ? window._pdxVoterBallot() : null;
          if (!_vbFb || !_vbFb.byOffice) return {};
          return {
            representative: (_vbFb.byOffice.representative || {}).pids || [],
            state_senator:  (_vbFb.byOffice.state_senator  || {}).pids || [],
            state_rep:      (_vbFb.byOffice.state_rep      || {}).pids || []
          };
        })());
      } catch (e) {}
      var _fbTotal = 0;
      Object.keys(officeGroups).forEach(function(g) { _fbTotal += officeGroups[g].length; });
      if (relevantCountBadge) relevantCountBadge.textContent = _fbTotal;
      var ctx = { focused: true, state: 'Utah', houseDist: '', senateDist: '', lowerDist: '', levelExtras: null };
      // Try the full grouped tree first; if IT throws (the exact failure mode that
      // once blanked the whole section), drop to a dependency-light flat grid so a
      // located voter is GUARANTEED to see their cards rather than an empty section.
      try {
        relevantGrid.innerHTML = (typeof _renderRelevantTree === 'function') ? _renderRelevantTree(officeGroups, ctx) : _renderRelevantFlatGrid(officeGroups);
      } catch (e) {
        try { console.warn('renderRelevantToMe: tree failed in fallback, using flat grid —', e); } catch (_) {}
        relevantGrid.innerHTML = _renderRelevantFlatGrid(officeGroups);
      }
    }

    // Absolute last-resort renderer: a plain office-grouped card grid that leans on
    // NONE of the tree's accordion/precision/coverage/statewide helpers — only the
    // shared person-card shell, with every card wrapped so one bad record can't take
    // the grid down. Guarantees the section is never left blank for a located voter.
    function _renderRelevantFlatGrid(officeGroups) {
      var order = ['president', 'cabinet', 'senator', 'representative', 'governor', 'state_senator', 'state_rep', 'local', 'candidate', 'other'];
      var keys = Object.keys(officeGroups || {});
      keys.sort(function(a, b) {
        var ia = order.indexOf(a), ib = order.indexOf(b);
        return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
      });
      var out = '';
      keys.forEach(function(gk) {
        var pids = officeGroups[gk] || [];
        if (!pids.length) return;
        var def = (typeof _RELEVANT_OFFICE_DEFS !== 'undefined' && _RELEVANT_OFFICE_DEFS[gk]) || { label: gk, icon: '🏛' };
        out += '<div class="browse-type-group expanded" id="relevant-browse-group-' + gk + '" style="margin-bottom:0.6rem;">';
        out += '<div class="browse-type-header" style="cursor:default;">';
        out += '<div class="browse-type-title">';
        out += '<div class="browse-type-icon" style="background:' + (def.bg || 'rgba(59,130,246,0.2)') + ';">' + def.icon + '</div>';
        out += '<span class="browse-type-name">' + def.label + '</span>';
        out += '</div>';
        out += '<span class="browse-type-count">' + pids.length + (pids.length === 1 ? ' option' : ' options') + '</span>';
        out += '</div>';
        out += '<div class="browse-type-body" style="max-height:none;"><div class="browse-type-inner">';
        out += '<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-start">';
        (typeof _sortInOfficeFirst === 'function' ? _sortInOfficeFirst(pids) : pids).forEach(function(pid) {
          try { out += _renderRelevantPersonCard(pid); } catch (_) {}
        });
        out += '</div></div></div></div>';
      });
      return out;
    }

    (function() {
      // Filters toolbar is non-sticky: ensure it always renders in its full,
      // natural (expanded) form and never collapses/sticks while scrolling.
      var toolbar = document.getElementById('browse-toolbar');
      if (toolbar) {
        toolbar.classList.remove('is-stuck', 'is-expanded');
      }
    })();

    window.toggleStickyFilters = function(e) {
      if (e) e.preventDefault();
    };

    function _chubOfficeMatch(pid, filter) {
      const d = CMP_DATA[pid];
      if (!d) return false;
      const o = d.office.toLowerCase();
      switch(filter) {
        case 'president': return o.includes('president');
        case 'senator': return o.includes('senator') && !o.includes('state');
        case 'representative': return o.includes('representative') && !o.includes('state');
        case 'governor': return o.includes('governor') || o.includes('attorney general') ||
          ((o.includes('treasurer') || o.includes('auditor')) && !o.includes('county'));
        case 'state': return o.includes('state sen') || o.includes('state rep') || o.includes('senate president') || o.includes('house speaker') || o.includes('house minority');
        case 'local': return o.includes('mayor');
        case 'candidate': return o.includes('candidate') || o.includes('nominee');
        case 'cabinet': return o.includes('secretary') || o.includes('director');
        default: return true;
      }
    }

    // The browse filter used to cut the field into 70%+ / 40-69% / <40% bands of
    // the retired pledge rate. A filter is a use of a score: offering "High (70%+)"
    // republishes the number the rest of the app stopped publishing, and ranks
    // people by it. It now filters on what the pledge lane actually has on file.
    // The old band values stay accepted — a saved filter, a shared URL or a parsed
    // browse goal can still carry 'high' — and all three rate bands mean the same
    // thing now: there is a closed ledger here.
    function _chubScoreMatch(pid, filter) {
      var d = CMP_DATA[pid];
      if (!d) return false;
      var state = (typeof window._pdxPromiseState === 'function') ? window._pdxPromiseState(d) : 'empty';
      switch (filter) {
        case 'receipts':
        case 'high': case 'mid': case 'low':
          return state === 'resolved' || state === 'counts';
        case 'tracking': return state === 'tracking';
        case 'none':
        case 'na': return state === 'empty';
        default: return true;
      }
    }

    // The ordering key for the two "score" sorts — the ⚖️ Word vs Action read, the
    // one thing PolitiDex publishes as a rating.
    //
    // This was `_pledgeDepth()`, ordering the whole roster by how many PLEDGES had
    // resolved. That option label read "🤝 Most Pledge Receipts", so the site's
    // default ranking of every politician was a pledge tally — which is a separate
    // ranking system for pledges no matter how carefully the option was worded, and
    // it also rewarded whoever happened to have the most pledges transcribed rather
    // than whoever's record backs their word.
    //
    // A pledge is one FORM OF "said" and word-action.js already tests it, so it is
    // inside this number along with stances and issue branding. Records below the
    // publishing floor sort to the bottom at -1 rather than being treated as 0:
    // PDXWordAction owns when a read is sayable, and an unread record is not a bad
    // one. The option VALUES are unchanged so saved sorts, the alignment fallbacks
    // and the browse-goal parser keep working.
    function _waDepth(pid) {
      var d = CMP_DATA[pid];
      if (!d) return -1;
      try {
        var wa = window.PDXWordAction;
        if (!wa || typeof wa.read !== 'function') return -1;
        var r = wa.read(pid, d);
        if (!r || !r.publishable || r.pct === null || r.pct === undefined) return -1;
        return r.pct;
      } catch (e) { return -1; }
    }

    function _chubStateMatch(pid, filter) {
      const d = CMP_DATA[pid];
      if (!d) return false;
      if (!filter) return true;
      // Match ONLY on the normalized state bucket the browse tree groups by
      // (via _getPoliticianState), so the filtered set is EXACTLY the set that
      // renders under that state's heading. "National" catches every federal /
      // U.S. / cabinet record; "Utah" catches "Utah · Cache County", bare Utah
      // districts, etc. Deliberately no raw-substring fallback: a substring test
      // cross-contaminates states (e.g. Utah's "Washington County" leaking into a
      // "Washington" filter), which is exactly the stray-state bleed we're fixing.
      const bucket = (typeof _getPoliticianState === 'function') ? _getPoliticianState(pid) : (d.state || '');
      return !!bucket && bucket.toLowerCase() === filter.toLowerCase();
    }

    // ── National-first state filter ────────────────────────────────────────
    // A single source of truth for "how many politicians are in each state" —
    // counted from the live roster (CMP_DATA, after any Firestore merge) using
    // the same normalized buckets the browse tree groups by, so the state tabs,
    // the dropdown and the grouped results always agree.
    function _pdxStateCounts() {
      var counts = {};
      if (typeof CMP_DATA === 'undefined') return counts;
      Object.keys(CMP_DATA).forEach(function(pid) {
        var b = (typeof _getPoliticianState === 'function') ? _getPoliticianState(pid) : (CMP_DATA[pid] && CMP_DATA[pid].state);
        if (!b) return;
        counts[b] = (counts[b] || 0) + 1;
      });
      return counts;
    }

    // Rebuild the full state <select> from the live roster so every state that
    // actually has politicians is reachable — National first (national-first),
    // then the rest alphabetically, each with its count. Preserves the current
    // selection. Rebuilt lazily whenever the roster size changes.
    window._pdxPopulateStateFilter = function() {
      var el = document.getElementById('myteam-browse-state');
      if (!el) return;
      var cur = el.value;
      var counts = _pdxStateCounts();
      var states = Object.keys(counts).filter(function(s) { return s !== 'National'; })
        .sort(function(a, b) { return a.localeCompare(b); });
      var opts = ['<option value="">🇺🇸 All States (National view)</option>'];
      if (counts['National']) opts.push('<option value="National">🏛 National / Federal (' + counts['National'] + ')</option>');
      states.forEach(function(s) {
        opts.push('<option value="' + s.replace(/"/g, '&quot;') + '">' + s + ' (' + counts[s] + ')</option>');
      });
      el.innerHTML = opts.join('');
      // Restore the prior selection when it still exists; otherwise fall back to
      // the All-States (national) view rather than a stale, empty filter.
      if (cur && (cur === 'National' || counts[cur] != null)) el.value = cur; else el.value = '';
      window._pdxStateFilterBuiltFor = Object.keys(CMP_DATA).length;
    };

    // Prominent, national-first quick tabs: All States · National · the biggest
    // states by roster size. They write the same #myteam-browse-state value the
    // dropdown does (so the two stay in lock-step) and highlight the active one.
    // Horizontally scrollable, so the row stays one clean line on mobile.
    window._pdxRenderStateTabs = function() {
      var host = document.getElementById('browse-state-tabs');
      if (!host) return;
      var sel = document.getElementById('myteam-browse-state');
      var cur = (sel && sel.value) || '';
      var counts = _pdxStateCounts();
      var states = Object.keys(counts).filter(function(s) { return s !== 'National'; })
        .sort(function(a, b) { return (counts[b] - counts[a]) || a.localeCompare(b); });
      var top = states.slice(0, 8);
      // Always show the state the visitor has actually selected, even if it is a
      // smaller state that didn't make the top-by-size cut.
      if (cur && cur !== 'National' && top.indexOf(cur) === -1 && counts[cur]) top.unshift(cur);
      var tabs = [{ v: '', label: '🇺🇸 All States' }];
      if (counts['National']) tabs.push({ v: 'National', label: '🏛 National', n: counts['National'] });
      top.forEach(function(s) { tabs.push({ v: s, label: s, n: counts[s] }); });
      host.innerHTML = tabs.map(function(t) {
        var on = (cur || '') === t.v;
        var vEsc = String(t.v).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
        return '<button type="button" class="state-tab' + (on ? ' is-on' : '') + '" aria-pressed="' + (on ? 'true' : 'false') +
          '" onclick="_pdxSetStateFilter(\'' + vEsc + '\')"><span>' + t.label + '</span>' +
          (t.n ? '<span class="state-tab-n">' + t.n + '</span>' : '') + '</button>';
      }).join('');
    };

    // Shared setter used by both the tabs and (implicitly) the dropdown, so a
    // state pick always runs through the same filter path.
    window._pdxSetStateFilter = function(v) {
      var el = document.getElementById('myteam-browse-state');
      if (el) el.value = v || '';
      if (typeof window.myteamBrowseFilter === 'function') window.myteamBrowseFilter();
    };

    // One-shot wiring: populate the complete dropdown and paint the tabs. Safe to
    // call repeatedly (e.g. again once the Firestore roster merges in).
    window._pdxBrowseStateInit = function() {
      try { window._pdxPopulateStateFilter(); } catch (e) {}
      try { window._pdxRenderStateTabs(); } catch (e) {}
    };

    function _chubRenderCard(pid) {
      const d = CMP_DATA[pid];
      if (!d) return '';
      const sel = _cmpSelected.has(pid);
      const isMy = _myPoliticians.has(pid);
      const isPotential = _potentialPoliticians.has(pid);
      const isInOffice = (typeof window._pdxOfficeStatus === 'function') && window._pdxOfficeStatus(d) === 'office';

      const myBadge = isMy ? '<span style="display:inline-flex;align-items:center;gap:0.2rem;background:rgba(245,158,11,0.12);border:1px solid rgba(245,158,11,0.3);color:#fbbf24;font-family:\'Barlow Condensed\',sans-serif;font-weight:700;font-size:0.55rem;letter-spacing:0.06em;text-transform:uppercase;padding:0.12rem 0.4rem;border-radius:999px;">★ Saved</span>' : '';
      const potBadge = isPotential ? '<span class="potential-badge">🌟 Watching</span>' : '';
      const alignBar = (typeof _alignCardBar === 'function') ? _alignCardBar(pid) : '';

      return window._pdxCardShell(pid, {
        cardId: 'chub-card-' + pid,
        cardClass: (isInOffice ? 'is-incumbent' : '') + (sel ? ' chub-selected' : ''),
        controls: _pdxStarCtrl(pid) + _pdxWatchCtrl(pid),
        badges: _pdxLocalBadge(pid) + myBadge + potBadge,
        extra: alignBar,
        actions: _pdxCompareActions(pid)
      });
    }

    function chubBuildAll(filteredPids) {
      const grid = document.getElementById('chub-all-grid');
      const empty = document.getElementById('chub-empty');
      const count = document.getElementById('chub-count');
      if (!grid) return;

      const pids = filteredPids || _lastFilteredPids || Object.keys(CMP_DATA);
      if (!filteredPids && !_lastFilteredPids) _lastFilteredPids = pids;

      if (pids.length === 0) {
        grid.innerHTML = '';
        if (empty) empty.classList.remove('hidden');
        if (count) count.textContent = '0 results';
        return;
      }
      if (empty) empty.classList.add('hidden');
      if (count) count.textContent = pids.length + ' politician' + (pids.length !== 1 ? 's' : '');
      grid.innerHTML = pids.map(function(pid) { return _chubRenderCard(pid); }).join('');
    }

    let _lastFilteredPids = null;

    window.chubFilter = function() {
      const search = (document.getElementById('chub-search')?.value || '').toLowerCase().trim();
      const office = document.getElementById('chub-office')?.value || '';
      const state = document.getElementById('chub-state')?.value || '';
      const score = document.getElementById('chub-score')?.value || '';
      const sort = document.getElementById('chub-sort')?.value || 'score-desc';

      var pids = Object.keys(CMP_DATA);

      if (search) {
        pids = pids.filter(function(pid) {
          const d = CMP_DATA[pid];
          const haystack = [d.name, d.office, d.state].concat(d.issues).join(' ').toLowerCase();
          return haystack.includes(search);
        });
      }
      if (office) pids = pids.filter(function(pid) { return _chubOfficeMatch(pid, office); });
      if (state) pids = pids.filter(function(pid) { return _chubStateMatch(pid, state); });
      if (score) pids = pids.filter(function(pid) { return _chubScoreMatch(pid, score); });

      if (sort === 'score-desc') {
        pids.sort(function(a,b) { return _waDepth(b) - _waDepth(a); });
      } else if (sort === 'score-asc') {
        pids.sort(function(a,b) { return _waDepth(a) - _waDepth(b); });
      } else if (sort === 'align-desc' || sort === 'align-asc') {
        pids.sort(function(a,b) {
          var aA = (typeof _calcAlignmentScore === 'function') ? (_calcAlignmentScore(a) ?? -1) : -1;
          var bA = (typeof _calcAlignmentScore === 'function') ? (_calcAlignmentScore(b) ?? -1) : -1;
          return sort === 'align-desc' ? bA - aA : aA - bA;
        });
      } else if (sort === 'alpha') {
        pids.sort(function(a,b) { return CMP_DATA[a].name.localeCompare(CMP_DATA[b].name); });
      }

      const chips = document.getElementById('chub-chips');
      if (chips) {
        var html = '';
        if (search) html += '<span class="inline-flex items-center gap-1 bg-navy-700/60 border border-white/10 rounded-full px-2.5 py-1 font-condensed text-xs text-steel-300 tracking-wider">"' + search + '" <button onclick="document.getElementById(\'chub-search\').value=\'\';chubFilter()" style="background:none;border:none;color:#7596c0;cursor:pointer;padding:0;font-size:0.7rem;">✕</button></span>';
        if (office) html += '<span class="inline-flex items-center gap-1 bg-navy-700/60 border border-white/10 rounded-full px-2.5 py-1 font-condensed text-xs text-steel-300 tracking-wider">' + office + ' <button onclick="document.getElementById(\'chub-office\').value=\'\';chubFilter()" style="background:none;border:none;color:#7596c0;cursor:pointer;padding:0;font-size:0.7rem;">✕</button></span>';
        if (state) html += '<span class="inline-flex items-center gap-1 bg-navy-700/60 border border-white/10 rounded-full px-2.5 py-1 font-condensed text-xs text-steel-300 tracking-wider">' + state + ' <button onclick="document.getElementById(\'chub-state\').value=\'\';chubFilter()" style="background:none;border:none;color:#7596c0;cursor:pointer;padding:0;font-size:0.7rem;">✕</button></span>';
        if (score) html += '<span class="inline-flex items-center gap-1 bg-navy-700/60 border border-white/10 rounded-full px-2.5 py-1 font-condensed text-xs text-steel-300 tracking-wider">' + score + ' <button onclick="document.getElementById(\'chub-score\').value=\'\';chubFilter()" style="background:none;border:none;color:#7596c0;cursor:pointer;padding:0;font-size:0.7rem;">✕</button></span>';
        chips.innerHTML = html;
      }

      _lastFilteredPids = pids;
      chubBuildAll(pids);
    };

    window.chubReset = function() {
      document.getElementById('chub-search').value = '';
      document.getElementById('chub-office').value = '';
      document.getElementById('chub-state').value = '';
      document.getElementById('chub-score').value = '';
      document.getElementById('chub-sort').value = 'score-desc';
      chubFilter();
    };

    window.chubToggle = function(pid) {
      if (_cmpSelected.has(pid)) {
        _cmpSelected.delete(pid);
      } else {
        _cmpSelected.add(pid);
      }
      _syncAllCompareUI(pid);
      _chubUpdateLaunchBar();
      _chubRefreshCards();
      _mypolBuildGrid();
    };

    function _syncAllCompareUI(pid) {
      const sel = _cmpSelected.has(pid);
      document.querySelectorAll('.compare-cb[data-pid="' + pid + '"]').forEach(function(c) { c.checked = sel; });
      document.querySelectorAll('.bp-compare-btn[data-pid="' + pid + '"]').forEach(function(b) {
        if (sel) { b.textContent = '✓ ADDED'; b.classList.add('added'); b.closest('.card-holo')?.classList.add('cmp-highlight'); }
        else { b.textContent = '+ COMPARE'; b.classList.remove('added'); b.closest('.card-holo')?.classList.remove('cmp-highlight'); }
      });
      const pmBtn = document.getElementById('pmc-'+pid);
      if (pmBtn) {
        if (sel) { pmBtn.textContent = '✓ Added'; pmBtn.classList.add('added'); }
        else { pmBtn.textContent = '+ Compare'; pmBtn.classList.remove('added'); }
      }
      _updateCmpFloat();
      _pmUpdateTray();
    }

    function _chubRefreshCards() {
      document.querySelectorAll('.chub-card').forEach(function(card) {
        const pid = card.dataset.pid;
        const sel = _cmpSelected.has(pid);
        card.classList.toggle('chub-selected', sel);
        const btn = card.querySelector('.chub-add-btn');
        if (btn) {
          btn.textContent = sel ? '✓ Added' : '+ Compare';
          btn.classList.toggle('chub-added', sel);
        }
        const bpBtn = card.querySelector('.bp-compare-btn');
        if (bpBtn) {
          if (card.closest('#myteam-browse-grid')) {
            bpBtn.textContent = sel ? '✓ COMPARING' : '+ COMPARE';
          } else {
            bpBtn.textContent = sel ? '✓ Comparing' : '⚖️ Compare';
          }
          bpBtn.classList.toggle('added', sel);
        }
      });
    }

    function _chubUpdateLaunchBar() {
      const bar = document.getElementById('chub-launch-bar');
      const pills = document.getElementById('chub-sel-pills');
      const btn = document.getElementById('chub-launch-btn');
      const hint = document.getElementById('chub-launch-hint');
      const n = _cmpSelected.size;

      if (n >= 1) {
        bar.style.display = '';
        btn.disabled = n < 2;
        if (n < 2) {
          btn.textContent = 'Select ' + (2-n) + ' More to Compare';
          if (hint) hint.textContent = 'You need at least 2 politicians to start a comparison';
        } else {
          btn.innerHTML = '<svg style="width:1.1rem;height:1.1rem;flex-shrink:0;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg> Compare Selected (' + n + ')';
          if (hint) hint.textContent = 'Ready! Click to open the side-by-side comparison view';
        }
        const pids = [..._cmpSelected];
        pills.innerHTML = pids.map(function(pid) {
          const d = CMP_DATA[pid];
          // The selection pill carries the name, not a rate. It used to lead with
          // a pledge percentage, which put a number on a chip with no room for the
          // coverage that would make it mean anything.
          return '<span style="display:inline-flex;align-items:center;gap:0.3rem;background:rgba(30,53,96,0.6);border:1px solid rgba(96,165,250,0.3);color:white;font-family:\'Barlow Condensed\',sans-serif;font-size:0.65rem;font-weight:700;letter-spacing:0.06em;padding:0.2rem 0.55rem;border-radius:999px;">' +
            (d?.name || pid) +
            ' <button onclick="chubToggle(\'' + pid + '\')" style="background:none;border:none;color:#7596c0;cursor:pointer;padding:0;font-size:0.7rem;line-height:1;margin-left:0.1rem;" title="Remove">✕</button>' +
          '</span>';
        }).join('');
      } else {
        bar.style.display = 'none';
      }
    }

    window.chubLaunchCompare = function() {
      if (_cmpSelected.size < 2) return;
      openCompare();
    };

    // One-tap "Compare the field" — load an ENTIRE district seat's lineup (the
    // sitting officeholder if they're running again, plus every 2026 candidate for
    // that same seat) straight into the side-by-side Compare overlay, with nothing
    // for the voter to hand-pick. This is the bridge from the unified district view
    // ("here's who's running for this seat") to a head-to-head of exactly those
    // people, so a voter can evaluate one specific race without detouring through
    // the global Compare tool. Mirrors keyRacesCompareRace's staging but repaints
    // the browse/district surfaces (chub cards) rather than the Key Races cards.
    window.pdxCompareField = function(pidsCsv) {
      try {
        var pids = (pidsCsv || '').split(',').filter(function(p) {
          return p && typeof CMP_DATA !== 'undefined' && CMP_DATA[p];
        });
        if (pids.length < 2) {
          // Nothing to weigh side-by-side — fall back to the lone profile.
          if (pids.length === 1 && typeof showProfile === 'function') showProfile(pids[0]);
          return;
        }
        // Stage exactly this seat's field: drop whatever was previously selected so
        // the race stands alone, then add the full field. Track every pid whose
        // state changes (cleared + newly added) so we can resync each one's chips,
        // checkboxes and power-map pills across the whole page.
        var touched = {};
        var prev = (typeof _cmpSelected !== 'undefined') ? Array.from(_cmpSelected) : [];
        prev.forEach(function(p) { _cmpSelected.delete(p); touched[p] = 1; });
        pids.forEach(function(p) { _cmpSelected.add(p); touched[p] = 1; });
        if (typeof _syncAllCompareUI === 'function') {
          Object.keys(touched).forEach(function(p) { _syncAllCompareUI(p); });
        }
        if (typeof _chubRefreshCards === 'function') _chubRefreshCards();
        if (typeof _chubUpdateLaunchBar === 'function') _chubUpdateLaunchBar();
        if (typeof _updateCmpFloat === 'function') _updateCmpFloat();
        if (typeof _pmUpdateTray === 'function') _pmUpdateTray();
        if (typeof openCompare === 'function') openCompare();
      } catch (e) {}
    };

    const _origHandleCompareCheck = window.handleCompareCheck;
    window.handleCompareCheck = function(checkbox) {
      _origHandleCompareCheck(checkbox);
      _chubUpdateLaunchBar();
      _chubRefreshCards();
      _mypolBuildGrid();
    };

    const _origBpAddCompare = window.bpAddCompare;
    window.bpAddCompare = function(pid, btn) {
      _origBpAddCompare(pid, btn);
      _chubUpdateLaunchBar();
      _chubRefreshCards();
      _mypolBuildGrid();
    };

    const _origPmAddCompare = window.pmAddCompare;
    window.pmAddCompare = function(pid, btn) {
      _origPmAddCompare(pid, btn);
      _chubUpdateLaunchBar();
      _chubRefreshCards();
      _mypolBuildGrid();
    };

    const _origClearAllCompare = window.clearAllCompare;
    window.clearAllCompare = function(e) {
      _origClearAllCompare(e);
      _chubUpdateLaunchBar();
      _chubRefreshCards();
      _mypolBuildGrid();
    };

    // ── Potential Politicians — separate localStorage set ──
    const POTENTIAL_KEY = 'politidex_potential_politicians';
    let _potentialPoliticians = new Set();

    function _potentialLoad() {
      try {
        const saved = localStorage.getItem(POTENTIAL_KEY);
        if (saved) {
          const arr = JSON.parse(saved);
          _potentialPoliticians = new Set(Array.isArray(arr) ? arr : []);
        }
      } catch(e) {
        _potentialPoliticians = new Set();
      }
    }

    function _potentialSave() {
      try { localStorage.setItem(POTENTIAL_KEY, JSON.stringify([..._potentialPoliticians])); } catch(e) {}
      var user = auth.currentUser;
      if (user && !user.isAnonymous) {
        db.collection('users').doc(user.uid).set({
          potential_politicians: Array.from(_potentialPoliticians)
        }, { merge: true }).catch(function(e) {
          console.warn("Firestore save potential_politicians failed:", e);
        });
      }
    }

    window.potentialToggle = function(pid) {
      if (_potentialPoliticians.has(pid)) { _potentialPoliticians.delete(pid); }
      else { _potentialPoliticians.add(pid); }
      _potentialSave();
      _potentialBuildGrid();
      _mypolBuildGrid();
      chubBuildAll();
    };

    function _potentialRenderCard(pid) {
      var d = CMP_DATA[pid];
      if (!d) return '';
      var alignBar = (typeof _alignCardBar === 'function') ? _alignCardBar(pid) : '';
      return window._pdxCardShell(pid, {
        cardClass: 'potential-card',
        controls: _pdxWatchCtrl(pid),
        badges: '<span class="potential-badge">🌟 Watching</span>' + _pdxLocalBadge(pid),
        extra: alignBar,
        actions: _pdxCompareActions(pid)
      });
    }

    function _potentialBuildGrid() {
      var grid = document.getElementById('potential-grid');
      var empty = document.getElementById('potential-empty');
      var badge = document.getElementById('potential-count-badge');
      if (!grid) return;

      var pids = [..._potentialPoliticians].filter(function(pid) { return CMP_DATA[pid]; });
      pids.sort(function(a, b) {
        var sa = CMP_DATA[a].score ?? -1, sb = CMP_DATA[b].score ?? -1;
        return sb - sa;
      });

      if (pids.length > 0) {
        grid.innerHTML = pids.map(function(pid) { return _potentialRenderCard(pid); }).join('');
        if (empty) empty.style.display = 'none';
        if (badge) { badge.textContent = pids.length; badge.style.display = ''; }
      } else {
        grid.innerHTML = '';
        if (empty) empty.style.display = '';
        if (badge) badge.style.display = 'none';
      }
    }

    window._mypolBuildGrid = _mypolBuildGrid;
    window._potentialBuildGrid = _potentialBuildGrid;

    // Once the Evidence Locker library finishes loading (or its extended roster
    // lands), repaint the team builder so "My Team's Evidence" upgrades from its
    // optimistic state to real counts — and any entry point that turns out to
    // have no evidence behind it is trimmed by the same honesty gate.
    document.addEventListener('pdx-evidence-ready', function () {
      try { if (typeof _mypolBuildGrid === 'function') _mypolBuildGrid(); } catch (e) {}
      // Once the Locker library has loaded, the shared card evidence row can show
      // each official's true filed-item count and the "See Evidence" jump. Repaint
      // the other high-traffic discovery surfaces so those counts/links appear
      // without the voter having to interact first. Each is guarded on visibility
      // (the All Politicians / global-search grid preserves its accordion state on
      // re-render) so hidden panels do no needless work.
      try {
        if (typeof window.myteamBrowseFilter === 'function') {
          var _apg = document.getElementById('myteam-browse-grid');
          if (_apg && _apg.offsetParent !== null) window.myteamBrowseFilter();
        }
      } catch (e) {}
      try {
        if (typeof _favoritesBuildGrid === 'function') {
          var _fg = document.getElementById('favorites-grid');
          if (_fg && _fg.offsetParent !== null) _favoritesBuildGrid();
        }
      } catch (e) {}
      try {
        if (typeof chubBuildAll === 'function') {
          var _cg = document.getElementById('chub-all-grid');
          if (_cg && _cg.offsetParent !== null) chubBuildAll();
        }
      } catch (e) {}
    });

    function _chubInit() {
      if (typeof CMP_DATA === 'undefined') return;
      _selectedDistrict = _getSelectedDistrict();
      _mypolLoad();
      _loadFavorites();
      _potentialLoad();
      _mypolBuildGrid();
      _potentialBuildGrid();
      _mypolUpdateCount();
      if (typeof window._pdxBrowseStateInit === 'function') window._pdxBrowseStateInit();
      chubFilter();
      _chubUpdateLaunchBar();
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', _chubInit);
    else _chubInit();
  })();
  
