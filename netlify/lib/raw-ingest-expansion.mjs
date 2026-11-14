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
  },
  // ── Next 200 high-visibility + 2026 winners (added 2026-11-14): only names not already in the roster ──
  {
    "name": "Angela Alsobrooks",
    "politician_id": "alsobrooks",
    "tier": 2,
    "has_board": true,
    "has_stances": true,
    "page": {
      "url": "https://www.alsobrooks.senate.gov/news/press-releases",
      "source_type": "official page",
      "known_from": "politician-stances.js"
    }
  },
  {
    "name": "Jon Husted",
    "politician_id": "jon_husted",
    "tier": 1,
    "has_board": true,
    "has_stances": true,
    "note": "No usable official or campaign page found in the existing roster or source list; source skipped."
  },
  {
    "name": "Ron Wyden",
    "politician_id": "wyden",
    "tier": 1,
    "has_board": true,
    "has_stances": true,
    "page": {
      "url": "https://www.wyden.senate.gov/news/press-releases",
      "source_type": "official page",
      "known_from": "politician-stances.js"
    }
  },
  {
    "name": "Roger Wicker",
    "politician_id": "wicker",
    "tier": 1,
    "has_board": true,
    "has_stances": true,
    "page": {
      "url": "https://www.wicker.senate.gov/news/press-releases",
      "source_type": "official page",
      "known_from": "politician-stances.js"
    }
  },
  {
    "name": "Cindy Hyde-Smith",
    "politician_id": "hyde_smith",
    "tier": 2,
    "has_board": true,
    "has_stances": false,
    "note": "No usable official or campaign page found in the existing roster or source list; source skipped."
  },
  {
    "name": "Josh Gottheimer",
    "politician_id": "josh_gottheimer",
    "tier": 1,
    "has_board": true,
    "has_stances": true,
    "page": {
      "url": "https://gottheimer.house.gov/posts/release-gottheimer-announces-new-federal-bipartisan-actions-to-protect-ballot-boxes",
      "source_type": "official page",
      "known_from": "politician-stances.js"
    }
  },
  {
    "name": "Summer Lee",
    "politician_id": "summer_lee",
    "tier": 2,
    "has_board": true,
    "has_stances": true,
    "note": "Known official pages failed a reachability check on 2026-11-14 (HTTP 403/404 or no response); source skipped. Re-check before adding a page."
  },
  {
    "name": "Maxwell Frost",
    "politician_id": "maxwell_frost",
    "tier": 2,
    "has_board": true,
    "has_stances": true,
    "page": {
      "url": "https://frost.house.gov/media/press-releases",
      "source_type": "official page",
      "known_from": "politician-stances.js"
    }
  },
  {
    "name": "Matt Gaetz",
    "politician_id": "gaetz",
    "tier": 2,
    "has_board": false,
    "has_stances": true,
    "note": "Known official pages failed a reachability check on 2026-11-14 (HTTP 403/404 or no response); source skipped. Re-check before adding a page."
  },
  {
    "name": "Elise Stefanik",
    "politician_id": "stefanik",
    "tier": 1,
    "has_board": true,
    "has_stances": true,
    "page": {
      "url": "https://stefanik.house.gov/2025/4/stefanik-votes-to-pass-the-safeguard-american-voter-eligibility-act",
      "source_type": "official page",
      "known_from": "politician-stances.js"
    }
  },
  {
    "name": "Tom Emmer",
    "politician_id": "emmer",
    "tier": 1,
    "has_board": true,
    "has_stances": true,
    "page": {
      "url": "https://emmer.house.gov/media-center/press-releases/emmer-statement-on-passage-of-hr-1",
      "source_type": "official page",
      "known_from": "politician-stances.js"
    }
  },
  {
    "name": "Michael McCaul",
    "politician_id": "michael_mccaul",
    "tier": 2,
    "has_board": true,
    "has_stances": false,
    "note": "No usable official or campaign page found in the existing roster or source list; source skipped."
  },
  {
    "name": "Katie Britt",
    "politician_id": "britt",
    "tier": 1,
    "has_board": true,
    "has_stances": true,
    "page": {
      "url": "https://www.britt.senate.gov/news/",
      "source_type": "official page",
      "known_from": "politician-stances.js"
    }
  },
  {
    "name": "Pete Ricketts",
    "politician_id": "ricketts",
    "tier": 1,
    "has_board": true,
    "has_stances": true,
    "page": {
      "url": "https://www.ricketts.senate.gov/news/press-releases/",
      "source_type": "official page",
      "known_from": "politician-stances.js"
    }
  },
  {
    "name": "Elissa Slotkin",
    "politician_id": "slotkin",
    "tier": 1,
    "has_board": true,
    "has_stances": true,
    "page": {
      "url": "https://www.slotkin.senate.gov/",
      "source_type": "official homepage",
      "known_from": "politician-stances.js"
    }
  },
  {
    "name": "Bernie Moreno",
    "politician_id": "moreno",
    "tier": 1,
    "has_board": true,
    "has_stances": true,
    "page": {
      "url": "https://www.moreno.senate.gov/press-releases/",
      "source_type": "official page",
      "known_from": "politician-stances.js"
    }
  },
  {
    "name": "Steve Daines",
    "politician_id": "daines",
    "tier": 2,
    "has_board": true,
    "has_stances": true,
    "page": {
      "url": "https://www.daines.senate.gov/news/press-releases",
      "source_type": "official page",
      "known_from": "politician-stances.js"
    }
  },
  {
    "name": "John Barrasso",
    "politician_id": "barrasso",
    "tier": 1,
    "has_board": true,
    "has_stances": true,
    "page": {
      "url": "https://www.barrasso.senate.gov",
      "source_type": "official homepage",
      "known_from": "politician-stances.js"
    }
  },
  {
    "name": "Jim Justice",
    "politician_id": "jim_justice",
    "tier": 1,
    "has_board": true,
    "has_stances": true,
    "page": {
      "url": "https://www.justice.senate.gov/press-releases/",
      "source_type": "official page",
      "known_from": "politician-stances.js"
    }
  },
  {
    "name": "Mark Warner",
    "politician_id": "warner",
    "tier": 1,
    "has_board": true,
    "has_stances": true,
    "page": {
      "url": "https://www.warner.senate.gov/public/index.cfm/pressreleases",
      "source_type": "official page",
      "known_from": "politician-stances.js"
    }
  },
  {
    "name": "Tim Kaine",
    "politician_id": "kaine",
    "tier": 1,
    "has_board": true,
    "has_stances": true,
    "note": "Known official pages failed a reachability check on 2026-11-14 (HTTP 403/404 or no response); source skipped. Re-check before adding a page."
  },
  {
    "name": "Richard Blumenthal",
    "politician_id": "blumenthal",
    "tier": 2,
    "has_board": true,
    "has_stances": true,
    "page": {
      "url": "https://www.blumenthal.senate.gov/newsroom/press",
      "source_type": "official page",
      "known_from": "politician-stances.js"
    }
  },
  {
    "name": "Jeanne Shaheen",
    "politician_id": "shaheen",
    "tier": 2,
    "has_board": true,
    "has_stances": true,
    "page": {
      "url": "https://www.shaheen.senate.gov/news/press/icymi-shaheen-and-budd-pen-wall-street-journal-op-ed-underscoring-need-for-senators-bipartisan-three-bill-package-to-enhance-american-airpower-boost-defense-industrial-base",
      "source_type": "official page",
      "known_from": "politician-stances.js"
    }
  },
  {
    "name": "Maggie Hassan",
    "politician_id": "maggie_hassan",
    "tier": 1,
    "has_board": true,
    "has_stances": true,
    "page": {
      "url": "https://www.hassan.senate.gov/news/press-releases",
      "source_type": "official page",
      "known_from": "politician-stances.js"
    }
  },
  {
    "name": "Angus King",
    "politician_id": "angus_king",
    "tier": 1,
    "has_board": true,
    "has_stances": true,
    "page": {
      "url": "https://www.king.senate.gov/newsroom/press-releases",
      "source_type": "official page",
      "known_from": "politician-stances.js"
    }
  },
  {
    "name": "Ed Markey",
    "politician_id": "markey",
    "tier": 1,
    "has_board": true,
    "has_stances": true,
    "page": {
      "url": "https://www.markey.senate.gov",
      "source_type": "official homepage",
      "known_from": "politician-stances.js"
    }
  },
  {
    "name": "Jack Reed",
    "politician_id": "reed",
    "tier": 1,
    "has_board": true,
    "has_stances": true,
    "page": {
      "url": "https://www.reed.senate.gov/news/releases",
      "source_type": "official page",
      "known_from": "politician-stances.js"
    }
  },
  {
    "name": "Peter Welch",
    "politician_id": "welch",
    "tier": 2,
    "has_board": true,
    "has_stances": true,
    "note": "Known official pages failed a reachability check on 2026-11-14 (HTTP 403/404 or no response); source skipped. Re-check before adding a page."
  },
  {
    "name": "Lisa Blunt Rochester",
    "politician_id": "blunt_rochester",
    "tier": 2,
    "has_board": true,
    "has_stances": true,
    "page": {
      "url": "https://www.bluntrochester.senate.gov/news/press-releases",
      "source_type": "official page",
      "known_from": "politician-stances.js"
    }
  },
  {
    "name": "Brian Schatz",
    "politician_id": "schatz",
    "tier": 1,
    "has_board": true,
    "has_stances": true,
    "page": {
      "url": "https://www.schatz.senate.gov/news/press-releases",
      "source_type": "official page",
      "known_from": "politician-stances.js"
    }
  },
  {
    "name": "Mazie Hirono",
    "politician_id": "hirono",
    "tier": 1,
    "has_board": true,
    "has_stances": true,
    "page": {
      "url": "https://www.hirono.senate.gov/news/press-releases",
      "source_type": "official page",
      "known_from": "politician-stances.js"
    }
  },
  {
    "name": "Catherine Cortez Masto",
    "politician_id": "cortez_masto",
    "tier": 1,
    "has_board": true,
    "has_stances": true,
    "page": {
      "url": "https://www.cortezmasto.senate.gov/news/press-releases/",
      "source_type": "official page",
      "known_from": "politician-stances.js"
    }
  },
  {
    "name": "Jacky Rosen",
    "politician_id": "rosen",
    "tier": 2,
    "has_board": true,
    "has_stances": true,
    "page": {
      "url": "https://www.rosen.senate.gov/category/press-releases/",
      "source_type": "official page",
      "known_from": "politician-stances.js"
    }
  },
  {
    "name": "Alex Padilla",
    "politician_id": "padilla",
    "tier": 1,
    "has_board": true,
    "has_stances": true,
    "page": {
      "url": "https://www.padilla.senate.gov/newsroom/press-releases/",
      "source_type": "official page",
      "known_from": "politician-stances.js"
    }
  },
  {
    "name": "Patty Murray",
    "politician_id": "murray",
    "tier": 1,
    "has_board": true,
    "has_stances": true,
    "page": {
      "url": "https://www.murray.senate.gov/category/press-releases/",
      "source_type": "official page",
      "known_from": "politician-stances.js"
    }
  },
  {
    "name": "Maria Cantwell",
    "politician_id": "cantwell",
    "tier": 1,
    "has_board": true,
    "has_stances": true,
    "page": {
      "url": "https://www.cantwell.senate.gov/news/press-releases",
      "source_type": "official page",
      "known_from": "politician-stances.js"
    }
  },
  {
    "name": "Jeff Merkley",
    "politician_id": "merkley",
    "tier": 1,
    "has_board": true,
    "has_stances": true,
    "page": {
      "url": "https://www.merkley.senate.gov/news/press-releases/",
      "source_type": "official page",
      "known_from": "politician-stances.js"
    }
  },
  {
    "name": "Todd Young",
    "politician_id": "todd_young",
    "tier": 1,
    "has_board": true,
    "has_stances": true,
    "page": {
      "url": "https://www.young.senate.gov/newsroom/press-releases/",
      "source_type": "official page",
      "known_from": "politician-stances.js"
    }
  },
  {
    "name": "Mike Braun",
    "politician_id": "mike_braun",
    "tier": 2,
    "has_board": false,
    "has_stances": true,
    "page": {
      "url": "https://www.in.gov/gov/newsroom/",
      "source_type": "official page",
      "known_from": "politician-stances.js"
    }
  },
  {
    "name": "Eric Schmitt",
    "politician_id": "schmitt",
    "tier": 1,
    "has_board": true,
    "has_stances": true,
    "page": {
      "url": "https://www.schmitt.senate.gov/media/press-releases/",
      "source_type": "official page",
      "known_from": "politician-stances.js"
    }
  },
  {
    "name": "John Boozman",
    "politician_id": "boozman",
    "tier": 1,
    "has_board": true,
    "has_stances": true,
    "page": {
      "url": "https://www.boozman.senate.gov/public/index.cfm/press-releases",
      "source_type": "official page",
      "known_from": "politician-stances.js"
    }
  },
  {
    "name": "Tom Cotton",
    "politician_id": "cotton",
    "tier": 1,
    "has_board": true,
    "has_stances": true,
    "page": {
      "url": "https://www.cotton.senate.gov/news/press-releases",
      "source_type": "official page",
      "known_from": "politician-stances.js"
    }
  },
  {
    "name": "Mike Rounds",
    "politician_id": "mike_rounds",
    "tier": 1,
    "has_board": true,
    "has_stances": true,
    "page": {
      "url": "https://www.rounds.senate.gov/newsroom/press-releases",
      "source_type": "official page",
      "known_from": "politician-stances.js"
    }
  },
  {
    "name": "JB Pritzker",
    "politician_id": "jb_pritzker",
    "tier": 1,
    "has_board": true,
    "has_stances": true,
    "page": {
      "url": "https://www.illinois.gov/news.html",
      "source_type": "official page",
      "known_from": "politician-stances.js"
    }
  },
  {
    "name": "Kathy Hochul",
    "politician_id": "kathy_hochul",
    "tier": 1,
    "has_board": true,
    "has_stances": true,
    "page": {
      "url": "https://www.governor.ny.gov/news",
      "source_type": "official page",
      "known_from": "politician-stances.js"
    }
  },
  {
    "name": "Josh Stein",
    "politician_id": "josh_stein",
    "tier": 2,
    "has_board": false,
    "has_stances": true,
    "page": {
      "url": "https://governor.nc.gov/news/press-releases",
      "source_type": "official page",
      "known_from": "politician-stances.js"
    }
  },
  {
    "name": "Andy Beshear",
    "politician_id": "andy_beshear",
    "tier": 2,
    "has_board": false,
    "has_stances": true,
    "page": {
      "url": "https://www.kentucky.gov/Pages/Activity-stream.aspx",
      "source_type": "official page",
      "known_from": "politician-stances.js"
    }
  },
  {
    "name": "Roy Cooper",
    "politician_id": "roy_cooper",
    "tier": 2,
    "has_board": false,
    "has_stances": true,
    "note": "No usable official or campaign page found in the existing roster or source list; source skipped."
  },
  {
    "name": "Keisha Lance Bottoms",
    "politician_id": "keisha_bottoms",
    "tier": 3,
    "has_board": false,
    "has_stances": false,
    "note": "No usable official or campaign page found in the existing roster or source list; source skipped."
  },
  {
    "name": "Deb Haaland",
    "politician_id": "deb_haaland",
    "tier": 3,
    "has_board": false,
    "has_stances": false,
    "note": "No usable official or campaign page found in the existing roster or source list; source skipped."
  },
  {
    "name": "Jonathan Kreiss-Tomkins",
    "politician_id": "jonathan_tomkins",
    "tier": 3,
    "has_board": false,
    "has_stances": false,
    "note": "No usable official or campaign page found in the existing roster or source list; source skipped."
  },
  {
    "name": "Amy Acton",
    "politician_id": "amy_acton",
    "tier": 3,
    "has_board": false,
    "has_stances": false,
    "note": "No usable official or campaign page found in the existing roster or source list; source skipped."
  },
  {
    "name": "Rob Sand",
    "politician_id": "rob_sand",
    "tier": 3,
    "has_board": false,
    "has_stances": false,
    "note": "No usable official or campaign page found in the existing roster or source list; source skipped."
  },
  {
    "name": "Katie Hobbs",
    "politician_id": "katie_hobbs",
    "tier": 2,
    "has_board": true,
    "has_stances": true,
    "note": "Known official pages failed a reachability check on 2026-11-14 (HTTP 403/404 or no response); source skipped. Re-check before adding a page."
  },
  {
    "name": "Andy Biggs",
    "politician_id": "andy_biggs",
    "tier": 2,
    "has_board": true,
    "has_stances": false,
    "note": "No usable official or campaign page found in the existing roster or source list; source skipped."
  },
  {
    "name": "Sarah Huckabee Sanders",
    "politician_id": "sarah_huckabee_sanders",
    "tier": 2,
    "has_board": true,
    "has_stances": true,
    "page": {
      "url": "https://governor.arkansas.gov/news-media/",
      "source_type": "official page",
      "known_from": "politician-stances.js"
    }
  },
  {
    "name": "Jared Polis",
    "politician_id": "jared_polis",
    "tier": 2,
    "has_board": true,
    "has_stances": true,
    "note": "Known official pages failed a reachability check on 2026-11-14 (HTTP 403/404 or no response); source skipped. Re-check before adding a page."
  },
  {
    "name": "Tina Kotek",
    "politician_id": "tina_kotek",
    "tier": 1,
    "has_board": true,
    "has_stances": true,
    "note": "Known official pages failed a reachability check on 2026-11-14 (HTTP 403/404 or no response); source skipped. Re-check before adding a page."
  },
  {
    "name": "Bob Ferguson",
    "politician_id": "bob_ferguson",
    "tier": 2,
    "has_board": false,
    "has_stances": true,
    "page": {
      "url": "https://governor.wa.gov/news",
      "source_type": "official page",
      "known_from": "politician-stances.js"
    }
  },
  {
    "name": "Maura Healey",
    "politician_id": "maura_healey",
    "tier": 1,
    "has_board": true,
    "has_stances": true,
    "note": "Known official pages failed a reachability check on 2026-11-14 (HTTP 403/404 or no response); source skipped. Re-check before adding a page."
  },
  {
    "name": "Ned Lamont",
    "politician_id": "ned_lamont",
    "tier": 2,
    "has_board": true,
    "has_stances": true,
    "page": {
      "url": "https://portal.ct.gov/governor/news",
      "source_type": "official page",
      "known_from": "politician-stances.js"
    }
  },
  {
    "name": "Dan McKee",
    "politician_id": "dan_mckee",
    "tier": 2,
    "has_board": true,
    "has_stances": true,
    "note": "Known official pages failed a reachability check on 2026-11-14 (HTTP 403/404 or no response); source skipped. Re-check before adding a page."
  },
  {
    "name": "Janet Mills",
    "politician_id": "janet_mills",
    "tier": 2,
    "has_board": true,
    "has_stances": true,
    "note": "Known official pages failed a reachability check on 2026-11-14 (HTTP 403/404 or no response); source skipped. Re-check before adding a page."
  },
  {
    "name": "Phil Scott",
    "politician_id": "phil_scott",
    "tier": 2,
    "has_board": true,
    "has_stances": true,
    "note": "Known official pages failed a reachability check on 2026-11-14 (HTTP 403/404 or no response); source skipped. Re-check before adding a page."
  },
  {
    "name": "Josh Turek",
    "politician_id": "josh_turek",
    "tier": 2,
    "has_board": false,
    "has_stances": true,
    "page": {
      "url": "https://turek4iowa.com/platform/",
      "source_type": "campaign homepage or existing page",
      "known_from": "politician-stances.js"
    }
  },
  {
    "name": "Adam Hamilton",
    "politician_id": "adam_hamilton",
    "tier": 2,
    "has_board": false,
    "has_stances": true,
    "page": {
      "url": "https://hamiltonforkansas.com/issues/",
      "source_type": "campaign homepage or existing page",
      "known_from": "politician-stances.js"
    }
  },
  {
    "name": "Troy Jackson",
    "politician_id": "troy_jackson",
    "tier": 2,
    "has_board": false,
    "has_stances": true,
    "page": {
      "url": "https://www.jacksonformaine.com/priorities",
      "source_type": "campaign homepage or existing page",
      "known_from": "politician-stances.js"
    }
  },
  {
    "name": "Annie Andrews",
    "politician_id": "annie_andrews",
    "tier": 2,
    "has_board": false,
    "has_stances": true,
    "page": {
      "url": "https://drannieandrews.com/issue/healthcare-is-a-right-not-a-privilege/",
      "source_type": "campaign homepage or existing page",
      "known_from": "politician-stances.js"
    }
  },
  {
    "name": "Scott Colom",
    "politician_id": "scott_colom",
    "tier": 3,
    "has_board": false,
    "has_stances": false,
    "note": "No usable official or campaign page found in the existing roster or source list; source skipped."
  },
  {
    "name": "Mary Peltola",
    "politician_id": "mary_peltola",
    "tier": 3,
    "has_board": false,
    "has_stances": false,
    "note": "No usable official or campaign page found in the existing roster or source list; source skipped."
  },
  {
    "name": "Juliana Stratton",
    "politician_id": "juliana_stratton",
    "tier": 2,
    "has_board": false,
    "has_stances": true,
    "page": {
      "url": "https://www.julianastratton.com/issues",
      "source_type": "campaign homepage or existing page",
      "known_from": "politician-stances.js"
    }
  },
  {
    "name": "Peggy Flanagan",
    "politician_id": "peggy_flanagan",
    "tier": 2,
    "has_board": false,
    "has_stances": true,
    "note": "No usable official or campaign page found in the existing roster or source list; source skipped."
  },
  {
    "name": "Chris Pappas",
    "politician_id": "chris_pappas",
    "tier": 2,
    "has_board": true,
    "has_stances": false,
    "note": "No usable official or campaign page found in the existing roster or source list; source skipped."
  },
  {
    "name": "Barry Moore",
    "politician_id": "barry_moore",
    "tier": 2,
    "has_board": true,
    "has_stances": false,
    "note": "No usable official or campaign page found in the existing roster or source list; source skipped."
  },
  {
    "name": "Julia Letlow",
    "politician_id": "julia_letlow",
    "tier": 2,
    "has_board": true,
    "has_stances": false,
    "note": "No usable official or campaign page found in the existing roster or source list; source skipped."
  },
  {
    "name": "Andy Barr",
    "politician_id": "andy_barr",
    "tier": 2,
    "has_board": true,
    "has_stances": false,
    "note": "No usable official or campaign page found in the existing roster or source list; source skipped."
  },
  {
    "name": "Ashley Moody",
    "politician_id": "ashley_moody",
    "tier": 2,
    "has_board": true,
    "has_stances": true,
    "page": {
      "url": "https://www.moody.senate.gov/press-releases/",
      "source_type": "official page",
      "known_from": "politician-stances.js"
    }
  },
  {
    "name": "Zach Dembo",
    "politician_id": "zach_dembo",
    "tier": 2,
    "has_board": false,
    "has_stances": true,
    "page": {
      "url": "https://zachdembo.com/priorities/",
      "source_type": "campaign homepage or existing page",
      "known_from": "politician-stances.js"
    }
  },
  {
    "name": "Sean McCann",
    "politician_id": "sean_mccann",
    "tier": 1,
    "has_board": true,
    "has_stances": true,
    "page": {
      "url": "https://seanmccannforcongress.com/issues/",
      "source_type": "campaign homepage or existing page",
      "known_from": "politician-stances.js"
    }
  },
  {
    "name": "William Lawrence",
    "politician_id": "william_lawrence",
    "tier": 2,
    "has_board": false,
    "has_stances": true,
    "note": "No usable official or campaign page found in the existing roster or source list; source skipped."
  },
  {
    "name": "Christina Hines",
    "politician_id": "christina_hines",
    "tier": 2,
    "has_board": false,
    "has_stances": true,
    "page": {
      "url": "https://www.christinahinesforcongress.com/",
      "source_type": "campaign homepage or existing page",
      "known_from": "politician-stances.js"
    }
  },
  {
    "name": "Richard Ojeda",
    "politician_id": "richard_ojeda",
    "tier": 2,
    "has_board": false,
    "has_stances": true,
    "page": {
      "url": "https://ojedafornc.com/ensuring-quality-healthcare/",
      "source_type": "campaign homepage or existing page",
      "known_from": "politician-stances.js"
    }
  },
  {
    "name": "Mitchell Berman",
    "politician_id": "mitchell_berman",
    "tier": 2,
    "has_board": false,
    "has_stances": true,
    "page": {
      "url": "https://www.bermanforcongress.com/priorities",
      "source_type": "campaign homepage or existing page",
      "known_from": "politician-stances.js"
    }
  },
  {
    "name": "Rebecca Cooke",
    "politician_id": "rebecca_cooke",
    "tier": 2,
    "has_board": false,
    "has_stances": true,
    "page": {
      "url": "https://cookeforwisconsin.com/priorities/",
      "source_type": "campaign homepage or existing page",
      "known_from": "politician-stances.js"
    }
  },
  {
    "name": "Stefany Shaheen",
    "politician_id": "stefany_shaheen",
    "tier": 2,
    "has_board": false,
    "has_stances": true,
    "page": {
      "url": "https://stefanyshaheen.com/priorities/",
      "source_type": "campaign homepage or existing page",
      "known_from": "politician-stances.js"
    }
  },
  {
    "name": "Cait Conley",
    "politician_id": "cait_conley",
    "tier": 3,
    "has_board": false,
    "has_stances": false,
    "note": "No usable official or campaign page found in the existing roster or source list; source skipped."
  },
  {
    "name": "Zack Mullock",
    "politician_id": "zack_mullock",
    "tier": 3,
    "has_board": false,
    "has_stances": false,
    "note": "No usable official or campaign page found in the existing roster or source list; source skipped."
  },
  {
    "name": "Nancy Lacore",
    "politician_id": "nancy_lacore",
    "tier": 3,
    "has_board": false,
    "has_stances": false,
    "note": "No usable official or campaign page found in the existing roster or source list; source skipped."
  },
  {
    "name": "JoAnna Mendoza",
    "politician_id": "joanna_mendoza",
    "tier": 3,
    "has_board": false,
    "has_stances": false,
    "note": "No usable official or campaign page found in the existing roster or source list; source skipped."
  },
  {
    "name": "Jessica Killin",
    "politician_id": "jessica_killin",
    "tier": 3,
    "has_board": false,
    "has_stances": false,
    "note": "No usable official or campaign page found in the existing roster or source list; source skipped."
  },
  {
    "name": "Sam Forstag",
    "politician_id": "sam_forstag",
    "tier": 2,
    "has_board": false,
    "has_stances": true,
    "note": "No usable official or campaign page found in the existing roster or source list; source skipped."
  },
  {
    "name": "Ben McAdams",
    "politician_id": "ben_mcadams",
    "tier": 3,
    "has_board": false,
    "has_stances": false,
    "note": "No usable official or campaign page found in the existing roster or source list; source skipped."
  },
  {
    "name": "Bob Brooks",
    "politician_id": "bob_brooks",
    "tier": 2,
    "has_board": false,
    "has_stances": true,
    "note": "No usable official or campaign page found in the existing roster or source list; source skipped."
  },
  {
    "name": "Kristina Knickerbocker",
    "politician_id": "kristina_knickerbocker",
    "tier": 3,
    "has_board": false,
    "has_stances": false,
    "note": "No usable official or campaign page found in the existing roster or source list; source skipped."
  },
  {
    "name": "Melissa Bean",
    "politician_id": "melissa_bean",
    "tier": 3,
    "has_board": false,
    "has_stances": false,
    "note": "No usable official or campaign page found in the existing roster or source list; source skipped."
  },
  {
    "name": "Daniel Biss",
    "politician_id": "daniel_biss",
    "tier": 3,
    "has_board": false,
    "has_stances": false,
    "note": "No usable official or campaign page found in the existing roster or source list; source skipped."
  },
  {
    "name": "Jeremy Moss",
    "politician_id": "jeremy_moss",
    "tier": 2,
    "has_board": true,
    "has_stances": false,
    "note": "No usable official or campaign page found in the existing roster or source list; source skipped."
  },
  {
    "name": "Darializa Avila Chevalier",
    "politician_id": "darializa_chevalier",
    "tier": 3,
    "has_board": false,
    "has_stances": false,
    "note": "No usable official or campaign page found in the existing roster or source list; source skipped."
  },
  {
    "name": "Aaron Ford",
    "politician_id": "aaron_ford",
    "tier": 2,
    "has_board": false,
    "has_stances": true,
    "page": {
      "url": "https://ag.nv.gov/News/Press_Releases/",
      "source_type": "official page",
      "known_from": "politician-stances.js"
    }
  },
  {
    "name": "Xavier Becerra",
    "politician_id": "xavier_becerra",
    "tier": 3,
    "has_board": false,
    "has_stances": false,
    "note": "No usable official or campaign page found in the existing roster or source list; source skipped."
  },
  {
    "name": "Cindy Holscher",
    "politician_id": "cindy_holscher",
    "tier": 3,
    "has_board": false,
    "has_stances": false,
    "note": "No usable official or campaign page found in the existing roster or source list; source skipped."
  },
  {
    "name": "Phil Weiser",
    "politician_id": "phil_weiser",
    "tier": 2,
    "has_board": false,
    "has_stances": true,
    "page": {
      "url": "https://coag.gov/",
      "source_type": "official homepage",
      "known_from": "politician-stances.js"
    }
  },
  {
    "name": "Jocelyn Benson",
    "politician_id": "jocelyn_benson",
    "tier": 2,
    "has_board": false,
    "has_stances": true,
    "page": {
      "url": "https://www.michigan.gov/sos",
      "source_type": "official page",
      "known_from": "politician-stances.js"
    }
  },
  {
    "name": "Jim Pillen",
    "politician_id": "jim_pillen",
    "tier": 2,
    "has_board": true,
    "has_stances": true,
    "page": {
      "url": "https://governor.nebraska.gov/press-releases",
      "source_type": "official page",
      "known_from": "politician-stances.js"
    }
  },
  {
    "name": "David Crowley",
    "politician_id": "david_crowley",
    "tier": 3,
    "has_board": false,
    "has_stances": false,
    "note": "No usable official or campaign page found in the existing roster or source list; source skipped."
  },
  {
    "name": "Helena Foulkes",
    "politician_id": "helena_foulkes",
    "tier": 3,
    "has_board": false,
    "has_stances": false,
    "note": "No usable official or campaign page found in the existing roster or source list; source skipped."
  },
  {
    "name": "Hannah Pingree",
    "politician_id": "hannah_pingree",
    "tier": 3,
    "has_board": false,
    "has_stances": false,
    "note": "No usable official or campaign page found in the existing roster or source list; source skipped."
  },
  {
    "name": "Kelly Ayotte",
    "politician_id": "kelly_ayotte",
    "tier": 1,
    "has_board": true,
    "has_stances": true,
    "note": "Known official pages failed a reachability check on 2026-11-14 (HTTP 403/404 or no response); source skipped. Re-check before adding a page."
  }
];
