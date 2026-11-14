// Requested national rotation expansion. URLs are copied verbatim from existing
// stance sources and ingest configuration; missing sources are explicit skips.
export const REQUESTED_POLITICIANS = [
  {
    "name": "Donald Trump",
    "politician_id": "trump",
    "tier": 2,
    "has_board": false,
    "has_stances": true,
    "page": {
      "url": "https://www.whitehouse.gov",
      "source_type": "official homepage",
      "known_from": "politician-stances.js"
    }
  },
  {
    "name": "JD Vance",
    "politician_id": "vance",
    "tier": 2,
    "has_board": false,
    "has_stances": true,
    "page": {
      "url": "https://www.whitehouse.gov",
      "source_type": "official homepage",
      "known_from": "politician-stances.js"
    }
  },
  {
    "name": "Joe Biden",
    "politician_id": "biden",
    "tier": 2,
    "has_board": false,
    "has_stances": true,
    "note": "No usable official or campaign page found in the existing roster or source list; source skipped."
  },
  {
    "name": "Kamala Harris",
    "politician_id": "kamala_harris",
    "tier": 3,
    "has_board": false,
    "has_stances": false,
    "note": "No usable official or campaign page found in the existing roster or source list; source skipped."
  },
  {
    "name": "Hakeem Jeffries",
    "politician_id": "jeffries",
    "tier": 1,
    "has_board": true,
    "has_stances": true,
    "note": "Page source retired 2026-11-14: https://www.democraticleader.house.gov failed 3+ pulls in a row (see raw-ingest-retired.mjs)."
  },
  {
    "name": "Chuck Schumer",
    "politician_id": "schumer",
    "tier": 1,
    "has_board": true,
    "has_stances": true,
    "page": {
      "url": "https://www.democrats.senate.gov/newsroom/press-releases/majority-leader-schumer-remarks-on-marriage-equality-legislation",
      "source_type": "official page",
      "known_from": "politician-stances.js"
    }
  },
  {
    "name": "Mike Johnson",
    "politician_id": "mike_johnson",
    "tier": 1,
    "has_board": true,
    "has_stances": true,
    "page": {
      "url": "https://mikejohnson.house.gov",
      "source_type": "official homepage",
      "known_from": "politician-stances.js"
    }
  },
  {
    "name": "Bernie Sanders",
    "politician_id": "sanders",
    "tier": 1,
    "has_board": true,
    "has_stances": true,
    "page": {
      "url": "https://www.sanders.senate.gov",
      "source_type": "official homepage",
      "known_from": "politician-stances.js"
    }
  },
  {
    "name": "Alexandria Ocasio-Cortez",
    "politician_id": "aoc",
    "tier": 1,
    "has_board": true,
    "has_stances": true,
    "page": {
      "url": "https://ocasio-cortez.house.gov",
      "source_type": "official homepage",
      "known_from": "politician-stances.js"
    }
  },
  {
    "name": "Nancy Pelosi",
    "politician_id": "nancy_pelosi",
    "tier": 2,
    "has_board": true,
    "has_stances": false,
    "note": "No usable official or campaign page found in the existing roster or source list; source skipped."
  },
  {
    "name": "Ted Cruz",
    "politician_id": "cruz",
    "tier": 1,
    "has_board": true,
    "has_stances": true,
    "page": {
      "url": "https://www.cruz.senate.gov",
      "source_type": "official homepage",
      "known_from": "politician-stances.js"
    }
  },
  {
    "name": "Elizabeth Warren",
    "politician_id": "warren",
    "tier": 2,
    "has_board": true,
    "has_stances": true,
    "page": {
      "url": "https://www.warren.senate.gov",
      "source_type": "official homepage",
      "known_from": "politician-stances.js"
    }
  },
  {
    "name": "Thomas Massie",
    "politician_id": "massie",
    "tier": 2,
    "has_board": false,
    "has_stances": true,
    "page": {
      "url": "https://massie.house.gov",
      "source_type": "official homepage",
      "known_from": "politician-stances.js"
    }
  },
  {
    "name": "Ilhan Omar",
    "politician_id": "omar",
    "tier": 1,
    "has_board": true,
    "has_stances": true,
    "page": {
      "url": "https://omar.house.gov/media/press-releases",
      "source_type": "official page",
      "known_from": "politician-stances.js"
    }
  },
  {
    "name": "Gavin Newsom",
    "politician_id": "gavin_newsom",
    "tier": 1,
    "has_board": true,
    "has_stances": true,
    "page": {
      "url": "https://www.gov.ca.gov",
      "source_type": "official homepage",
      "known_from": "politician-stances.js"
    }
  },
  {
    "name": "Greg Abbott",
    "politician_id": "greg_abbott",
    "tier": 1,
    "has_board": true,
    "has_stances": true,
    "page": {
      "url": "https://gov.texas.gov/news",
      "source_type": "official page",
      "known_from": "politician-stances.js"
    }
  },
  {
    "name": "Ron DeSantis",
    "politician_id": "ron_desantis",
    "tier": 1,
    "has_board": true,
    "has_stances": true,
    "page": {
      "url": "https://www.flgov.com/eog/news",
      "source_type": "campaign homepage or existing page",
      "known_from": "politician-stances.js"
    }
  },
  {
    "name": "Marco Rubio",
    "politician_id": "rubio",
    "tier": 2,
    "has_board": false,
    "has_stances": true,
    "note": "Page source retired 2026-11-14: https://www.state.gov failed 3+ pulls in a row (see raw-ingest-retired.mjs)."
  },
  {
    "name": "Pete Hegseth",
    "politician_id": "hegseth",
    "tier": 2,
    "has_board": false,
    "has_stances": true,
    "note": "Page source retired 2026-11-14: https://www.defense.gov failed 3+ pulls in a row (see raw-ingest-retired.mjs)."
  },
  {
    "name": "Zohran Mamdani",
    "politician_id": "zohran_mamdani",
    "tier": 2,
    "has_board": false,
    "has_stances": true,
    "page": {
      "url": "https://www.nyc.gov/office-of-the-mayor/news.page",
      "source_type": "official page",
      "known_from": "politician-stances.js"
    }
  },
  {
    "name": "John Thune",
    "politician_id": "thune",
    "tier": 1,
    "has_board": true,
    "has_stances": true,
    "page": {
      "url": "https://www.thune.senate.gov",
      "source_type": "official homepage",
      "known_from": "politician-stances.js"
    }
  },
  {
    "name": "Steve Scalise",
    "politician_id": "scalise",
    "tier": 1,
    "has_board": true,
    "has_stances": true,
    "page": {
      "url": "https://scalise.house.gov/press-releases/Scalise-Response-to-NSM-20-Report",
      "source_type": "official page",
      "known_from": "politician-stances.js"
    }
  },
  {
    "name": "Jim Jordan",
    "politician_id": "jim_jordan",
    "tier": 1,
    "has_board": true,
    "has_stances": true,
    "page": {
      "url": "https://cammack.house.gov/media/press-releases/congresswoman-cammack-introduces-reins-act-limit-executive-overreach",
      "source_type": "official page",
      "known_from": "politician-stances.js"
    }
  },
  {
    "name": "Mitch McConnell",
    "politician_id": "mcconnell",
    "tier": 1,
    "has_board": true,
    "has_stances": true,
    "page": {
      "url": "https://www.mcconnell.senate.gov/public/index.cfm/pressreleases",
      "source_type": "official page",
      "known_from": "politician-stances.js"
    }
  },
  {
    "name": "Chris Van Hollen",
    "politician_id": "van_hollen",
    "tier": 1,
    "has_board": true,
    "has_stances": true,
    "page": {
      "url": "https://www.vanhollen.senate.gov/news/press-releases",
      "source_type": "official page",
      "known_from": "politician-stances.js"
    }
  },
  {
    "name": "Mark Kelly",
    "politician_id": "mark_kelly",
    "tier": 1,
    "has_board": true,
    "has_stances": true,
    "page": {
      "url": "https://www.kelly.senate.gov/news/press-releases/",
      "source_type": "official page",
      "known_from": "politician-stances.js"
    }
  },
  {
    "name": "Jon Ossoff",
    "politician_id": "jon_ossoff",
    "tier": 1,
    "has_board": true,
    "has_stances": true,
    "page": {
      "url": "https://www.ossoff.senate.gov/press-releases/sen-ossoff-statement-on-jrd-votes/",
      "source_type": "official page",
      "known_from": "politician-stances.js"
    }
  },
  {
    "name": "Raphael Warnock",
    "politician_id": "warnock",
    "tier": 1,
    "has_board": true,
    "has_stances": true,
    "page": {
      "url": "https://www.warnock.senate.gov/newsroom/press-releases/",
      "source_type": "official page",
      "known_from": "politician-stances.js"
    }
  },
  {
    "name": "Susan Collins",
    "politician_id": "collins",
    "tier": 1,
    "has_board": true,
    "has_stances": true,
    "page": {
      "url": "https://www.collins.senate.gov",
      "source_type": "official homepage",
      "known_from": "politician-stances.js"
    }
  },
  {
    "name": "John Cornyn",
    "politician_id": "john_cornyn",
    "tier": 1,
    "has_board": true,
    "has_stances": true,
    "page": {
      "url": "https://www.cornyn.senate.gov/issues/the-war-in-israel/",
      "source_type": "official page",
      "known_from": "politician-stances.js"
    }
  },
  {
    "name": "Mike Lee",
    "politician_id": "lee",
    "tier": 1,
    "has_board": true,
    "has_stances": true,
    "page": {
      "url": "https://www.lee.senate.gov",
      "source_type": "official homepage",
      "known_from": "politician-stances.js"
    }
  },
  {
    "name": "Byron Donalds",
    "politician_id": "donalds",
    "tier": 1,
    "has_board": true,
    "has_stances": true,
    "note": "Page source retired 2026-11-14: https://donalds.house.gov/media/press-releases failed 3+ pulls in a row (see raw-ingest-retired.mjs)."
  },
  {
    "name": "Nancy Mace",
    "politician_id": "nancy_mace",
    "tier": 1,
    "has_board": true,
    "has_stances": true,
    "page": {
      "url": "https://mace.house.gov/media/press-releases",
      "source_type": "official page",
      "known_from": "politician-stances.js"
    }
  },
  {
    "name": "James Talarico",
    "politician_id": "james_talarico",
    "tier": 2,
    "has_board": false,
    "has_stances": true,
    "page": {
      "url": "https://jamestalarico.com/issues/",
      "source_type": "campaign issues page",
      "known_from": "netlify/lib/raw-ingest-core.mjs"
    }
  },
  {
    "name": "Abdul El-Sayed",
    "politician_id": "abdul_el_sayed",
    "tier": 2,
    "has_board": false,
    "has_stances": true,
    "note": "No usable official or campaign page found in the existing roster or source list; source skipped."
  },
  {
    "name": "Ken Paxton",
    "politician_id": "ken_paxton",
    "tier": 2,
    "has_board": false,
    "has_stances": true,
    "page": {
      "url": "https://www.kenpaxton.com/issues",
      "source_type": "campaign issues page",
      "known_from": "netlify/lib/raw-ingest-core.mjs"
    }
  },
  {
    "name": "Kristi Noem",
    "politician_id": "noem",
    "tier": 2,
    "has_board": false,
    "has_stances": true,
    "page": {
      "url": "https://www.dhs.gov",
      "source_type": "official homepage",
      "known_from": "politician-stances.js"
    }
  },
  {
    "name": "Lindsey Graham",
    "politician_id": "graham",
    "tier": 1,
    "has_board": true,
    "has_stances": true,
    "note": "Page source retired 2026-11-14: https://www.lgraham.senate.gov failed 3+ pulls in a row (see raw-ingest-retired.mjs)."
  },
  {
    "name": "Tim Scott",
    "politician_id": "tim_scott",
    "tier": 1,
    "has_board": true,
    "has_stances": true,
    "page": {
      "url": "https://www.scott.senate.gov/media-center/press-releases",
      "source_type": "official page",
      "known_from": "politician-stances.js"
    }
  },
  {
    "name": "Rick Scott",
    "politician_id": "rick_scott",
    "tier": 1,
    "has_board": true,
    "has_stances": true,
    "note": "Page source retired 2026-11-14: https://www.rickscott.senate.gov/newsroom/press-releases failed 3+ pulls in a row (see raw-ingest-retired.mjs)."
  },
  {
    "name": "Marjorie Taylor Greene",
    "politician_id": "mtg",
    "tier": 2,
    "has_board": false,
    "has_stances": true,
    "note": "No usable official or campaign page found in the existing roster or source list; source skipped."
  },
  {
    "name": "Lauren Boebert",
    "politician_id": "boebert",
    "tier": 1,
    "has_board": true,
    "has_stances": true,
    "page": {
      "url": "https://boebert.house.gov",
      "source_type": "official homepage",
      "known_from": "politician-stances.js"
    }
  },
  {
    "name": "Ayanna Pressley",
    "politician_id": "ayanna_pressley",
    "tier": 1,
    "has_board": true,
    "has_stances": true,
    "note": "Page source retired 2026-11-14: https://pressley.house.gov/media/press-releases/ failed 3+ pulls in a row (see raw-ingest-retired.mjs)."
  },
  {
    "name": "Rashida Tlaib",
    "politician_id": "tlaib",
    "tier": 1,
    "has_board": true,
    "has_stances": true,
    "page": {
      "url": "https://tlaib.house.gov",
      "source_type": "official homepage",
      "known_from": "politician-stances.js"
    }
  },
  {
    "name": "Katie Porter",
    "politician_id": "katie_porter",
    "tier": 3,
    "has_board": false,
    "has_stances": false,
    "note": "No usable official or campaign page found in the existing roster or source list; source skipped."
  },
  {
    "name": "Ro Khanna",
    "politician_id": "khanna",
    "tier": 1,
    "has_board": true,
    "has_stances": true,
    "page": {
      "url": "https://khanna.house.gov",
      "source_type": "official homepage",
      "known_from": "politician-stances.js"
    }
  },
  {
    "name": "Pramila Jayapal",
    "politician_id": "jayapal",
    "tier": 1,
    "has_board": true,
    "has_stances": true,
    "page": {
      "url": "https://jayapal.house.gov/",
      "source_type": "official homepage",
      "known_from": "politician-stances.js"
    }
  },
  {
    "name": "Amy Klobuchar",
    "politician_id": "klobuchar",
    "tier": 2,
    "has_board": true,
    "has_stances": true,
    "page": {
      "url": "https://www.klobuchar.senate.gov/public/index.cfm/news-releases",
      "source_type": "official page",
      "known_from": "politician-stances.js"
    }
  },
  {
    "name": "Cory Booker",
    "politician_id": "booker",
    "tier": 1,
    "has_board": true,
    "has_stances": true,
    "page": {
      "url": "https://www.booker.senate.gov",
      "source_type": "official homepage",
      "known_from": "politician-stances.js"
    }
  },
  {
    "name": "Chris Murphy",
    "politician_id": "chris_murphy",
    "tier": 1,
    "has_board": true,
    "has_stances": true,
    "page": {
      "url": "https://www.murphy.senate.gov/newsroom/press-releases",
      "source_type": "official page",
      "known_from": "politician-stances.js"
    }
  },
  {
    "name": "Sheldon Whitehouse",
    "politician_id": "whitehouse",
    "tier": 1,
    "has_board": true,
    "has_stances": true,
    "page": {
      "url": "https://www.whitehouse.senate.gov/news/release/",
      "source_type": "official page",
      "known_from": "politician-stances.js"
    }
  },
  {
    "name": "Thom Tillis",
    "politician_id": "tillis",
    "tier": 1,
    "has_board": true,
    "has_stances": true,
    "page": {
      "url": "https://www.tillis.senate.gov/press-releases",
      "source_type": "official page",
      "known_from": "politician-stances.js"
    }
  },
  {
    "name": "Josh Hawley",
    "politician_id": "hawley",
    "tier": 2,
    "has_board": true,
    "has_stances": true,
    "page": {
      "url": "https://www.hawley.senate.gov",
      "source_type": "official homepage",
      "known_from": "politician-stances.js"
    }
  },
  {
    "name": "Marsha Blackburn",
    "politician_id": "blackburn",
    "tier": 1,
    "has_board": true,
    "has_stances": true,
    "page": {
      "url": "https://www.blackburn.senate.gov",
      "source_type": "official homepage",
      "known_from": "politician-stances.js"
    }
  },
  {
    "name": "Tommy Tuberville",
    "politician_id": "tommy_tuberville",
    "tier": 1,
    "has_board": true,
    "has_stances": true,
    "page": {
      "url": "https://www.tuberville.senate.gov/newsroom/press-releases/",
      "source_type": "official page",
      "known_from": "politician-stances.js"
    }
  },
  {
    "name": "Gretchen Whitmer",
    "politician_id": "gretchen_whitmer",
    "tier": 1,
    "has_board": true,
    "has_stances": true,
    "note": "Page source retired 2026-11-14: https://www.michigan.gov/whitmer/news failed 3+ pulls in a row (see raw-ingest-retired.mjs)."
  },
  {
    "name": "Josh Shapiro",
    "politician_id": "josh_shapiro",
    "tier": 1,
    "has_board": true,
    "has_stances": true,
    "page": {
      "url": "https://www.pa.gov/governor/newsroom.html",
      "source_type": "official page",
      "known_from": "politician-stances.js"
    }
  },
  {
    "name": "Wes Moore",
    "politician_id": "wes_moore",
    "tier": 2,
    "has_board": true,
    "has_stances": true,
    "page": {
      "url": "https://governor.maryland.gov/news/",
      "source_type": "official page",
      "known_from": "politician-stances.js"
    }
  },
  {
    "name": "Brian Kemp",
    "politician_id": "brian_kemp",
    "tier": 1,
    "has_board": true,
    "has_stances": true,
    "page": {
      "url": "https://gov.georgia.gov/press-releases",
      "source_type": "official page",
      "known_from": "politician-stances.js"
    }
  },
  {
    "name": "Glenn Youngkin",
    "politician_id": "glenn_youngkin",
    "tier": 2,
    "has_board": false,
    "has_stances": true,
    "page": {
      "url": "https://www.governor.virginia.gov/newsroom/",
      "source_type": "official page",
      "known_from": "politician-stances.js"
    }
  },
  {
    "name": "Adam Schiff",
    "politician_id": "schiff",
    "tier": 1,
    "has_board": true,
    "has_stances": true,
    "page": {
      "url": "https://www.schiff.senate.gov/news/press-releases/",
      "source_type": "official page",
      "known_from": "politician-stances.js"
    }
  },
  {
    "name": "Eric Swalwell",
    "politician_id": "eric_swalwell",
    "tier": 3,
    "has_board": false,
    "has_stances": false,
    "note": "No usable official or campaign page found in the existing roster or source list; source skipped."
  },
  {
    "name": "Maxine Waters",
    "politician_id": "maxine_waters",
    "tier": 1,
    "has_board": true,
    "has_stances": true,
    "note": "Page source retired 2026-11-14: https://waters.house.gov/media/press-releases failed 3+ pulls in a row (see raw-ingest-retired.mjs)."
  },
  {
    "name": "Cori Bush",
    "politician_id": "cori_bush",
    "tier": 3,
    "has_board": false,
    "has_stances": false,
    "note": "No usable official or campaign page found in the existing roster or source list; source skipped."
  },
  {
    "name": "Jamaal Bowman",
    "politician_id": "jamaal_bowman",
    "tier": 3,
    "has_board": false,
    "has_stances": false,
    "note": "No usable official or campaign page found in the existing roster or source list; source skipped."
  },
  {
    "name": "Stephen Miller",
    "politician_id": "stephen_miller",
    "tier": 2,
    "has_board": false,
    "has_stances": true,
    "page": {
      "url": "https://www.whitehouse.gov/administration/",
      "source_type": "official page",
      "known_from": "politician-stances.js"
    }
  },
  {
    "name": "Jared Kushner",
    "politician_id": "jared_kushner",
    "tier": 3,
    "has_board": false,
    "has_stances": false,
    "note": "No usable official or campaign page found in the existing roster or source list; source skipped."
  },
  {
    "name": "Elon Musk",
    "politician_id": "elon_musk",
    "tier": 3,
    "has_board": false,
    "has_stances": false,
    "note": "No usable official or campaign page found in the existing roster or source list; source skipped."
  },
  {
    "name": "Pete Buttigieg",
    "politician_id": "pete_buttigieg",
    "tier": 3,
    "has_board": false,
    "has_stances": false,
    "note": "No usable official or campaign page found in the existing roster or source list; source skipped."
  },
  {
    "name": "Nikki Haley",
    "politician_id": "nhaley",
    "tier": 2,
    "has_board": false,
    "has_stances": true,
    "note": "No usable official or campaign page found in the existing roster or source list; source skipped."
  },
  {
    "name": "Vivek Ramaswamy",
    "politician_id": "vivek_ramaswamy",
    "tier": 3,
    "has_board": false,
    "has_stances": false,
    "note": "No usable official or campaign page found in the existing roster or source list; source skipped."
  },
  {
    "name": "Robert F. Kennedy Jr.",
    "politician_id": "rfkjr",
    "tier": 2,
    "has_board": false,
    "has_stances": true,
    "note": "Page source retired 2026-11-14: https://www.hhs.gov failed 3+ pulls in a row (see raw-ingest-retired.mjs)."
  },
  {
    "name": "Tulsi Gabbard",
    "politician_id": "tgabbard",
    "tier": 2,
    "has_board": false,
    "has_stances": true,
    "page": {
      "url": "https://www.dni.gov",
      "source_type": "official homepage",
      "known_from": "politician-stances.js"
    }
  },
  {
    "name": "Bill Cassidy",
    "politician_id": "cassidy",
    "tier": 1,
    "has_board": true,
    "has_stances": true,
    "page": {
      "url": "https://www.cassidy.senate.gov/newsroom/press-releases",
      "source_type": "official page",
      "known_from": "politician-stances.js"
    }
  },
  {
    "name": "John Kennedy",
    "politician_id": "kennedy_john",
    "tier": 1,
    "has_board": true,
    "has_stances": true,
    "page": {
      "url": "https://www.kennedy.senate.gov/public/press-releases",
      "source_type": "official page",
      "known_from": "politician-stances.js"
    }
  },
  {
    "name": "Rand Paul",
    "politician_id": "rand_paul",
    "tier": 1,
    "has_board": true,
    "has_stances": true,
    "page": {
      "url": "https://www.paul.senate.gov",
      "source_type": "official homepage",
      "known_from": "politician-stances.js"
    }
  },
  {
    "name": "Ron Johnson",
    "politician_id": "ron_johnson",
    "tier": 1,
    "has_board": true,
    "has_stances": true,
    "note": "Page source retired 2026-11-14: https://www.ronjohnson.senate.gov/press-releases failed 3+ pulls in a row (see raw-ingest-retired.mjs)."
  },
  {
    "name": "Ted Budd",
    "politician_id": "ted_budd",
    "tier": 2,
    "has_board": true,
    "has_stances": true,
    "page": {
      "url": "https://www.budd.senate.gov/press-releases/",
      "source_type": "official page",
      "known_from": "politician-stances.js"
    }
  },
  {
    "name": "Joni Ernst",
    "politician_id": "ernst",
    "tier": 1,
    "has_board": true,
    "has_stances": true,
    "page": {
      "url": "https://www.ernst.senate.gov/news/press-releases",
      "source_type": "official page",
      "known_from": "politician-stances.js"
    }
  },
  {
    "name": "Deb Fischer",
    "politician_id": "deb_fischer",
    "tier": 1,
    "has_board": true,
    "has_stances": true,
    "page": {
      "url": "https://www.fischer.senate.gov",
      "source_type": "official homepage",
      "known_from": "politician-stances.js"
    }
  },
  {
    "name": "John Hoeven",
    "politician_id": "hoeven",
    "tier": 1,
    "has_board": true,
    "has_stances": true,
    "page": {
      "url": "https://www.hoeven.senate.gov/news/news-releases",
      "source_type": "official page",
      "known_from": "politician-stances.js"
    }
  },
  {
    "name": "Kevin Cramer",
    "politician_id": "kevin_cramer",
    "tier": 2,
    "has_board": true,
    "has_stances": true,
    "page": {
      "url": "https://www.cramer.senate.gov/news/press-releases",
      "source_type": "official page",
      "known_from": "politician-stances.js"
    }
  },
  {
    "name": "Shelley Moore Capito",
    "politician_id": "capito",
    "tier": 1,
    "has_board": true,
    "has_stances": true,
    "page": {
      "url": "https://www.capito.senate.gov/news/press-releases",
      "source_type": "official page",
      "known_from": "politician-stances.js"
    }
  },
  {
    "name": "Cynthia Lummis",
    "politician_id": "lummis",
    "tier": 1,
    "has_board": true,
    "has_stances": true,
    "page": {
      "url": "https://www.lummis.senate.gov",
      "source_type": "official homepage",
      "known_from": "politician-stances.js"
    }
  },
  {
    "name": "Dan Sullivan",
    "politician_id": "dan_sullivan",
    "tier": 2,
    "has_board": true,
    "has_stances": true,
    "page": {
      "url": "https://www.sullivan.senate.gov/newsroom/press-releases",
      "source_type": "official page",
      "known_from": "politician-stances.js"
    }
  },
  {
    "name": "Lisa Murkowski",
    "politician_id": "murkowski",
    "tier": 1,
    "has_board": true,
    "has_stances": true,
    "page": {
      "url": "https://www.murkowski.senate.gov",
      "source_type": "official homepage",
      "known_from": "politician-stances.js"
    }
  },
  {
    "name": "Mitt Romney",
    "politician_id": "mitt_romney",
    "tier": 3,
    "has_board": false,
    "has_stances": false,
    "note": "No usable official or campaign page found in the existing roster or source list; source skipped."
  },
  {
    "name": "Kyrsten Sinema",
    "politician_id": "kyrsten_sinema",
    "tier": 3,
    "has_board": false,
    "has_stances": false,
    "note": "No usable official or campaign page found in the existing roster or source list; source skipped."
  },
  {
    "name": "Joe Manchin",
    "politician_id": "joe_manchin",
    "tier": 3,
    "has_board": false,
    "has_stances": false,
    "note": "No usable official or campaign page found in the existing roster or source list; source skipped."
  },
  {
    "name": "Jon Tester",
    "politician_id": "jon_tester",
    "tier": 3,
    "has_board": false,
    "has_stances": false,
    "note": "No usable official or campaign page found in the existing roster or source list; source skipped."
  },
  {
    "name": "Sherrod Brown",
    "politician_id": "sherrod_brown",
    "tier": 2,
    "has_board": false,
    "has_stances": true,
    "note": "No usable official or campaign page found in the existing roster or source list; source skipped."
  },
  {
    "name": "Bob Casey",
    "politician_id": "bob_casey",
    "tier": 3,
    "has_board": false,
    "has_stances": false,
    "note": "No usable official or campaign page found in the existing roster or source list; source skipped."
  },
  {
    "name": "John Fetterman",
    "politician_id": "fetterman",
    "tier": 1,
    "has_board": true,
    "has_stances": true,
    "page": {
      "url": "https://www.fetterman.senate.gov",
      "source_type": "official homepage",
      "known_from": "politician-stances.js"
    }
  },
  {
    "name": "Bob Menendez",
    "politician_id": "robert_menendez",
    "tier": 2,
    "has_board": true,
    "has_stances": false,
    "note": "No usable official or campaign page found in the existing roster or source list; source skipped."
  },
  {
    "name": "Chris Coons",
    "politician_id": "coons",
    "tier": 1,
    "has_board": true,
    "has_stances": true,
    "page": {
      "url": "https://www.coons.senate.gov/news/press-releases",
      "source_type": "official page",
      "known_from": "politician-stances.js"
    }
  },
  {
    "name": "Tom Carper",
    "politician_id": "tom_carper",
    "tier": 3,
    "has_board": false,
    "has_stances": false,
    "note": "No usable official or campaign page found in the existing roster or source list; source skipped."
  },
  {
    "name": "Dick Durbin",
    "politician_id": "durbin",
    "tier": 1,
    "has_board": true,
    "has_stances": true,
    "page": {
      "url": "https://www.durbin.senate.gov",
      "source_type": "official homepage",
      "known_from": "politician-stances.js"
    }
  },
  {
    "name": "Tammy Duckworth",
    "politician_id": "duckworth",
    "tier": 1,
    "has_board": true,
    "has_stances": true,
    "page": {
      "url": "https://www.duckworth.senate.gov/news/press-releases",
      "source_type": "official page",
      "known_from": "politician-stances.js"
    }
  },
  {
    "name": "Tammy Baldwin",
    "politician_id": "tammy_baldwin",
    "tier": 1,
    "has_board": true,
    "has_stances": true,
    "page": {
      "url": "https://www.baldwin.senate.gov/news/press-releases",
      "source_type": "official page",
      "known_from": "politician-stances.js"
    }
  },
  {
    "name": "Tina Smith",
    "politician_id": "tina_smith",
    "tier": 1,
    "has_board": true,
    "has_stances": true,
    "page": {
      "url": "https://www.smith.senate.gov/category/press-releases/",
      "source_type": "official page",
      "known_from": "politician-stances.js"
    }
  },
  {
    "name": "Gary Peters",
    "politician_id": "peters",
    "tier": 1,
    "has_board": true,
    "has_stances": true,
    "page": {
      "url": "https://www.peters.senate.gov/newsroom/press-releases",
      "source_type": "official page",
      "known_from": "politician-stances.js"
    }
  },
  {
    "name": "Debbie Stabenow",
    "politician_id": "debbie_stabenow",
    "tier": 3,
    "has_board": false,
    "has_stances": false,
    "note": "No usable official or campaign page found in the existing roster or source list; source skipped."
  },
  {
    "name": "Kirsten Gillibrand",
    "politician_id": "gillibrand",
    "tier": 1,
    "has_board": true,
    "has_stances": true,
    "note": "Page source retired 2026-11-14: https://www.gillibrand.senate.gov/news/press/ failed 3+ pulls in a row (see raw-ingest-retired.mjs)."
  },
  {
    "name": "Chuck Grassley",
    "politician_id": "grassley",
    "tier": 1,
    "has_board": true,
    "has_stances": true,
    "page": {
      "url": "https://www.grassley.senate.gov",
      "source_type": "official homepage",
      "known_from": "politician-stances.js"
    }
  }
];
