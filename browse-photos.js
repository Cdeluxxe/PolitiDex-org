// ─────────────────────────────────────────────────────────────────────────────
// BROWSE_PHOTOS — portraits for people WITH NO ROSTER ROW, and nobody else
// ─────────────────────────────────────────────────────────────────────────────
// A PERSON HAS ONE PORTRAIT, AND IT IS THE ROSTER FIELD: `photo` on their record
// (CMP_DATA[pid].photo in cmp-data.js, overlaid by the live PROFILES[pid].photo).
// The person file, district-board band 1 and the homepage record card all read
// it — the first two through window.pdxPortrait (roster-portrait.js), the card
// through window._getPhotoUrl, whose first two tiers are that same field.
//
// This map used to hold 715 faces the roster field did not, which is how the
// card painted Ro Khanna while /p/khanna painted 🏭. scripts/
// sweep-roster-portraits.mjs moved every face a roster row could hold onto that
// row (PORTRAIT_SWEEP.md lists the counts and the disagreements). What is left
// is the people the bundled roster has no row for — candidates and records that
// live only in the Firestore roster — reached as _getPhotoUrl's last tier.
// DO NOT ADD A FACE HERE FOR A PID THAT HAS A ROSTER ROW: put it on the row.
// scripts/test-roster-portrait.mjs fails if one comes back.
//
// Values are single-quoted string literals, one entry per line, closed by an
// indented `};` — scripts/audit-photo-coverage.mjs parses this shape.
// ─────────────────────────────────────────────────────────────────────────────
  (function () {
    var BROWSE_PHOTOS = {
      jpike: 'https://insurance.utah.gov/wp-content/uploads/2026-Pike-200x300.jpg',
      rspendlove: 'https://le.utah.gov/images/legislator/SPENDLR.jpg',
      janderegg: 'https://le.utah.gov/images/legislator/ANDEREJ.jpg',
      sherrod_brown: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Sherrod_Brown_117th_Congress_(2).jpg/500px-Sherrod_Brown_117th_Congress_(2).jpg', // OH U.S. Senate nominee — former U.S. Senator
      roy_cooper: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/30/Roy_Cooper_in_November_2023_(cropped2).jpg/500px-Roy_Cooper_in_November_2023_(cropped2).jpg', // NC U.S. Senate nominee — former NC Governor
      michael_whatley: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b5/Michael_Whatley_(54670563614)_(cropped).jpg/500px-Michael_Whatley_(54670563614)_(cropped).jpg', // NC U.S. Senate nominee — RNC chair
      james_talarico: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/70/James_Talarico_Press_Conference_(cropped).jpg/500px-James_Talarico_Press_Conference_(cropped).jpg', // TX U.S. Senate nominee — TX state representative
      christina_bohannan: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/45/ChristinaBohannan.jpg/500px-ChristinaBohannan.jpg', // IA-01 nominee
      laurie_buckhout: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e4/Laurie_Buckhout.jpg/500px-Laurie_Buckhout.jpg', // NC-01 nominee
      paige_cognetti: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/fd/Paige_Cognetti_(52165104986)_(3x4a).jpg/500px-Paige_Cognetti_(52165104986)_(3x4a).jpg', // PA-08 nominee — Mayor of Scranton
      chris_jones: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/95/Chris_Jones%2C_Arkansas_gubernatorial_candidate.jpg/500px-Chris_Jones%2C_Arkansas_gubernatorial_candidate.jpg', // AR-02 nominee
      graham_platner: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1a/Platner_headshot.jpg/500px-Platner_headshot.jpg', // ME U.S. Senate nominee
    };
    // Published for window._getPhotoUrl's last tier, which lives in another
    // <script> closure where this `var` is not in scope.
    try { window.BROWSE_PHOTOS = BROWSE_PHOTOS; } catch (e) {}
  })();
