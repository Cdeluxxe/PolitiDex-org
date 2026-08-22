// ─────────────────────────────────────────────────────────────────────────────
// GENERATED FILE — do not edit by hand.
//   source:    cmp-data.js + the stance bundles + acct-spotlight-data.js,
//              measured through the real PDXWordAction.read()
//   generator: scripts/gen-hero-showcase.mjs
//   gate:      scripts/test-hero-showcase.mjs (fails if this file drifts)
//
// The homepage showcase's INVITATION LIST: who is eligible to appear in the
// rotating summary cards, ranked by the coverage that can be measured without a
// network, and party-interleaved so the rotation cannot open with a run of one
// party.
//
// THERE ARE NO VERDICTS IN THIS FILE, AND THERE CANNOT BE. A summary card's
// ⚖️ Word vs Action read is pooled across every documented position, and the
// action half of most of those comparisons is the roll-call record — which is
// only warm in a live browser. hero-showcase.js asks PDXProfileCard for the live
// read and drops anyone whose read is not publishable. Being in this list is
// permission to be considered, never permission to be graded.
//
// If this list is empty, missing or malformed, the showcase renders nothing.
// ─────────────────────────────────────────────────────────────────────────────
(function () {
  'use strict';
  // Idempotent, and never clobbers a payload another surface already installed.
  if (window.PDX_HERO_SHOWCASE) return;
  window.PDX_HERO_SHOWCASE = [
    {
      "pid": "trump",
      "name": "Donald Trump",
      "office": "45th & 47th President · U.S.",
      "party": {
        "label": "R",
        "color": "#f87171"
      },
      "_coverage": {
        "scorable": 34,
        "word": 50,
        "actionIssues": 0
      }
    },
    {
      "pid": "bennie_thompson",
      "name": "Bennie Thompson",
      "office": "U.S. Representative · Mississippi · MS-02",
      "party": {
        "label": "D",
        "color": "#60a5fa"
      },
      "_coverage": {
        "scorable": 13,
        "word": 27,
        "actionIssues": 2
      }
    },
    {
      "pid": "lee",
      "name": "Mike Lee",
      "office": "U.S. Senator · Utah",
      "party": {
        "label": "R",
        "color": "#f87171"
      },
      "_coverage": {
        "scorable": 14,
        "word": 21,
        "actionIssues": 1
      }
    },
    {
      "pid": "jayapal",
      "name": "Pramila Jayapal",
      "office": "U.S. Representative · Washington",
      "party": {
        "label": "D",
        "color": "#60a5fa"
      },
      "_coverage": {
        "scorable": 12,
        "word": 14,
        "actionIssues": 0
      }
    },
    {
      "pid": "scalise",
      "name": "Steve Scalise",
      "office": "House Majority Leader · Louisiana",
      "party": {
        "label": "R",
        "color": "#f87171"
      },
      "_coverage": {
        "scorable": 14,
        "word": 20,
        "actionIssues": 1
      }
    },
    {
      "pid": "khanna",
      "name": "Ro Khanna",
      "office": "U.S. Representative · California",
      "party": {
        "label": "D",
        "color": "#60a5fa"
      },
      "_coverage": {
        "scorable": 11,
        "word": 14,
        "actionIssues": 0
      }
    },
    {
      "pid": "jim_jordan",
      "name": "Jim Jordan",
      "office": "House Judiciary Committee Chair · Ohio",
      "party": {
        "label": "R",
        "color": "#f87171"
      },
      "_coverage": {
        "scorable": 13,
        "word": 17,
        "actionIssues": 0
      }
    },
    {
      "pid": "blouin_s13",
      "name": "Nate Blouin",
      "office": "Utah State Senator · UT District 13 (Millcreek / Salt Lake City)",
      "party": {
        "label": "D",
        "color": "#60a5fa"
      },
      "_coverage": {
        "scorable": 9,
        "word": 11,
        "actionIssues": 1
      }
    },
    {
      "pid": "mike_flood",
      "name": "Mike Flood",
      "office": "U.S. Representative · Nebraska · NE-01",
      "party": {
        "label": "R",
        "color": "#f87171"
      },
      "_coverage": {
        "scorable": 13,
        "word": 24,
        "actionIssues": 0
      }
    },
    {
      "pid": "verona_mauga",
      "name": "Verona Mauga",
      "office": "Utah State Representative · UT District 31 (West Valley City / Taylorsville, Salt Lake County)",
      "party": {
        "label": "D",
        "color": "#60a5fa"
      },
      "_coverage": {
        "scorable": 9,
        "word": 14,
        "actionIssues": 1
      }
    },
    {
      "pid": "steve_womack",
      "name": "Steve Womack",
      "office": "U.S. Representative · Arkansas · AR-03",
      "party": {
        "label": "R",
        "color": "#f87171"
      },
      "_coverage": {
        "scorable": 13,
        "word": 26,
        "actionIssues": 0
      }
    },
    {
      "pid": "kclark",
      "name": "Katherine Clark",
      "office": "House Minority Whip · Massachusetts",
      "party": {
        "label": "D",
        "color": "#60a5fa"
      },
      "_coverage": {
        "scorable": 10,
        "word": 13,
        "actionIssues": 0
      }
    },
    {
      "pid": "massie",
      "name": "Thomas Massie",
      "office": "U.S. Representative · KY-04",
      "party": {
        "label": "R",
        "color": "#f87171"
      },
      "_coverage": {
        "scorable": 10,
        "word": 33,
        "actionIssues": 2
      }
    },
    {
      "pid": "don_davis",
      "name": "Don Davis",
      "office": "U.S. Representative · North Carolina · NC-01",
      "party": {
        "label": "D",
        "color": "#60a5fa"
      },
      "_coverage": {
        "scorable": 7,
        "word": 16,
        "actionIssues": 2
      }
    },
    {
      "pid": "boebert",
      "name": "Lauren Boebert",
      "office": "U.S. Representative · Colorado",
      "party": {
        "label": "R",
        "color": "#f87171"
      },
      "_coverage": {
        "scorable": 12,
        "word": 29,
        "actionIssues": 0
      }
    },
    {
      "pid": "aoc",
      "name": "Alexandria Ocasio-Cortez",
      "office": "U.S. Representative · New York",
      "party": {
        "label": "D",
        "color": "#60a5fa"
      },
      "_coverage": {
        "scorable": 9,
        "word": 14,
        "actionIssues": 0
      }
    },
    {
      "pid": "cox",
      "name": "Spencer Cox",
      "office": "Governor · Utah",
      "party": {
        "label": "R",
        "color": "#f87171"
      },
      "_coverage": {
        "scorable": 12,
        "word": 17,
        "actionIssues": 0
      }
    },
    {
      "pid": "tlaib",
      "name": "Rashida Tlaib",
      "office": "U.S. Representative · Michigan",
      "party": {
        "label": "D",
        "color": "#60a5fa"
      },
      "_coverage": {
        "scorable": 9,
        "word": 12,
        "actionIssues": 0
      }
    }
  ];
})();
