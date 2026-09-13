// ─────────────────────────────────────────────────────────────────────────────
// BROWSE_PHOTOS — the curated headshot map
// ─────────────────────────────────────────────────────────────────────────────
// Moved here verbatim out of compare-hub.js, which is where it landed when the
// first-paint pass lifted the inline blocks out of index.html. Not a rewrite and
// not a second copy: the object literal below is byte-for-byte the one that was
// in the hub, the hub now reads it off window like everybody else, and this file
// loads from the hub's old position in index.html, so execution order and the
// global it publishes are unchanged.
//
// WHY IT MOVED. A face is data; the Compare Hub is behaviour. /ballot needs the
// same headshots the person file shows — the desk lists candidates by name and a
// name with no face is a worse record than the one the profile already paints —
// and /ballot must not load a 10,000-line collection manager to get them. The
// table is 715 portrait URLs and nothing else: no DOM, no listeners, no reads of
// any other module. So it is its own file, and the two documents that want faces
// load exactly that.
//
// THE RESOLVER IS STILL ELSEWHERE. window._getPhotoUrl (ballot-breakdown.js) is
// the single source of truth for WHICH face a pid gets: PROFILES → CMP_DATA →
// BROWSE_PHOTOS, with the alias hops in both directions. This file answers only
// the last tier, and it answers it the same way on every document that loads it.
//
// Values are single-quoted string literals, one entry per line, closed by an
// indented `};` — scripts/audit-photo-coverage.mjs and the federal-roster census
// scripts parse this shape out of the shipped source, so keep it.
// ─────────────────────────────────────────────────────────────────────────────
  (function () {
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
      // MIKE KENNEDY IS K000403, AND THE NEIGHBOURING ID IS SOMEBODY ELSE. UT-03's
      // representative sits one digit away from K000404 — Kimberlyn King-Hinds,
      // the delegate for the Northern Mariana Islands — and the live roster was
      // filed with hers, which loads, so no placeholder and no onerror ever
      // reported it. The official House/Clerk portrait for K000403 is the value
      // here, PDX_PHOTO_FIX in firebase-boot.js holds the same string so the
      // roster's copy cannot win, and scripts/test-photo-coverage.mjs pins the two
      // together. Never re-derive this from a neighbouring id.
      kennedy: 'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/K000403.jpg', // UT-03 · K000403
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
      // KEYED TO THE CANONICAL FILE, NOT THE ADDRESS THAT REACHES IT. Utah House
      // District 68 has one person and one file, `chew_h68` — the roster record
      // that holds the formal record and the one row search returns. The headshot
      // was only ever filed under `scott_chew`, the retired Firestore stub whose
      // own address already redirects here, so `_getPhotoUrl('chew_h68')` found a
      // roster record with no `photo`, no document in PROFILES and no entry here,
      // and every surface that asks it for a face — the letterhead first — painted
      // the placeholder over a person whose portrait we had all along.
      //   Same image, same official host as every other Utah legislator in this
      // map (le.utah.gov, allowlisted in netlify.toml so the share card's
      // same-origin proxy can fetch it too). This adds a photo to the canonical
      // key; it does not put `scott_chew` back in the roster, the search index, the
      // Eye or the sitemap, and PDX_PROFILE_ALIAS still sends it here.
      chew_h68: 'https://le.utah.gov/images/legislator/CHEWSH.jpg',
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
      // Federal wave F8 roster admission. Both were serving senators the app already
      // published stance rows for and could not attribute a single Senate roll to,
      // because neither carried a portrait to read a Bioguide out of and neither was
      // named by hand — 37 unattributable rows per Senate roll, recorded as a gap by
      // wave F7 rather than guessed. Cindy Hyde-Smith has an official congressional
      // portrait, so hers is the URL form scripts/vr-gen-member-map.mjs reads a
      // Bioguide out of, and her SEED_SLUGS entry and this line cross-check each other.
      hyde_smith: 'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/H001079.jpg', // MS U.S. Senate · H001079
      // Non-incumbent nominees / appointee with no congressional portrait —
      // official or high-quality public portraits via Wikimedia Commons (500px).
      jon_husted: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b7/Sen._Jon_Husted_official_portrait%2C_119th_Congress.jpg/500px-Sen._Jon_Husted_official_portrait%2C_119th_Congress.jpg', // OH U.S. Senate (appointed 2025) — official Senate portrait
      // Alan Armstrong (R-OK, sworn 2026-03-24) has no file in unitedstates/images and
      // none at bioguide.congress.gov yet — both 404 — so the portrait is the official
      // Senate photograph on Commons (public domain, U.S. Senate photo by Daniel Rios),
      // in the hash-independent Special:FilePath form. It carries no readable Bioguide,
      // so his slug is mapped by hand in SEED_SLUGS and his identity is cross-checked
      // through SEED_NAMES instead of through this URL. NOT `kelly_armstrong`, who is
      // the Governor of North Dakota and a different person with the same surname.
      alan_armstrong: 'https://commons.wikimedia.org/wiki/Special:FilePath/Alan_S_Armstrong_official_portrait.jpg?width=500', // OK U.S. Senate (sworn 2026) — official Senate portrait
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
      // ── Federal wave F6: the eight thin House files ───────────────────────────
      // These eight attribute roll calls as of this wave (db/vr-member-map.json), so
      // each can now be the subject of a vote-derived Official Record share card. A
      // card is an image with a face on it and the #record= link it opens paints before
      // any Firestore round trip, so a member who attributes votes without a BUNDLED
      // portrait shows a face on the card and a party-tinted monogram on arrival. Same
      // official public-domain source and same allowlisted host as every other federal
      // member above, keyed by the Bioguide the ingest reads; each URL was fetched and
      // came back an image/jpeg, and each Bioguide is the one verified by name+state in
      // scripts/vr-gen-member-map.mjs.
      aguilar: 'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/A000371.jpg',
      adam_smith: 'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/S000510.jpg', // WA-09 · S000510
      adrian_smith: 'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/S001172.jpg', // NE-03 · S001172
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
      dina_titus: 'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/T000468.jpg', // NV-01 · T000468
      don_bacon: 'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/B001298.jpg',
      donalds: 'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/D000032.jpg',
      duckworth: 'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/D000622.jpg',
      ernst: 'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/E000295.jpg',
      fitzpatrick: 'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/F000466.jpg',
      gabe_vasquez: 'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/V000136.jpg', // NM-02 · V000136
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
      melanie_stansbury: 'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/S001218.jpg', // NM-01 · S001218
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
      russ_fulcher: 'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/F000469.jpg', // ID-01 · F000469
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
      susie_lee: 'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/L000590.jpg', // NV-03 · L000590
      tammy_baldwin: 'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/B001230.jpg',
      ted_budd: 'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/B001305.jpg',
      ted_lieu: 'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/L000582.jpg',
      teresa_leger_fernandez: 'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/L000273.jpg', // NM-03 · L000273
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
      zach_nunn: 'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/N000193.jpg', // IA-03 · N000193
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
      // ══ Federal roster wave R1: the sitting House gets a face ═══════════════
      // Every member in this block was admitted to the Voting Record roster by wave R1,
      // which widened db/vr-member-map.json from 116 of the 431 sitting House members to
      // all of them. A member who attributes a roll call can be the subject of an Official
      // Record share card, and that card must not open on initials — so a portrait here is
      // not decoration, it is the second half of the admission. It is also the second
      // OPINION: scripts/vr-gen-member-map.mjs reads the Bioguide straight out of these
      // URLs and fails if it disagrees with the hand-typed SEED_SLUGS entry for the same
      // slug, which is the wall against a repointed photo silently re-homing somebody's
      // voting record onto the wrong profile.
      //   305 are official congressional portraits from unitedstates/images. The other ten
      // have no file there and use their official portrait at bioguide.congress.gov — both
      // hosts are already on netlify.toml's remote_images allowlist, so the share card can
      // proxy either one; nothing here needed a new host and nothing here is a placeholder.
      // Ordered by state and district, the way the Clerk's roster reads.
      nicholas_begich:          'https://bioguide.congress.gov/bioguide/photo/B/B001323.jpg', // AK-AL · B001323
      barry_moore:              'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/M001212.jpg', // AL-01 · M001212
      shomari_figures:          'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/F000481.jpg', // AL-02 · F000481
      mike_rogers_al:           'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/R000575.jpg', // AL-03 · R000575
      robert_aderholt:          'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/A000055.jpg', // AL-04 · A000055
      dale_strong:              'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/S001220.jpg', // AL-05 · S001220
      gary_palmer:              'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/P000609.jpg', // AL-06 · P000609
      terri_sewell:             'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/S001185.jpg', // AL-07 · S001185
      david_schweikert:         'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/S001183.jpg', // AZ-01 · S001183
      eli_crane:                'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/C001132.jpg', // AZ-02 · C001132
      yassamin_ansari:          'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/A000381.jpg', // AZ-03 · A000381
      greg_stanton:             'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/S001211.jpg', // AZ-04 · S001211
      andy_biggs:               'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/B001302.jpg', // AZ-05 · B001302
      juan_ciscomani:           'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/C001133.jpg', // AZ-06 · C001133
      adelita_grijalva:         'https://bioguide.congress.gov/bioguide/photo/G/G000606.jpg', // AZ-07 · G000606
      abraham_hamadeh:          'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/H001098.jpg', // AZ-08 · H001098
      paul_gosar:               'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/G000565.jpg', // AZ-09 · G000565
      james_gallagher:          'https://bioguide.congress.gov/bioguide/photo/G/G000607.jpg', // CA-01 · G000607
      kevin_kiley:              'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/K000401.jpg', // CA-03 · K000401
      mike_thompson:            'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/T000460.jpg', // CA-04 · T000460
      tom_mcclintock:           'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/M001177.jpg', // CA-05 · M001177
      ami_bera:                 'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/B001287.jpg', // CA-06 · B001287
      doris_matsui:             'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/M001163.jpg', // CA-07 · M001163
      john_garamendi:           'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/G000559.jpg', // CA-08 · G000559
      josh_harder:              'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/H001090.jpg', // CA-09 · H001090
      mark_desaulnier:          'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/D000623.jpg', // CA-10 · D000623
      nancy_pelosi:             'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/P000197.jpg', // CA-11 · P000197
      lateefah_simon:           'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/S001231.jpg', // CA-12 · S001231
      adam_gray:                'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/G000605.jpg', // CA-13 · G000605
      kevin_mullin:             'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/M001225.jpg', // CA-15 · M001225
      sam_liccardo:             'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/L000607.jpg', // CA-16 · L000607
      jimmy_panetta:            'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/P000613.jpg', // CA-19 · P000613
      vince_fong:               'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/F000480.jpg', // CA-20 · F000480
      jim_costa:                'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/C001059.jpg', // CA-21 · C001059
      david_valadao:            'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/V000129.jpg', // CA-22 · V000129
      jay_obernolte:            'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/O000019.jpg', // CA-23 · O000019
      salud_carbajal:           'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/C001112.jpg', // CA-24 · C001112
      raul_ruiz:                'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/R000599.jpg', // CA-25 · R000599
      julia_brownley:           'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/B001285.jpg', // CA-26 · B001285
      george_whitesides:        'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/W000830.jpg', // CA-27 · W000830
      judy_chu:                 'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/C001080.jpg', // CA-28 · C001080
      luz_rivas:                'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/R000620.jpg', // CA-29 · R000620
      laura_friedman:           'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/F000483.jpg', // CA-30 · F000483
      gilbert_cisneros:         'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/C001123.jpg', // CA-31 · C001123
      brad_sherman:             'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/S000344.jpg', // CA-32 · S000344
      jimmy_gomez:              'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/G000585.jpg', // CA-34 · G000585
      norma_torres:             'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/T000474.jpg', // CA-35 · T000474
      sydney_kamlager_dove:     'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/K000400.jpg', // CA-37 · K000400
      linda_sanchez:            'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/S001156.jpg', // CA-38 · S001156
      young_kim:                'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/K000397.jpg', // CA-40 · K000397
      ken_calvert:              'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/C000059.jpg', // CA-41 · C000059
      nanette_barragan:         'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/B001300.jpg', // CA-44 · B001300
      derek_tran:               'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/T000491.jpg', // CA-45 · T000491
      j_correa:                 'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/C001110.jpg', // CA-46 · C001110
      dave_min:                 'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/M001241.jpg', // CA-47 · M001241
      darrell_issa:             'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/I000056.jpg', // CA-48 · I000056
      mike_levin:               'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/L000593.jpg', // CA-49 · L000593
      scott_peters:             'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/P000608.jpg', // CA-50 · P000608
      sara_jacobs:              'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/J000305.jpg', // CA-51 · J000305
      juan_vargas:              'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/V000130.jpg', // CA-52 · V000130
      jeff_hurd:                'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/H001100.jpg', // CO-03 · H001100
      jeff_crank:               'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/C001137.jpg', // CO-05 · C001137
      jason_crow:               'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/C001121.jpg', // CO-06 · C001121
      brittany_pettersen:       'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/P000620.jpg', // CO-07 · P000620
      gabe_evans:               'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/E000300.jpg', // CO-08 · E000300
      john_larson:              'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/L000557.jpg', // CT-01 · L000557
      joe_courtney:             'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/C001069.jpg', // CT-02 · C001069
      jahana_hayes:             'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/H001081.jpg', // CT-05 · H001081
      jimmy_patronis:           'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/P000622.jpg', // FL-01 · P000622
      neal_dunn:                'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/D000628.jpg', // FL-02 · D000628
      kat_cammack:              'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/C001039.jpg', // FL-03 · C001039
      aaron_bean:               'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/B001314.jpg', // FL-04 · B001314
      john_rutherford:          'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/R000609.jpg', // FL-05 · R000609
      rfine:                    'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/F000484.jpg', // FL-06 · F000484
      cory_mills:               'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/M001216.jpg', // FL-07 · M001216
      mike_haridopolos:         'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/H001099.jpg', // FL-08 · H001099
      darren_soto:              'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/S001200.jpg', // FL-09 · S001200
      daniel_webster:           'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/W000806.jpg', // FL-11 · W000806
      gus_bilirakis:            'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/B001257.jpg', // FL-12 · B001257
      kathy_castor:             'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/C001066.jpg', // FL-14 · C001066
      laurel_lee:               'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/L000597.jpg', // FL-15 · L000597
      vern_buchanan:            'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/B001260.jpg', // FL-16 · B001260
      w_steube:                 'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/S001214.jpg', // FL-17 · S001214
      c_franklin:               'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/F000472.jpg', // FL-18 · F000472
      lois_frankel:             'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/F000462.jpg', // FL-22 · F000462
      jared_moskowitz:          'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/M001217.jpg', // FL-23 · M001217
      frederica_wilson:         'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/W000808.jpg', // FL-24 · W000808
      debbie_wasserman_schultz: 'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/W000797.jpg', // FL-25 · W000797
      mario_diaz_balart:        'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/D000600.jpg', // FL-26 · D000600
      maria_salazar:            'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/S000168.jpg', // FL-27 · S000168
      carlos_gimenez:           'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/G000593.jpg', // FL-28 · G000593
      buddy_carter:             'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/C001103.jpg', // GA-01 · C001103
      sanford_bishop:           'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/B000490.jpg', // GA-02 · B000490
      brian_jack:               'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/J000311.jpg', // GA-03 · J000311
      hank_johnson:             'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/J000288.jpg', // GA-04 · J000288
      nikema_williams:          'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/W000788.jpg', // GA-05 · W000788
      lucy_mcbath:              'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/M001208.jpg', // GA-06 · M001208
      rich_mccormick:           'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/M001218.jpg', // GA-07 · M001218
      austin_scott:             'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/S001189.jpg', // GA-08 · S001189
      andrew_clyde:             'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/C001116.jpg', // GA-09 · C001116
      barry_loudermilk:         'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/L000583.jpg', // GA-11 · L000583
      rick_allen:               'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/A000372.jpg', // GA-12 · A000372
      clay_fuller:              'https://bioguide.congress.gov/bioguide/photo/F/F000485.jpg', // GA-14 · F000485
      ed_case:                  'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/C001055.jpg', // HI-01 · C001055
      jill_tokuda:              'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/T000487.jpg', // HI-02 · T000487
      ashley_hinson:            'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/H001091.jpg', // IA-02 · H001091
      randy_feenstra:           'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/F000446.jpg', // IA-04 · F000446
      jonathan_jackson:         'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/J000309.jpg', // IL-01 · J000309
      robin_kelly:              'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/K000385.jpg', // IL-02 · K000385
      chuy_garcia:              'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/G000586.jpg', // IL-04 · G000586
      mike_quigley:             'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/Q000023.jpg', // IL-05 · Q000023
      sean_casten:              'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/C001117.jpg', // IL-06 · C001117
      danny_davis:              'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/D000096.jpg', // IL-07 · D000096
      brad_schneider:           'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/S001190.jpg', // IL-10 · S001190
      bill_foster:              'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/F000454.jpg', // IL-11 · F000454
      nicole_nikki_budzinski:   'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/B001315.jpg', // IL-13 · B001315
      lauren_underwood:         'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/U000040.jpg', // IL-14 · U000040
      mary_miller:              'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/M001211.jpg', // IL-15 · M001211
      darin_lahood:             'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/L000585.jpg', // IL-16 · L000585
      eric_sorensen:            'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/S001225.jpg', // IL-17 · S001225
      frank_mrvan:              'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/M001214.jpg', // IN-01 · M001214
      rudy_yakym:               'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/Y000067.jpg', // IN-02 · Y000067
      marlin_stutzman:          'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/S001188.jpg', // IN-03 · S001188
      james_baird:              'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/B001307.jpg', // IN-04 · B001307
      victoria_spartz:          'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/S000929.jpg', // IN-05 · S000929
      jefferson_shreve:         'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/S001229.jpg', // IN-06 · S001229
      andre_carson:             'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/C001072.jpg', // IN-07 · C001072
      mark_messmer:             'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/M001233.jpg', // IN-08 · M001233
      erin_houchin:             'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/H001093.jpg', // IN-09 · H001093
      tracey_mann:              'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/M000871.jpg', // KS-01 · M000871
      derek_schmidt:            'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/S001228.jpg', // KS-02 · S001228
      sharice_davids:           'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/D000629.jpg', // KS-03 · D000629
      ron_estes:                'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/E000298.jpg', // KS-04 · E000298
      morgan_mcgarvey:          'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/M001220.jpg', // KY-03 · M001220
      hal_rogers:               'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/R000395.jpg', // KY-05 · R000395
      andy_barr:                'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/B001282.jpg', // KY-06 · B001282
      troy_carter:              'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/C001125.jpg', // LA-02 · C001125
      clay_higgins:             'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/H001077.jpg', // LA-03 · H001077
      julia_letlow:             'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/L000595.jpg', // LA-05 · L000595
      cleo_fields:              'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/F000110.jpg', // LA-06 · F000110
      lori_trahan:              'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/T000482.jpg', // MA-03 · T000482
      stephen_lynch:            'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/L000562.jpg', // MA-08 · L000562
      william_keating:          'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/K000375.jpg', // MA-09 · K000375
      johnny_olszewski:         'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/O000176.jpg', // MD-02 · O000176
      sarah_elfreth:            'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/E000301.jpg', // MD-03 · E000301
      glenn_ivey:               'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/I000058.jpg', // MD-04 · I000058
      april_mcclain_delaney:    'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/M001232.jpg', // MD-06 · M001232
      kweisi_mfume:             'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/M000687.jpg', // MD-07 · M000687
      jack_bergman:             'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/B001301.jpg', // MI-01 · B001301
      john_moolenaar:           'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/M001194.jpg', // MI-02 · M001194
      hillary_scholten:         'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/S001221.jpg', // MI-03 · S001221
      bill_huizenga:            'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/H001058.jpg', // MI-04 · H001058
      tom_barrett:              'https://bioguide.congress.gov/bioguide/photo/B/B001321.jpg', // MI-07 · B001321
      kristen_mcdonald_rivet:   'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/M001237.jpg', // MI-08 · M001237
      john_james:               'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/J000307.jpg', // MI-10 · J000307
      shri_thanedar:            'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/T000488.jpg', // MI-13 · T000488
      brad_finstad:             'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/F000475.jpg', // MN-01 · F000475
      kelly_morrison:           'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/M001234.jpg', // MN-03 · M001234
      betty_mccollum:           'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/M001143.jpg', // MN-04 · M001143
      michelle_fischbach:       'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/F000470.jpg', // MN-07 · F000470
      pete_stauber:             'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/S001212.jpg', // MN-08 · S001212
      wesley_bell:              'https://bioguide.congress.gov/bioguide/photo/B/B001324.jpg', // MO-01 · B001324
      ann_wagner:               'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/W000812.jpg', // MO-02 · W000812
      robert_onder:             'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/O000177.jpg', // MO-03 · O000177
      mark_alford:              'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/A000379.jpg', // MO-04 · A000379
      emanuel_cleaver:          'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/C001061.jpg', // MO-05 · C001061
      eric_burlison:            'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/B001316.jpg', // MO-07 · B001316
      ryan_zinke:               'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/Z000018.jpg', // MT-01 · Z000018
      deborah_ross:             'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/R000305.jpg', // NC-02 · R000305
      gregory_murphy:           'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/M001210.jpg', // NC-03 · M001210
      valerie_foushee:          'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/F000477.jpg', // NC-04 · F000477
      addison_mcdowell:         'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/M001240.jpg', // NC-06 · M001240
      david_rouzer:             'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/R000603.jpg', // NC-07 · R000603
      mark_harris:              'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/H001102.jpg', // NC-08 · H001102
      hudson:                   'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/H001067.jpg', // NC-09 · H001067
      pat_harrigan:             'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/H001101.jpg', // NC-10 · H001101
      charles_chuck_edwards:    'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/E000246.jpg', // NC-11 · E000246
      alma_adams:               'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/A000370.jpg', // NC-12 · A000370
      brad_knott:               'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/K000405.jpg', // NC-13 · K000405
      tim_moore:                'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/M001236.jpg', // NC-14 · M001236
      chris_pappas:             'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/P000614.jpg', // NH-01 · P000614
      maggie_goodlander:        'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/G000604.jpg', // NH-02 · G000604
      donald_norcross:          'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/N000188.jpg', // NJ-01 · N000188
      jefferson_van_drew:       'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/V000133.jpg', // NJ-02 · V000133
      herbert_conaway:          'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/C001136.jpg', // NJ-03 · C001136
      chris_smith:              'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/S000522.jpg', // NJ-04 · S000522
      thomas_kean:              'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/K000398.jpg', // NJ-07 · K000398
      robert_menendez:          'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/M001226.jpg', // NJ-08 · M001226
      nellie_pou:               'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/P000621.jpg', // NJ-09 · P000621
      lamonica_mciver:          'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/M001229.jpg', // NJ-10 · M001229
      analilia_mejia:           'https://bioguide.congress.gov/bioguide/photo/M/M001246.jpg', // NJ-11 · M001246
      bonnie_watson_coleman:    'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/W000822.jpg', // NJ-12 · W000822
      mark_amodei:              'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/A000369.jpg', // NV-02 · A000369
      steven_horsford:          'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/H001066.jpg', // NV-04 · H001066
      nicolas_lalota:           'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/L000598.jpg', // NY-01 · L000598
      laura_gillen:             'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/G000602.jpg', // NY-04 · G000602
      grace_meng:               'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/M001188.jpg', // NY-06 · M001188
      nydia_velazquez:          'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/V000081.jpg', // NY-07 · V000081
      yvette_clarke:            'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/C001067.jpg', // NY-09 · C001067
      nicole_malliotakis:       'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/M000317.jpg', // NY-11 · M000317
      adriano_espaillat:        'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/E000297.jpg', // NY-13 · E000297
      george_latimer:           'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/L000606.jpg', // NY-16 · L000606
      patrick_ryan:             'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/R000579.jpg', // NY-18 · R000579
      josh_riley:               'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/R000622.jpg', // NY-19 · R000622
      paul_tonko:               'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/T000469.jpg', // NY-20 · T000469
      john_mannion:             'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/M001231.jpg', // NY-22 · M001231
      nicholas_langworthy:      'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/L000600.jpg', // NY-23 · L000600
      claudia_tenney:           'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/T000478.jpg', // NY-24 · T000478
      joseph_morelle:           'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/M001206.jpg', // NY-25 · M001206
      timothy_kennedy:          'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/K000402.jpg', // NY-26 · K000402
      david_taylor:             'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/T000490.jpg', // OH-02 · T000490
      joyce_beatty:             'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/B001281.jpg', // OH-03 · B001281
      robert_latta:             'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/L000566.jpg', // OH-05 · L000566
      michael_rulli:            'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/R000619.jpg', // OH-06 · R000619
      max_miller:               'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/M001222.jpg', // OH-07 · M001222
      warren_davidson:          'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/D000626.jpg', // OH-08 · D000626
      marcy_kaptur:             'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/K000009.jpg', // OH-09 · K000009
      michael_turner:           'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/T000463.jpg', // OH-10 · T000463
      shontel_brown:            'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/B001313.jpg', // OH-11 · B001313
      troy_balderson:           'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/B001306.jpg', // OH-12 · B001306
      emilia_sykes:             'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/S001223.jpg', // OH-13 · S001223
      david_joyce:              'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/J000295.jpg', // OH-14 · J000295
      mike_carey:               'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/C001126.jpg', // OH-15 · C001126
      suzanne_bonamici:         'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/B001278.jpg', // OR-01 · B001278
      cliff_bentz:              'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/B000668.jpg', // OR-02 · B000668
      maxine_dexter:            'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/D000635.jpg', // OR-03 · D000635
      valerie_hoyle:            'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/H001094.jpg', // OR-04 · H001094
      janelle_bynum:            'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/B001326.jpg', // OR-05 · B001326
      andrea_salinas:           'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/S001226.jpg', // OR-06 · S001226
      dwight_evans:             'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/E000296.jpg', // PA-03 · E000296
      madeleine_dean:           'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/D000631.jpg', // PA-04 · D000631
      mary_scanlon:             'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/S001205.jpg', // PA-05 · S001205
      chrissy_houlahan:         'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/H001085.jpg', // PA-06 · H001085
      daniel_meuser:            'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/M001204.jpg', // PA-09 · M001204
      lloyd_smucker:            'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/S001199.jpg', // PA-11 · S001199
      john_joyce:               'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/J000302.jpg', // PA-13 · J000302
      guy_reschenthaler:        'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/R000610.jpg', // PA-14 · R000610
      mike_kelly:               'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/K000376.jpg', // PA-16 · K000376
      chris_deluzio:            'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/D000530.jpg', // PA-17 · D000530
      gabe_amo:                 'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/A000380.jpg', // RI-01 · A000380
      seth_magaziner:           'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/M001223.jpg', // RI-02 · M001223
      joe_wilson:               'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/W000795.jpg', // SC-02 · W000795
      sheri_biggs:              'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/B001325.jpg', // SC-03 · B001325
      william_timmons:          'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/T000480.jpg', // SC-04 · T000480
      ralph_norman:             'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/N000190.jpg', // SC-05 · N000190
      russell_fry:              'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/F000478.jpg', // SC-07 · F000478
      dusty_johnson:            'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/J000301.jpg', // SD-AL · J000301
      diana_harshbarger:        'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/H001086.jpg', // TN-01 · H001086
      tim_burchett:             'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/B001309.jpg', // TN-02 · B001309
      chuck_fleischmann:        'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/F000459.jpg', // TN-03 · F000459
      scott_desjarlais:         'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/D000616.jpg', // TN-04 · D000616
      andrew_ogles:             'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/O000175.jpg', // TN-05 · O000175
      john_rose:                'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/R000612.jpg', // TN-06 · R000612
      matt_van_epps:            'https://bioguide.congress.gov/bioguide/photo/V/V000139.jpg', // TN-07 · V000139
      david_kustoff:            'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/K000392.jpg', // TN-08 · K000392
      steve_cohen:              'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/C001068.jpg', // TN-09 · C001068
      nathaniel_moran:          'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/M001224.jpg', // TX-01 · M001224
      keith_self:               'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/S001224.jpg', // TX-03 · S001224
      pat_fallon:               'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/F000246.jpg', // TX-04 · F000246
      lance_gooden:             'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/G000589.jpg', // TX-05 · G000589
      jake_ellzey:              'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/E000071.jpg', // TX-06 · E000071
      lizzie_fletcher:          'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/F000468.jpg', // TX-07 · F000468
      morgan_luttrell:          'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/L000603.jpg', // TX-08 · L000603
      al_green:                 'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/G000553.jpg', // TX-09 · G000553
      michael_mccaul:           'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/M001157.jpg', // TX-10 · M001157
      pfluger:                  'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/P000048.jpg', // TX-11 · P000048
      craig_goldman:            'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/G000601.jpg', // TX-12 · G000601
      ronny_jackson:            'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/J000304.jpg', // TX-13 · J000304
      randy_weber:              'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/W000814.jpg', // TX-14 · W000814
      monica_de_la_cruz:        'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/D000594.jpg', // TX-15 · D000594
      veronica_escobar:         'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/E000299.jpg', // TX-16 · E000299
      pete_sessions:            'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/S000250.jpg', // TX-17 · S000250
      christian_menefee:        'https://bioguide.congress.gov/bioguide/photo/M/M001245.jpg', // TX-18 · M001245
      joaquin_castro:           'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/C001091.jpg', // TX-20 · C001091
      troy_nehls:               'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/N000026.jpg', // TX-22 · N000026
      beth_van_duyne:           'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/V000134.jpg', // TX-24 · V000134
      brandon_gill:             'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/G000603.jpg', // TX-26 · G000603
      michael_cloud:            'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/C001115.jpg', // TX-27 · C001115
      henry_cuellar:            'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/C001063.jpg', // TX-28 · C001063
      sylvia_garcia:            'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/G000587.jpg', // TX-29 · G000587
      john_carter:              'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/C001051.jpg', // TX-31 · C001051
      julie_johnson:            'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/J000310.jpg', // TX-32 · J000310
      marc_veasey:              'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/V000131.jpg', // TX-33 · V000131
      vicente_gonzalez:         'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/G000581.jpg', // TX-34 · G000581
      casar:                    'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/C001131.jpg', // TX-35 · C001131
      lloyd_doggett:            'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/D000399.jpg', // TX-37 · D000399
      wesley_hunt:              'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/H001095.jpg', // TX-38 · H001095
      robert_wittman:           'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/W000804.jpg', // VA-01 · W000804
      jennifer_kiggans:         'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/K000399.jpg', // VA-02 · K000399
      bobby_scott:              'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/S000185.jpg', // VA-03 · S000185
      jennifer_mcclellan:       'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/M001227.jpg', // VA-04 · M001227
      john_mcguire:             'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/M001239.jpg', // VA-05 · M001239
      ben_cline:                'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/C001118.jpg', // VA-06 · C001118
      eugene_vindman:           'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/V000138.jpg', // VA-07 · V000138
      donald_beyer:             'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/B001292.jpg', // VA-08 · B001292
      h_griffith:               'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/G000568.jpg', // VA-09 · G000568
      suhas_subramanyam:        'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/S001230.jpg', // VA-10 · S001230
      james_walkinshaw:         'https://bioguide.congress.gov/bioguide/photo/W/W000831.jpg', // VA-11 · W000831
      becca_balint:             'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/B001318.jpg', // VT-AL · B001318
      delbene:                  'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/D000617.jpg', // WA-01 · D000617
      dan_newhouse:             'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/N000189.jpg', // WA-04 · N000189
      michael_baumgartner:      'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/B001322.jpg', // WA-05 · B001322
      emily_randall:            'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/R000621.jpg', // WA-06 · R000621
      kim_schrier:              'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/S001216.jpg', // WA-08 · S001216
      marilyn_strickland:       'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/S001159.jpg', // WA-10 · S001159
      mark_pocan:               'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/P000607.jpg', // WI-02 · P000607
      derrick_van_orden:        'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/V000135.jpg', // WI-03 · V000135
      gwen_moore:               'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/M001160.jpg', // WI-04 · M001160
      scott_fitzgerald:         'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/F000471.jpg', // WI-05 · F000471
      glenn_grothman:           'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/G000576.jpg', // WI-06 · G000576
      thomas_tiffany:           'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/T000165.jpg', // WI-07 · T000165
      tony_wied:                'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/W000829.jpg', // WI-08 · W000829
      carol_miller:             'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/M001205.jpg', // WV-01 · M001205
      riley_moore:              'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/M001235.jpg', // WV-02 · M001235
      harriet_hageman:          'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/H001096.jpg', // WY-AL · H001096
    };
    // Expose the curated headshot map globally so the single-source-of-truth
    // _getPhotoUrl() (defined in a SEPARATE <script> closure, where this `var`
    // isn't in scope) can use it as the guaranteed fallback. Without this, any
    // surface driven by _getPhotoUrl — e.g. the "See who's running in my races"
    // cards — falls back to a bare 👤 icon for anyone whose photo lives only here
    // and hasn't been hydrated from Firestore yet.
    try { window.BROWSE_PHOTOS = BROWSE_PHOTOS; } catch (e) {}
  })();
