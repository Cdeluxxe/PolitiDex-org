// ─────────────────────────────────────────────────────────────────────────────
// raw-ingest-source-types.mjs — extra source types for the raw-ingest rotation
// ─────────────────────────────────────────────────────────────────────────────
// The every-minute rotation used to pull, per politician, the topic pages and
// official pattern configured in raw-ingest-core.mjs (mostly official/campaign
// homepages and newsrooms). This file adds five more SOURCE CLASSES so a run can
// also pull a member's own press releases and issue sections, Congress.gov pages
// tied to the member, state legislature member pages, governor/statewide
// releases, and more campaign Issues/Priorities sub-pages.
//
// RULES every entry below follows:
//   · The page belongs to the politician (their own office site, their own
//     campaign site, their own Congress.gov member page or a measure they are
//     the lead author of) or to an official government body. No URL is built
//     from a pattern or guessed: each one is copied verbatim from a site file
//     (`known_from`), where it is already cited for this politician, and the
//     test suite checks that it is still there.
//   · `topic` is the issue key the site already cites the page for (the raw
//     record key; scoring still reads every topic).
//   · Each was checked as a stable page (2xx, HTML, no off-host or home-page
//     redirect) before it was added; candidates that answered 404, redirected
//     off-site or were blocked were skipped. The Congress.gov entries are the
//     exception — see CONGRESS_GOV below.
//   · Nothing here changes the record shape: each page is pulled by the same
//     pullOne() and goes through the same Locker writer, so the stored raw
//     record and any Locker item keep the locked schema.
//
// Merged into ROSTER by raw-ingest-core.mjs (deduplicated by URL). The planner
// keeps the existing caps (8 politicians / 6 sources each / 36 per run); a
// politician with more pages than their per-run slots rotates through them one
// cycle at a time (see orderPagesForRun in raw-ingest-core.mjs).

export const SOURCE_CLASSES = {
  congress_member: "official congressional member page (house.gov / senate.gov) — press release or issue section",
  congress_gov: "Congress.gov member page or a measure the member is lead author of",
  state_legislature: "state legislature official member page",
  statewide_official: "governor or statewide official site — press release or issue page",
  campaign_issues: "campaign Issues / Priorities sub-page",
};

// State legislators the rotation did not cover yet whose official legislature
// member page is already cited on the site (politician-stances.js). Same row
// shape as ROSTER: tier 2 = stated positions on file, no district board seat.
export const NEW_STATE_LEGISLATORS = [
  { politician_id: "dustin_burrows", name: "Dustin Burrows", tier: 2, has_board: false, has_stances: true },
  { politician_id: "carl_heastie", name: "Carl Heastie", tier: 2, has_board: false, has_stances: true },
  { politician_id: "mike_kohler", name: "Mike Kohler", tier: 2, has_board: false, has_stances: true },
];

// ── Official congressional member pages — press releases + issue sections ──
// Only the member's own house.gov / senate.gov host (the one already in their
// roster row); committee and colleague sites are left out.
export const CONGRESS_MEMBER = [
  { politician_id: "aoc", topic: "cut_spending", source_type: "official House press release",
    url: "https://ocasio-cortez.house.gov/media/press-releases/ocasio-cortez-denounces-republican-funding-bill-house-floor", known_from: "politician-stances.js" },
  { politician_id: "aoc", topic: "econ_corp_account", source_type: "official House press release",
    url: "https://ocasio-cortez.house.gov/media/press-releases/ocasio-cortez-luna-introduce-bill-cap-credit-card-interest-rates-10", known_from: "politician-stances.js" },
  { politician_id: "aoc", topic: "restraint", source_type: "official House press release",
    url: "https://ocasio-cortez.house.gov/media/press-releases/ocasio-cortez-statement-trumps-combat-operations-iran", known_from: "politician-stances.js" },
  { politician_id: "ayanna_pressley", topic: "housing_build", source_type: "official House press release",
    url: "https://pressley.house.gov/2026/01/14/video-pressley-co-chairs-hearing-on-housing-affordability-demands-congress-affirm-housing-as-a-human-right/", known_from: "politician-stances.js" },
  { politician_id: "bmoore", topic: "election_security", source_type: "official House press release",
    url: "https://blakemoore.house.gov/media/press-releases/congressmen-moore-stewart-statement-corporate-responses-georgia-voting-law", known_from: "politician-stances.js" },
  { politician_id: "boebert", topic: "election_security", source_type: "official House issue page",
    url: "https://boebert.house.gov/issues/election-integrity", known_from: "politician-stances.js" },
  { politician_id: "boebert", topic: "gov_regulation", source_type: "official House issue page",
    url: "https://boebert.house.gov/issues/oversight-and-accountability", known_from: "politician-stances.js" },
  { politician_id: "boebert", topic: "gun_safety", source_type: "official House press release",
    url: "https://boebert.house.gov/media/press-releases/rep-boebert-introduces-bill-repeal-rino-gun-grab", known_from: "politician-stances.js" },
  { politician_id: "capito", topic: "permitting_reform", source_type: "official Senate press release",
    url: "https://www.capito.senate.gov/news/press-releases/chairman-capito-delivers-floor-speech-on-need-for-bipartisan-permitting-reform-legislation", known_from: "politician-stances.js" },
  { politician_id: "cassidy", topic: "healthcare_costs", source_type: "official Senate issue page",
    url: "https://www.cassidy.senate.gov/about/issues/lowering-the-cost-of-health-care/", known_from: "politician-stances.js" },
  { politician_id: "chip_roy", topic: "election_security", source_type: "official House issue page",
    url: "https://roy.house.gov/media/press-releases/rep-roy-issues-statement-passage-save-act-0", known_from: "politician-stances.js" },
  { politician_id: "chip_roy", topic: "voting_access", source_type: "official House press release",
    url: "https://roy.house.gov/media/press-releases/roy-and-colleagues-joint-statement-effort-overturn-election-results", known_from: "politician-stances.js" },
  { politician_id: "chris_murphy", topic: "gun_rights", source_type: "official Senate op-ed",
    url: "https://www.murphy.senate.gov/newsroom/in-the-news/in-his-own-words-senator-murphy-on-guns-democracy-and-2024", known_from: "politician-stances.js" },
  { politician_id: "collins", topic: "gov_transparency", source_type: "official Senate press release index",
    url: "https://www.collins.senate.gov/newsroom/press-releases", known_from: "politician-stances.js" },
  { politician_id: "collins", topic: "israel_support", source_type: "official Senate press release",
    url: "https://www.collins.senate.gov/newsroom/collins-graham-call-for-answers-as-administration-withholds-key-israel-assistance", known_from: "politician-stances.js" },
  { politician_id: "coons", topic: "israel_support", source_type: "official Senate press release",
    url: "https://www.coons.senate.gov/news/press-releases/senate-passes-coons-rubio-bill-to-enhance-us-security-assistance-to-israel/", known_from: "politician-stances.js" },
  { politician_id: "cruz", topic: "israel_support", source_type: "official Senate press release",
    url: "https://www.cruz.senate.gov/newsroom/press-releases/sen-cruz-leads-resolution-in-support-of-israeli-arms-sales", known_from: "politician-stances.js" },
  { politician_id: "cruz", topic: "school_choice", source_type: "official Senate press release",
    url: "https://www.cruz.senate.gov/newsroom/press-releases/icymi-sen-cruz-secures-historic-school-choice-wins-in-the-one-big-beautiful-bill", known_from: "politician-stances.js" },
  { politician_id: "deb_fischer", topic: "infrastructure", source_type: "official Senate press release index",
    url: "https://www.fischer.senate.gov/public/index.cfm/press-releases", known_from: "politician-stances.js" },
  { politician_id: "donalds", topic: "election_security", source_type: "official House press release",
    url: "https://donalds.house.gov/news/documentsingle.aspx?DocumentID=2636", known_from: "politician-stances.js" },
  { politician_id: "donalds", topic: "voting_access", source_type: "official House press release",
    url: "https://donalds.house.gov/news/documentsingle.aspx?DocumentID=537", known_from: "politician-stances.js" },
  { politician_id: "durbin", topic: "israel_support", source_type: "official Senate press release",
    url: "https://www.durbin.senate.gov/newsroom/press-releases/durbin-statement-on-vote-to-suspend-the-sale-of-some-us-made-weapons-to-israel", known_from: "politician-stances.js" },
  { politician_id: "ernst", topic: "israel_support", source_type: "official Senate press release",
    url: "https://www.ernst.senate.gov/news/press-releases/ernst-again-blasts-biden-for-breaking-his-ironclad-commitment", known_from: "politician-stances.js" },
  { politician_id: "fetterman", topic: "deportations", source_type: "official Senate press release",
    url: "https://www.fetterman.senate.gov/fetterman-statement-on-department-of-homeland-security-in-minnesota-minibus-appropriations/", known_from: "politician-stances.js" },
  { politician_id: "gillibrand", topic: "family_support", source_type: "official Senate press release",
    url: "https://www.gillibrand.senate.gov/news/press/release/senator-gillibrand-rep-delauro-colleagues-introduce-family-act-in-fight-for-universal-paid-leave/", known_from: "politician-stances.js" },
  { politician_id: "grassley", topic: "israel_support", source_type: "official Senate press release",
    url: "https://www.grassley.senate.gov/news/news-releases/grassley-graham-condemn-bidens-threat-to-withhold-military-aid-from-israel", known_from: "politician-stances.js" },
  { politician_id: "hawley", topic: "israel_support", source_type: "official Senate press release",
    url: "https://www.hawley.senate.gov/hawley-statement-on-anniversary-of-october-7-attacks", known_from: "politician-stances.js" },
  { politician_id: "hoeven", topic: "lands_energy", source_type: "official Senate press release",
    url: "https://www.hoeven.senate.gov/news/news-releases/hoeven-pressing-biden-administration-to-hold-oil-and-gas-lease-sales", known_from: "politician-stances.js" },
  { politician_id: "jayapal", topic: "america_first_fp", source_type: "official House press release",
    url: "https://jayapal.house.gov/2025/06/12/jayapal-statement-on-gop-rescissions-package/", known_from: "politician-stances.js" },
  { politician_id: "jayapal", topic: "cut_spending", source_type: "official House press release",
    url: "https://jayapal.house.gov/2025/07/03/jayapal-statement-on-the-big-bad-budget-betrayal/", known_from: "politician-stances.js" },
  { politician_id: "jeffries", topic: "voting_access", source_type: "official House press release",
    url: "https://democraticleader.house.gov/media/press-releases/leader-jeffries-statement-supreme-court-decision-eviscerating-voting-rights", known_from: "politician-stances.js" },
  { politician_id: "jon_ossoff", topic: "healthcare_costs", source_type: "official Senate press release",
    url: "https://www.ossoff.senate.gov/press-releases/watch-sen-ossoff-launching-investigation-into-rising-health-costs-cuts-to-health-care/", known_from: "politician-stances.js" },
  { politician_id: "khanna", topic: "cut_spending", source_type: "official House press release",
    url: "https://khanna.house.gov/media/press-releases/rep-khanna-unveils-progressive-deficit-reduction-plan-reduce-deficit-12", known_from: "politician-stances.js" },
  { politician_id: "khanna", topic: "election_security", source_type: "official House op-ed",
    url: "https://khanna.house.gov/media/editorials/it-s-time-secure-2020-election", known_from: "politician-stances.js" },
  { politician_id: "khanna", topic: "israel_support", source_type: "official House press release",
    url: "https://khanna.house.gov/media/press-releases/statement-khanna-castro-velazquez-doggett-jayapalocasio-cortez-balint-casar", known_from: "politician-stances.js" },
  { politician_id: "khanna", topic: "restraint", source_type: "official House press release",
    url: "https://khanna.house.gov/media/press-releases/release-khanna-briggs-launch-bipartisan-war-powers-caucus", known_from: "politician-stances.js" },
  { politician_id: "khanna", topic: "strong_defense", source_type: "official House op-ed",
    url: "https://khanna.house.gov/media/ros-op-eds/why-i-was-proud-be-lone-vote-against-defense-budget", known_from: "politician-stances.js" },
  { politician_id: "khanna", topic: "voting_access", source_type: "official House issue page",
    url: "https://khanna.house.gov/media/editorials/congress-has-duty-act-voting-rights-inequality-issues-ahead-midterms", known_from: "politician-stances.js" },
  { politician_id: "lummis", topic: "energy_production", source_type: "official Senate press release index",
    url: "https://www.lummis.senate.gov/press-releases/", known_from: "politician-stances.js" },
  { politician_id: "massie", topic: "gov_regulation", source_type: "official House press release",
    url: "https://massie.house.gov/news/documentsingle.aspx?DocumentID=395821", known_from: "politician-stances.js" },
  { politician_id: "massie", topic: "privacy_rights", source_type: "official House press release",
    url: "https://massie.house.gov/news/documentsingle.aspx?DocumentID=395818", known_from: "politician-stances.js" },
  { politician_id: "maxine_waters", topic: "cut_spending", source_type: "official House press release",
    url: "https://waters.house.gov/media-center/press-releases/congresswoman-waters-statement-gop-plan-cut-social-security-medicare", known_from: "politician-stances.js" },
  { politician_id: "maxine_waters", topic: "israel_support", source_type: "official House press release",
    url: "https://waters.house.gov/media-center/press-releases/congresswoman-maxine-waters-calls-for-an-immediate-cease-fire-in-gaza", known_from: "politician-stances.js" },
  { politician_id: "maxine_waters", topic: "voting_access", source_type: "official House press release",
    url: "https://waters.house.gov/media-center/press-releases/congresswoman-maxine-waters-blasts-trump-administration-efforts-to-abuse-americans-personal-data-and-control-elections", known_from: "politician-stances.js" },
  { politician_id: "mike_johnson", topic: "election_security", source_type: "official House press release",
    url: "https://mikejohnson.house.gov/news/documentsingle.aspx?DocumentID=1579", known_from: "politician-stances.js" },
  { politician_id: "mike_johnson", topic: "strong_defense", source_type: "official House press release",
    url: "https://mikejohnson.house.gov/news/documentsingle.aspx?DocumentID=1492", known_from: "politician-stances.js" },
  { politician_id: "murkowski", topic: "energy_production", source_type: "official Senate press release",
    url: "https://www.murkowski.senate.gov/press/release/latest-interior-moves-will-restore-balanced-management-in-alaskas-petroleum-reserve", known_from: "politician-stances.js" },
  { politician_id: "murkowski", topic: "israel_support", source_type: "official Senate press release",
    url: "https://www.murkowski.senate.gov/press/release/senator-murkowski-joins-senate-resolution-standing-with-israel-on-one-year-anniversary-of-horrific-terrorist-attacks", known_from: "politician-stances.js" },
  { politician_id: "nancy_mace", topic: "election_security", source_type: "official House press release",
    url: "https://mace.house.gov/media/press-releases/congresswoman-mace-calls-stronger-election-security-across-united-states-amid", known_from: "politician-stances.js" },
  { politician_id: "omar", topic: "voting_access", source_type: "official House op-ed",
    url: "https://omar.house.gov/media/in-the-news/rep-omar-essay-atlantic-protecting-our-democracy", known_from: "politician-stances.js" },
  { politician_id: "scalise", topic: "election_security", source_type: "official House press release",
    url: "https://scalise.house.gov/press-releases/Let%E2%80%99s-Strengthen-the-Sanctity-of-the-Vote", known_from: "politician-stances.js" },
  { politician_id: "scalise", topic: "gov_regulation", source_type: "official House press release",
    url: "https://scalise.house.gov/press-releases/Scalise-Highlights-Potential-CRA-Targets", known_from: "politician-stances.js" },
  { politician_id: "scalise", topic: "gun_safety", source_type: "official House press release",
    url: "https://scalise.house.gov/media/press-releases/scalise-democrat-gun-control-legislation-makes-criminals-law-abiding-americans", known_from: "politician-stances.js" },
  { politician_id: "scalise", topic: "strong_defense", source_type: "official House press release",
    url: "https://scalise.house.gov/press-releases/scalise-we-have-the-american-people%27s-back", known_from: "politician-stances.js" },
  { politician_id: "schumer", topic: "gun_safety", source_type: "official Senate press release",
    url: "https://www.democrats.senate.gov/newsroom/press-releases/majority-leader-schumer-floor-remarks-on-the-release-of-the-bipartisan-gun-safety-legislation-framework", known_from: "politician-stances.js" },
  { politician_id: "schumer", topic: "healthcare_costs", source_type: "official Senate press release",
    url: "https://www.democrats.senate.gov/newsroom/press-releases/majority-leader-schumer-statement-on-democrats-delivering-lower-prescription-drugs-prices-for-seniors-thanks-to-the-inflation-reduction-act", known_from: "politician-stances.js" },
  { politician_id: "tom_cole", topic: "election_security", source_type: "official House press release",
    url: "https://cole.house.gov/media/press-releases/cole-votes-restrict-non-citizens-voting-american-elections", known_from: "politician-stances.js" },
  { politician_id: "tom_cole", topic: "israel_support", source_type: "official House press release",
    url: "https://cole.house.gov/media/press-releases/cole-calvert-diaz-balart-joyce-bill-curb-bidens-decision-pause-weapon", known_from: "politician-stances.js" },
  { politician_id: "tom_cole", topic: "voting_access", source_type: "official House press release",
    url: "https://cole.house.gov/media/press-releases/cole-votes-against-democrats-latest-scheme-federalize-elections", known_from: "politician-stances.js" },
  { politician_id: "tommy_tuberville", topic: "israel_support", source_type: "official Senate press release",
    url: "https://www.tuberville.senate.gov/newsroom/press-releases/tuberville-statement-on-confirmed-reports-of-biden-administration-delaying-weapon-sales-to-israel/", known_from: "politician-stances.js" },
  { politician_id: "van_hollen", topic: "healthcare_costs", source_type: "official Senate press release",
    url: "https://www.vanhollen.senate.gov/news/press-releases/van-hollen-statement-on-maryland-general-assemblys-veto-override-on-the-prescription-drug-affordability-board", known_from: "politician-stances.js" },
  { politician_id: "warren", topic: "israel_support", source_type: "official Senate press release",
    url: "https://www.warren.senate.gov/newsroom/press-releases/senator-warren-delivers-floor-speech-on-israel-gaza-and-conditioning-aid", known_from: "politician-stances.js" },
  { politician_id: "warren", topic: "econ_corp_account", source_type: "official Senate press release",
    url: "https://www.warren.senate.gov/newsroom/press-releases/warren-secures-wins-on-military-right-to-repair-defense-contractor-stock-buybacks-service-member-safety-in-senate-fy-2027-ndaa/", known_from: "politician-stances.js" },
  { politician_id: "warren", topic: "strong_defense", source_type: "official Senate press release",
    url: "https://www.warren.senate.gov/newsroom/press-releases/warren-sheehy-statement-on-right-to-repair-win-in-senate-fy-27-ndaa/", known_from: "politician-stances.js" },
];

// ── Congress.gov — the member's page, or a measure they are lead author of ──
// Congress.gov currently answers automated fetches with HTTP 403. These are
// still configured (the URLs are clean and official), are ordered after every
// other page for the politician, and a refused fetch logs a FAIL and writes
// nothing — exactly like any other failed source.
export const CONGRESS_GOV = [
  { politician_id: "jeffries", topic: "immigration_reform", source_type: "Congress.gov member page",
    url: "https://www.congress.gov/member/hakeem-jeffries/J000294", known_from: "politician-stances.js" },
  { politician_id: "schumer", topic: "gov_balance", source_type: "Congress.gov member page",
    url: "https://www.congress.gov/member/charles-schumer/S000148", known_from: "politician-stances.js" },
  { politician_id: "aoc", topic: "climate_action", source_type: "Congress.gov sponsored measure page",
    url: "https://www.congress.gov/bill/116th-congress/house-resolution/109", known_from: "politician-stances.js" },
  { politician_id: "cruz", topic: "tech_balance", source_type: "Congress.gov sponsored measure page",
    url: "https://www.congress.gov/bill/119th-congress/senate-bill/146", known_from: "politician-stances.js" },
  { politician_id: "warren", topic: "crypto_cbdc", source_type: "Congress.gov sponsored measure page",
    url: "https://www.congress.gov/bill/118th-congress/senate-bill/2669", known_from: "politician-stances.js" },
  { politician_id: "lummis", topic: "crypto_cbdc", source_type: "Congress.gov sponsored measure page",
    url: "https://www.congress.gov/bill/119th-congress/senate-bill/954", known_from: "politician-stances.js" },
];

// ── State legislature official member pages ──
export const STATE_LEGISLATURE = [
  { politician_id: "dustin_burrows", topic: "school_choice", source_type: "official state legislature member page",
    url: "https://house.texas.gov/members/member-page/?district=83", known_from: "politician-stances.js" },
  { politician_id: "carl_heastie", topic: "tax_middle_class", source_type: "official state legislature member page",
    url: "https://nyassembly.gov/mem/Carl-E-Heastie", known_from: "politician-stances.js" },
  { politician_id: "mike_kohler", topic: "property_tax", source_type: "official state legislature sponsored-bills page",
    url: "https://le.utah.gov/asp/billsintro/SubResults.asp?Listbox4=ALL&Sponsor=KohleM", known_from: "politician-stances.js" },
];

// ── Governor / statewide official sites — press releases + issue pages ──
export const STATEWIDE_OFFICIAL = [
  { politician_id: "cox", topic: "enviro_energy", source_type: "official governor press release",
    url: "https://governor.utah.gov/press/news-release-gov-cox-unveils-operation-gigawatt/", known_from: "politician-stances.js" },
  { politician_id: "gavin_newsom", topic: "climate_action", source_type: "official governor newsroom",
    url: "https://www.gov.ca.gov/newsroom/", known_from: "politician-stances.js" },
];

// ── Campaign Issues / Priorities sub-pages (expands the existing set) ──
export const CAMPAIGN_ISSUES = [
  { politician_id: "james_talarico", topic: "school_choice", source_type: "campaign issue page",
    url: "https://jamestalarico.com/issue/public-education/", known_from: "db/stance-ground-truth-talarico-cost-of-living.json" },
  { politician_id: "gina_hinojosa", topic: "cost_living", source_type: "campaign priorities index",
    url: "https://ginafortexas.com/priorities/", known_from: "db/bill-finder-ground-truth-2026-11.json" },
];

/** Every extra source, tagged with its class. Order: by class, then as listed. */
export const EXTRA_SOURCES = [
  ...CONGRESS_MEMBER.map((s) => ({ ...s, source_class: "congress_member" })),
  ...STATE_LEGISLATURE.map((s) => ({ ...s, source_class: "state_legislature" })),
  ...STATEWIDE_OFFICIAL.map((s) => ({ ...s, source_class: "statewide_official" })),
  ...CAMPAIGN_ISSUES.map((s) => ({ ...s, source_class: "campaign_issues" })),
  ...CONGRESS_GOV.map((s) => ({ ...s, source_class: "congress_gov" })),
];

// ── Official social sources (raw-ingest-social.mjs) — YouTube only for now ──
// A channel is used only when the site already cites one of its videos and
// labels it the politician's OWN official / campaign channel (`known_video`,
// cited in `known_from`). The channel id is the uploader of that cited video
// (YouTube oEmbed author → channel page), not a guess. The Utah Senate's
// channel (cited for Sen. Hinkins) is skipped: it is the chamber's channel, not
// his. X and Facebook are not configured (no anonymous access to posts).
//
// Each politician gets a roster row with their official government page as the
// official pattern; the channel is a lower-priority page that only fills slots
// left over after official and campaign pages (planRun's social fill).
export const NEW_SOCIAL_ROSTER = [
  { politician_id: "curtis", name: "John Curtis", tier: 1, has_board: true, has_stances: true,
    official: { politician_id: "curtis", topic: "enviro_energy", source_type: "official Senate press release",
      official_kind: "congress", source_id: "official-newsroom",
      url: "https://www.curtis.senate.gov/press-releases/curtis-calls-for-federal-permitting-reform-to-boost-utahs-clean-energy-development/",
      known_from: "politician-stances.js" } },
  { politician_id: "hoang_nguyen", name: "Hoang Nguyen", tier: 1, has_board: true, has_stances: true,
    official: { politician_id: "hoang_nguyen", topic: "public_schools", source_type: "official state legislature member page",
      official_kind: "state_legislature", source_id: "official-legislature",
      url: "https://house.utleg.gov/rep/NGUYEH/", known_from: "spotlight-cards-data.js" } },
];

export const OFFICIAL_YOUTUBE = [
  { politician_id: "curtis", topic: "religious_liberty", source_type: "official YouTube channel",
    channel_id: "UChAQ4MD-HigmGnImSoAKBVA", channel_url: "https://www.youtube.com/@SenatorJohnCurtis",
    known_video: "https://www.youtube.com/watch?v=iYHH_IfBiVQ", known_label: "Senator John Curtis (official channel)",
    known_from: "scripts/spotlight-video-social-batch-jul2026.mjs" },
  { politician_id: "hoang_nguyen", topic: "public_schools", source_type: "campaign YouTube channel",
    channel_id: "UCNilDuFLmC7FBsyJoDYUzPA", channel_url: "https://www.youtube.com/@Hoangforhouse",
    known_video: "https://www.youtube.com/watch?v=c7mYbUvbHq4", known_label: "Nguyen's official campaign channel",
    known_from: "spotlight-cards-data.js" },
];

/** Every social source, tagged with its class; `url` is the channel's public feed. */
export const SOCIAL_SOURCES = OFFICIAL_YOUTUBE.map((s) => ({
  ...s, source_class: "youtube", source_id: "youtube-channel",
  url: `https://www.youtube.com/feeds/videos.xml?channel_id=${s.channel_id}`,
}));
