// ─────────────────────────────────────────────────────────────────────────────
// vr-add-israel-stances-aug2026.mjs — sourced stance cards for the israel_support gap
// ─────────────────────────────────────────────────────────────────────────────
// After the mapping and vote-attribution passes, 56 members had judged votes on
// israel_support roll calls but no stated position under that key, so they carried
// 372 member-votes that could never be ranked. Rankability needs all three legs —
// a member vote, a measure→issue mapping, and a stated position on the same issue —
// and only the third was missing.
//
// This pass adds the third leg where, and only where, the member has actually said
// something. Rules applied row by row:
//
//   · Direction is coded against the ISSUE_MAP chip for israel_support — "Keep
//     backing Israel with U.S. security aid, weapons and sanctions on its
//     adversaries" — not against how any vote came out. No position here is derived
//     from a vote total; the votes were the reason to look, never the evidence.
//
//   · `support` = the member's own words back continued U.S. security aid, arms
//     transfers or sanctions on Israel's adversaries.
//
//   · `mixed` = the record states both halves and flattening either one would be a
//     misquote: backs Israel's security and defensive aid while pressing for
//     conditions, a ceasefire, humanitarian access, or blocking specific offensive
//     transfers. This follows the convention already in the file for gallego,
//     slotkin, chris_murphy, kaine, schiff, meeks and adam_smith.
//
//   · `oppose` = the member's own words argue against continuing U.S. military aid
//     to Israel, whatever the stated reason (fiscal, humanitarian, or both).
//
// Five members in the gap are deliberately left without a card because no sourceable
// position on U.S. support for Israel could be attributed to them: frank_lucas,
// cstewart, troy_downing, gaetz and kennedy. Their votes stay in the record and stay
// unrankable, which is the honest outcome.
//
// Gaetz is the closest call — his April 2024 statement objecting to the supplemental
// ("defund the United Nations first," concerns about deficit spending for any country
// "even if that country is a great ally or under attack") survives only on his
// now-removed House site and a paywalled archive, and it is an objection to that
// vehicle rather than a stated direction on continuing assistance. Reading a direction
// out of it would be the inference this pass avoids.
//
// The `kennedy` pid is an identity problem, not a research one: db/vr-member-map.json
// resolves it to Kimberlyn King-Hinds (R-MP) while the existing stance rows on that pid
// describe a practicing family physician, and neither matches Sen. John Kennedy (R-LA),
// whose statements the search surfaced. Attributing an Israel position to that pid would
// risk putting one member's words on another member's profile, so it is left alone.
//
// Additive only: no existing row is edited, re-keyed or removed, and every pid here
// already has a stance array. Idempotent — a card whose (pid, topic) already exists
// is counted and skipped. Refuses to write if any targeted pid is missing.
//
// Run:  node scripts/vr-add-israel-stances-aug2026.mjs [--write]
// ─────────────────────────────────────────────────────────────────────────────
import fs from "node:fs";
import path from "node:path";
import url from "node:url";

const ROOT = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), "..");
const SRC = path.join(ROOT, "politician-stances.js");
const WRITE = process.argv.includes("--write");
const KEY = "israel_support";

// One card per member. `ev` is optional and becomes the row's `evidence` field —
// used where the record carries a qualifier that the headline sentence would lose.
const ADDS = [
  // ── support ────────────────────────────────────────────────────────────────
  { pid: "curtis", topic: "Support for Israel", pos: "support",
    text: "Backs continued U.S. security assistance to Israel and has voted against Senate resolutions that would block or condition weapons transfers; after Israel struck Iranian targets he said Israel \"exercised its sovereign right to defend itself against an existential threat\" and that the U.S. must stand firmly with it.",
    label: "curtis.senate.gov", url: "https://www.curtis.senate.gov/press-releases/curtis-statement-on-israeli-airstrikes-on-iran/" },

  { pid: "barrasso", topic: "Support for Israel", pos: "support",
    text: "Told the Senate floor that \"our support for Israel is unwavering, unbreakable, and unequivocal,\" and argues the U.S. must return to maximum pressure on Iran to break its influence in the region.",
    ev: "Cosponsored the Emergency Resupply for Iron Dome Act of 2023, which would redirect U.S. assistance to replenish Israel's air defenses.",
    label: "barrasso.senate.gov", url: "https://www.barrasso.senate.gov/newsroom-news-releases-barrasso-our-support-for-israel-is-unwavering-unbreakable-and-unequivocal/" },

  { pid: "collins", topic: "Israel & U.S. Aid", pos: "support",
    text: "Calls the U.S.-Israel security relationship \"a vital partnership\" and pressed the administration for answers when it withheld arms transfers in 2024; said a proposal to phase out U.S. military aid \"seems contrary to the memorandum of understanding that we have with Israel.\"",
    ev: "May 2024 letter with Sen. Graham to the Defense and State secretaries seeking the list of held transfers; cosponsored the 2018 U.S.-Israel Security Assistance Authorization Act.",
    label: "collins.senate.gov", url: "https://www.collins.senate.gov/newsroom/collins-graham-call-for-answers-as-administration-withholds-key-israel-assistance" },

  { pid: "cruz", topic: "Support for Israel", pos: "support",
    text: "Argues American policy should be unequivocal military and diplomatic support for Israel, says he strongly supports military aid to Israel \"particularly in a time of war,\" and led a resolution approving two arms sales while pressing the Senate to force delivery of weapons Congress had already appropriated.",
    label: "cruz.senate.gov", url: "https://www.cruz.senate.gov/newsroom/press-releases/sen-cruz-leads-resolution-in-support-of-israeli-arms-sales" },

  { pid: "ernst", topic: "Support for Israel", pos: "support",
    text: "Rejected proposals to block military aid to Israel with the line \"while Israel is being attacked on all fronts, it should not be under attack in the halls of Congress,\" and said the withheld 2024 munitions were precision tools needed to limit civilian casualties.",
    label: "ernst.senate.gov", url: "https://www.ernst.senate.gov/news/press-releases/ernst-again-blasts-biden-for-breaking-his-ironclad-commitment" },

  { pid: "graham", topic: "Israel Aid & the Alliance", pos: "support",
    text: "A leading critic of the 2024 pause on weapons shipments to Israel, he cosponsored a resolution condemning any move to withhold ammunition and pressed Pentagon leaders directly on the delay.",
    ev: "In 2026 he backed tapering U.S. military aid over a decade and wrote that \"we need not wait ten years\" — while calling the aid \"a great investment keeping the IDF strong\" and favoring a shift toward joint U.S.-Israeli weapons development rather than an end to support.",
    label: "lgraham.senate.gov", url: "https://www.lgraham.senate.gov/public/index.cfm/press-releases?ID=7F64BE07-E477-41B3-A17E-E7FB7688640D" },

  { pid: "grassley", topic: "Israel Aid & Conditions", pos: "support",
    text: "Calls conditioning U.S. military aid to Israel \"a dangerous betrayal\" and says the U.S. \"must be unwavering in our resolve to stand with Israel\"; joined the resolution condemning any restriction on supplying American ammunition and weapons.",
    label: "grassley.senate.gov", url: "https://www.grassley.senate.gov/news/news-releases/grassley-graham-condemn-bidens-threat-to-withhold-military-aid-from-israel" },

  { pid: "hawley", topic: "Support for Israel", pos: "support",
    text: "Says the U.S. \"must stand with Israel now more than ever\" and that aid should have moved immediately, and proposed redirecting Ukraine funding to Israel rather than passing the two together.",
    ev: "Supports Israel aid while opposing Ukraine funding — his objection is to the package, not to the assistance.",
    label: "hawley.senate.gov", url: "https://www.hawley.senate.gov/hawley-statement-on-anniversary-of-october-7-attacks" },

  { pid: "john_cornyn", topic: "Support for Israel", pos: "support",
    text: "Pledged to \"continue to advocate for any form of assistance our ally needs in its fight against terrorism\" and called denying weapons to Israel \"an outrageous and deeply unserious policy suggestion.\"",
    ev: "Cosponsored the 2018 U.S.-Israel Security Assistance Authorization Act and the October 2023 Senate resolution backing Israel's right to self-defense.",
    label: "cornyn.senate.gov", url: "https://www.cornyn.senate.gov/issues/the-war-in-israel/" },

  { pid: "lee", topic: "Israel Aid & Foreign Assistance", pos: "support",
    text: "Cosponsored the U.S.-Israel Security Assistance Authorization Act backing full funding under the 2016 memorandum of understanding, and joined colleagues urging the administration to lift what they called its \"partial arms embargo against Israel.\"",
    ev: "A fiscal skeptic of large supplemental packages, he pushed a stand-alone Israel aid bill rather than one bundling Ukraine, Taiwan and border funding — his objection is to the vehicle, not the assistance.",
    label: "lee.senate.gov", url: "https://www.lee.senate.gov" },

  { pid: "murkowski", topic: "Israel Aid & Humanitarian Access", pos: "support",
    text: "Says \"we stand with our ally Israel as they defend their people and their sovereignty,\" and that the U.S. is committed to providing Israel the resources it needs for self-defense alongside humanitarian aid for civilians in the region.",
    ev: "Joined the Senate resolution marking the October 7 anniversary and a letter urging the president to unequivocally support Israel's right to defend itself; cosponsored the U.S.-Israel Security Assistance Authorization Act renewing assistance through 2028.",
    label: "murkowski.senate.gov", url: "https://www.murkowski.senate.gov/press/release/senator-murkowski-joins-senate-resolution-standing-with-israel-on-one-year-anniversary-of-horrific-terrorist-attacks" },

  { pid: "mike_johnson", topic: "Israel Aid & Withheld Weapons", pos: "support",
    text: "Says the United States \"must show unwavering strength and support for Israel\" and demanded the administration \"immediately release all previously withheld and delayed weapons to Israel,\" pushing stand-alone Israel funding when a combined package stalled.",
    label: "mikejohnson.house.gov", url: "https://mikejohnson.house.gov" },

  { pid: "scalise", topic: "Israel Aid & Withheld Weapons", pos: "support",
    text: "Said after October 7 that the U.S. \"will always stand with Israel\" and that \"we must work to make sure Israel has what it needs to destroy Hamas\"; when shipments were paused in 2024 he demanded the administration \"resume sending military aid to Israel immediately.\"",
    ev: "Original cosponsor of the Israel Security Supplemental Appropriations Act providing $17.6 billion in military assistance.",
    label: "scalise.house.gov", url: "https://scalise.house.gov/press-releases/Scalise-Response-to-NSM-20-Report" },

  { pid: "emmer", topic: "Israel Aid & Withheld Weapons", pos: "support",
    text: "As Majority Whip he moved the Israel Security Assistance Support Act, which barred federal funds from being used to halt arms deliveries to Israel, and his office framed the bill as accountability for \"unilaterally halting military aid to our ally, Israel.\"",
    ev: "Original cosponsor of the Israel Security Supplemental Appropriations Act; the delivery bill passed the House 224-187.",
    label: "emmer.house.gov", url: "https://emmer.house.gov/media-center/press-releases" },

  { pid: "jim_jordan", topic: "Support for Israel", pos: "support",
    text: "Called the October 7 attack \"unprovoked terror\" and said the U.S. \"must continue to support our great ally\" as Israel works to prevent Hamas from harming its citizens again.",
    label: "judiciary.house.gov", url: "https://judiciary.house.gov/media/press-releases/jordan-statement-attacks-israel" },

  { pid: "tom_cole", topic: "Israel Aid & Withheld Weapons", pos: "support",
    text: "Co-authored legislation to curb the 2024 pause on weapons transfers to Israel and framed the House vote as \"a moment of moral clarity\" — either standing with Israel and its right to self-defense or sending a message of weakness.",
    label: "cole.house.gov", url: "https://cole.house.gov/media/press-releases/cole-calvert-diaz-balart-joyce-bill-curb-bidens-decision-pause-weapon" },

  { pid: "rubio", topic: "Israel Arms Transfers", pos: "support",
    text: "As Secretary of State he invoked emergency authorities in March 2025 to expedite roughly $4 billion in military assistance to Israel, reversing what the department described as the previous administration's partial arms embargo.",
    label: "state.gov", url: "https://www.state.gov/military-assistance-to-israel" },

  { pid: "zeldin", topic: "Support for Israel", pos: "support",
    text: "Co-chaired the House Republican Israel Caucus and argued that Israel, like any sovereign nation, has an inherent right of self-defense; introduced the Israel Anti-Boycott Act and co-led bipartisan resolutions backing Israel against rocket attacks.",
    label: "Clerk of the House — Rep. Lee Zeldin", url: "https://clerk.house.gov/members/Z000017" },

  { pid: "owens", topic: "Israel & U.S. Aid", pos: "support",
    text: "Voted for the $14.3 billion Israel security supplemental and said \"America must stand shoulder to shoulder with Israel, our strongest ally in the Middle East,\" adding that the U.S. \"unequivocally stands with our ally, Israel.\"",
    label: "owens.house.gov", url: "https://owens.house.gov/posts/owens-votes-for-aid-to-israel" },

  { pid: "scott_perry", topic: "Israel Aid & Package Objections", pos: "support",
    text: "Says he has \"voted for aid for Israel and support for Israel every single time\" and recognizes the 2019-2028 memorandum of understanding committing $38 billion in security assistance.",
    ev: "Voted against the April 2024 supplemental because it carried more than $9 billion in Gaza humanitarian funding and bundled several theatres; he prefers single-subject bills. The objection is to the vehicle's contents, not to Israel's assistance.",
    label: "perry.house.gov", url: "https://perry.house.gov/news/documentsingle.aspx?DocumentID=398454" },

  { pid: "mike_flood", topic: "Support for Israel", pos: "support",
    text: "Told constituents \"I support Israel. America has no better ally than Israel,\" and pledged America would \"continue to do whatever we need to support Israel\" after Iran's missile assault.",
    ev: "Also says Israel has every right to root out Hamas while the U.S., working with Israel, should do everything possible to get food to children in Gaza.",
    label: "flood.house.gov", url: "https://flood.house.gov/media/press-releases/congressman-flood-america-supports-israel-0" },

  { pid: "stephanie_bice", topic: "Support for Israel", pos: "support",
    text: "Says Israel has an absolute right to defend itself and that Congress and the White House must stand unwavering in support of \"our greatest ally in the Middle East\"; voted for the 2024 national-security supplemental funding Israel's defense against Iran and its proxies.",
    label: "bice.house.gov", url: "https://bice.house.gov/media/press-releases/supplemental-security-funding-statement" },

  { pid: "french_hill", topic: "Israel Aid & Withheld Weapons", pos: "support",
    text: "Led a bipartisan effort with Rep. Josh Gottheimer to pass legislation forcing delivery of weapons to Israel after the 2024 shipment pause, and said after October 7 that America stands firmly with Israel and its right to self-defense.",
    label: "hill.house.gov", url: "https://hill.house.gov" },

  { pid: "mariannette_miller_meeks", topic: "Support for Israel", pos: "support",
    text: "Says \"we support Israel in its actions in order to squash Hamas,\" called Israel \"a key strategic ally for the United States\" on the House floor during the Iron Dome vote, and voted for the 2024 supplemental supporting Israel, Taiwan and Ukraine.",
    label: "millermeeks.house.gov", url: "https://millermeeks.house.gov/media/press-releases/rep-miller-meeks-statement-votes-secure-southern-border-support-us-national" },

  { pid: "mike_simpson", topic: "Israel Aid & Withheld Weapons", pos: "support",
    text: "Demanded the administration reverse course on withheld Israel aid, and wrote that \"now, more than ever, our great ally, Israel, needs America's unwavering support.\"",
    ev: "Helped move the Israel Security Assistance Support Act, the legislative response to the 2024 withholding of munitions.",
    label: "simpson.house.gov", url: "https://simpson.house.gov/news/documentsingle.aspx?DocumentID=400392" },

  { pid: "jason_smith", topic: "Israel & U.S. Aid", pos: "support",
    text: "Called Israel \"one of our oldest allies and the sole democracy in the Middle East\" and said the offset Israel funding bill let members \"protect taxpayers and stand with Israel, all in a fiscally responsible way.\"",
    label: "waysandmeans.house.gov", url: "https://waysandmeans.house.gov/2023/11/03/chairman-smith-applauds-passage-of-funding-to-support-israels-defense/" },

  { pid: "bruce_westerman", topic: "Israel & U.S. Aid", pos: "support",
    text: "Cosponsored the Israel security supplemental providing emergency military assistance, calling the October 7 attacks \"cruel, fueled by hatred, and purely evil,\" and writes that Israel is vital to regional stability and U.S. national security.",
    label: "westerman.house.gov", url: "https://westerman.house.gov/media-center/press-releases/westerman-stands-israel" },

  { pid: "michael_guest", topic: "Support for Israel", pos: "support",
    text: "Says he has \"always strived to support our greatest ally in the Middle East: Israel,\" and introduced legislation to replenish Israel's Iron Dome interceptor stocks.",
    label: "guest.house.gov", url: "https://guest.house.gov/media/press-releases/protect-innocent-lives-hamas-missiles-congressman-guest-introduces-legislation" },

  { pid: "trent_kelly", topic: "Support for Israel", pos: "support",
    text: "Wrote to constituents that \"we must stand strongly with Israel and do everything in our power to help them defeat Hamas,\" and cosponsored the House resolution standing with Israel after October 7.",
    label: "trentkelly.house.gov", url: "https://trentkelly.house.gov/" },

  { pid: "rick_crawford", topic: "Support for Israel", pos: "support",
    text: "Says the U.S. should stand with Israel against Hamas and that Israel has both the right and the obligation to defend its citizens; in 2025 he credited Israel with doing a \"phenomenal job\" getting aid into Gaza and blamed Hamas for obstructing distribution.",
    label: "crawford.house.gov", url: "https://crawford.house.gov/media/press-releases/congressman-crawford-statement-on-supporting-israel" },

  { pid: "steve_womack", topic: "Israel & U.S. Aid", pos: "support",
    text: "Urged colleagues during floor debate on the Israel security supplemental to \"reject the demands for the perfect and instead support the good,\" saying Israel has a right to defend itself and needs freedom of action.",
    ev: "Cosponsored the October 2023 resolution supporting Israel and backed the April 2024 bills responding to Iran's attack.",
    label: "womack.house.gov", url: "https://womack.house.gov/news/documentsingle.aspx?DocumentID=404493" },

  { pid: "josh_brecheen", topic: "Support for Israel", pos: "support",
    text: "Wrote that \"supporting Israel in our actions is what counts, not just our statements,\" and that Congress will keep working to ensure Israel has the resources it needs to defend itself.",
    ev: "Opposed the rule for the combined 2024 foreign aid package on border-security grounds while backing the stand-alone Israel measures — the objection was to the vehicle, not the assistance.",
    label: "brecheen.house.gov", url: "https://brecheen.house.gov/" },

  { pid: "mike_collins", topic: "Support for Israel", pos: "support",
    text: "Vowed at an October 7 memorial event to \"make sure that Israel has the resources to defend themselves,\" and has continued to describe Israel as \"our ally.\"",
    label: "Jewish Insider", url: "https://jewishinsider.com/2026/07/georgia-senate-race-jon-ossoff-mike-collins-jewish-community/" },

  { pid: "mike_ezell", topic: "Support for Israel", pos: "support",
    text: "Cosponsored the bipartisan resolution supporting Israel and condemning Hamas, and said he would \"continue standing with our Israeli allies against terrorism.\"",
    label: "ezell.house.gov", url: "https://ezell.house.gov/news/documentsingle.aspx?DocumentID=313" },

  { pid: "julie_fedorchak", topic: "Support for Israel", pos: "support",
    text: "States that a secure Israel means a more secure America and calls her commitment to Israel's safety and stability \"unwavering\"; after an August 2025 delegation visit she said \"America's security is tied to Israel's security.\"",
    ev: "Also says the U.S. should keep providing humanitarian aid into Gaza and called it critical to protecting Palestinians.",
    label: "fedorchak.house.gov", url: "https://fedorchak.house.gov/issues/national-defense-and-security" },

  { pid: "rob_bresnahan", topic: "Support for Israel", pos: "support",
    text: "Says the U.S. has to \"trust the IDF\" and provide the resources needed to eradicate Hamas, and describes Israel as America's \"strongest and only democratic ally in the Middle East.\"",
    label: "Jewish Insider", url: "https://jewishinsider.com/2024/11/rob-bresnahan-pennsylvania-matt-cartwright-israel-u-s-gaza/" },

  // ── mixed ──────────────────────────────────────────────────────────────────
  { pid: "booker", topic: "Israel Aid & Arms Sales", pos: "mixed",
    text: "Voted repeatedly against resolutions blocking arms sales to Israel, then backed one halting a sale of armored bulldozers, saying he is \"using every tool available to me to stop this war\" while insisting he would \"always steadfastly support Israel's defense and deterrence capabilities.\"",
    ev: "Explained an earlier no vote by arguing the resolution would restrict the country's ability to provide future security guarantees without ending the war or increasing humanitarian aid.",
    label: "booker.senate.gov", url: "https://www.booker.senate.gov" },

  { pid: "durbin", topic: "Israel Aid & Conditions", pos: "mixed",
    text: "Affirms Israel's right to exist and defend itself and notes a career of voting for military assistance, but says \"yes, we should have basic conditions\" on it and voted to suspend specific arms sales, arguing Netanyahu \"has gone too far\" as humanitarian conditions in Gaza worsened.",
    label: "durbin.senate.gov", url: "https://www.durbin.senate.gov/newsroom/press-releases/durbin-statement-on-vote-to-suspend-the-sale-of-some-us-made-weapons-to-israel" },

  { pid: "warren", topic: "Israel Aid & Conditions", pos: "mixed",
    text: "Supports military assistance to Israel but argues that continuing it without restriction provides \"no incentive for Israel to adjust course,\" and has used floor speeches to press for conditioning aid on compliance with international law, civilian protection and humanitarian access.",
    label: "warren.senate.gov", url: "https://www.warren.senate.gov/newsroom/press-releases/senator-warren-delivers-floor-speech-on-israel-gaza-and-conditioning-aid" },

  { pid: "jon_ossoff", topic: "Israel Aid & Arms Sales", pos: "mixed",
    text: "Split his votes on arms-sale disapproval resolutions: he voted to block a rifle sale rather than acquiesce to \"the extreme mass deprivation of civilians in Gaza, including the intolerable starvation of children,\" while voting against blocking air-to-ground munitions because Israel's deterrence depends on its Air Force.",
    ev: "Condemned Hamas for the October 7 massacre and for refusing to release hostages, and has voted for more than $20 billion in assistance to Israel.",
    label: "ossoff.senate.gov", url: "https://www.ossoff.senate.gov/press-releases/sen-ossoff-statement-on-jrd-votes/" },

  { pid: "kclark", topic: "Israel Aid & Conditions", pos: "mixed",
    text: "Opposed an amendment zeroing out all U.S. aid to Israel while arguing that \"we should not provide a blank check for military aid to any country that does not comply with U.S. law, interests, and values.\"",
    label: "katherineclark.house.gov", url: "https://katherineclark.house.gov/2026/07/15/whip-clark-statement-on-massie-amendment-to-gop-foreign-aid-budget-bill/" },

  { pid: "maxine_waters", topic: "Israel & Gaza Ceasefire", pos: "mixed",
    text: "Describes herself as a supporter of Israel who signed the congressional resolution backing it and supports its right to defend itself, while calling for an immediate Gaza ceasefire, humanitarian access for civilians, and saying Netanyahu \"has to go.\"",
    label: "waters.house.gov", url: "https://waters.house.gov/media-center/press-releases/congresswoman-maxine-waters-calls-for-an-immediate-cease-fire-in-gaza" },

  { pid: "crockett", topic: "Israel Aid & Offensive Weapons", pos: "mixed",
    text: "Explains her vote for the 2024 supplemental as backing \"defensive help to Israel\" bundled with Gaza, Taiwan and Haiti funding, says \"there have been other bills that were only for funding for Israel, where I actually voted no,\" and signed a letter urging restraint on offensive weapons.",
    ev: "Says she has never opposed Iron Dome funding and distinguishes defensive systems from offensive transfers.",
    label: "crockett.house.gov", url: "https://crockett.house.gov" },

  { pid: "boebert", topic: "Israel Aid & Foreign Spending", pos: "mixed",
    text: "Called Israel \"our closest ally in the world\" and condemned stripping Iron Dome funding as shameful, but voted against the $26.4 billion 2024 assistance package as \"uniparty\" spending and backed an effort to strike a U.S.-Israel defense-cooperation provision from the FY27 defense bill.",
    label: "boebert.house.gov", url: "https://boebert.house.gov" },

  { pid: "bennie_thompson", topic: "Israel & Gaza Ceasefire", pos: "mixed",
    text: "Pointed to U.S. equipment moving into Israel so it could defend itself, while saying \"we need to have some ceasefire\" and that the killing has to stop, arguing that who started the conflict does not justify annihilating innocent people.",
    ev: "In 2026 he framed the caucus debate as a choice between cutting off resources for Israel and continuing a diplomatic approach, rather than endorsing the cut-off.",
    label: "benniethompson.house.gov", url: "https://benniethompson.house.gov/media/press-releases" },

  { pid: "don_davis", topic: "Israel Aid & Humanitarian Access", pos: "mixed",
    text: "Voted for the Israel security supplemental while criticizing the strings attached to it, saying \"we must continue to stand together with our ally, Israel, and simultaneously call for the humane conduct of war consistent with international law,\" and backed a temporary suspension of operations in northern Gaza for humanitarian access.",
    ev: "Reaffirmed in 2025 that supporting allies including Israel is essential to countering the Iranian regime and its proxies, after his state party called for an arms embargo.",
    label: "dondavis.house.gov", url: "https://dondavis.house.gov/media/press-releases" },

  // ── oppose ─────────────────────────────────────────────────────────────────
  { pid: "rand_paul", topic: "Foreign Aid to Israel", pos: "oppose",
    text: "Argues the U.S. cannot keep funding foreign aid on borrowed money, saying he does not support \"funding both sides of the arms race, particularly when we have to borrow the money from China,\" and told an Israeli audience it \"will be harder to defend Israel if we destroy our country in the process.\"",
    ev: "His 2011 budget proposed eliminating all international assistance, Israel's included; he later said he had no legislative proposal to end it and pointed to voting for Iron Dome funding, so the record is a fiscal objection rather than a security one.",
    label: "paul.senate.gov", url: "https://www.paul.senate.gov" },

  { pid: "massie", topic: "Zeroing Out Israel Aid", pos: "oppose",
    text: "Offers an annual amendment barring the use of appropriated funds for Israel and cutting $3.3 billion from Foreign Military Financing; during floor debate he said \"there have been 70,000 casualties in Gaza, and I don't think we should be part of that.\"",
    ev: "A fiscal opponent of all foreign aid who added the humanitarian argument; his 2026 amendment failed 104-314 and he was the only Republican voting for it.",
    label: "massie.house.gov", url: "https://massie.house.gov" },

  { pid: "mtg", topic: "Cutting Israel Aid", pos: "oppose",
    text: "Offered an amendment to strike $500 million for Israel's missile defense, arguing that \"nuclear armed Israel's national debt is under $400 Billion compared to our crippling national debt of $37 TRILLION\" and that American taxpayers should not be asked for more.",
    ev: "Frames the position as protecting U.S. interests rather than opposing Israel, and has cited the $3.8 billion already provided annually. Her amendment was rejected 6-422.",
    label: "Clerk of the House — Rep. Marjorie Taylor Greene", url: "https://clerk.house.gov/members/G000596" },

  { pid: "aoc", topic: "Military Aid to Israel", pos: "oppose",
    text: "Says she will vote against any military aid to Israel, including defensive systems, because \"the Israeli government is well able to fund the Iron Dome system\" and she will not send more taxpayer dollars to a government that \"consistently ignores international law.\"",
    ev: "A shift from her earlier record, which opposed offensive weapons while explicitly backing Iron Dome and other defensive systems.",
    label: "ocasio-cortez.house.gov", url: "https://ocasio-cortez.house.gov" },

  { pid: "khanna", topic: "Military Aid to Israel", pos: "oppose",
    text: "Announced he was \"voting yes on @RepThomasMassie's amendment to zero out all aid to Israel, including aid for offensive and defensive weapons like the Iron Dome,\" having earlier opposed \"a blank check for Netanyahu and offensive weapons unconditionally.\"",
    ev: "His 2024 position affirmed Israel's right to self-defense and support for strengthening Iron Dome; by 2026 he argued Israel can buy the system with its own money.",
    label: "khanna.house.gov", url: "https://khanna.house.gov/media/press-releases/statement-khanna-castro-velazquez-doggett-jayapalocasio-cortez-balint-casar" },
];

const ICON = "🇮🇱";
const q = s => `'${String(s).replace(/\\/g, "\\\\").replace(/'/g, "\\'")}'`;

function render(a) {
  const out = [
    `      { topic:${q(a.topic)}, icon:'${ICON}', pos:'${a.pos}', issueKey:'${KEY}', issueStance:'${a.pos}',`,
    `        text:${q(a.text)},`,
  ];
  if (a.ev) out.push(`        evidence:${q(a.ev)},`);
  out.push(`        source:{label:${q(a.label)}, url:${q(a.url)}} },`);
  return out;
}

const lines = fs.readFileSync(SRC, "utf8").split("\n");

// Index every pid block: opening line, and the line of its array's closing bracket.
// The close is found by walking back from the next pid key (or the object's own `};`)
// to the last `]`-only line, which avoids mis-reading brackets inside card strings.
const PID_OPEN = /^\s{2,6}([a-z0-9_]+):\s*\[\s*(\/\/.*)?$/;
const opens = [];
for (let i = 0; i < lines.length; i++) {
  const m = lines[i].match(PID_OPEN);
  if (m) opens.push({ pid: m[1], line: i });
}
const blocks = new Map();
for (let k = 0; k < opens.length; k++) {
  const start = opens[k].line;
  const boundary = k + 1 < opens.length
    ? opens[k + 1].line
    : lines.findIndex((l, i) => i > start && /^\s{0,4}\};\s*$/.test(l));
  let close = -1;
  for (let i = boundary - 1; i > start; i--) {
    if (/^\s*\],?\s*$/.test(lines[i])) { close = i; break; }
  }
  if (close > start) blocks.set(opens[k].pid, { start, close });
}

// Existing (pid, topic) pairs, so a re-run adds nothing twice.
const existing = new Set();
{
  let pid = "?";
  for (const L of lines) {
    const pm = L.match(PID_OPEN);
    if (pm) { pid = pm[1]; continue; }
    const tm = L.match(/topic\s*:\s*'((?:[^'\\]|\\.)*)'/);
    if (tm) existing.add(`${pid}||${tm[1].replace(/\\(.)/g, "$1")}`);
  }
}

const added = [];
const skipped = [];
const missing = [];
const inserts = new Map(); // close-line index → lines to insert before it

for (const a of ADDS) {
  const b = blocks.get(a.pid);
  if (!b) { missing.push(a.pid); continue; }
  if (existing.has(`${a.pid}||${a.topic}`)) { skipped.push(`${a.pid}||${a.topic}`); continue; }
  if (!inserts.has(b.close)) inserts.set(b.close, []);
  inserts.get(b.close).push(...render(a));
  added.push({ pid: a.pid, pos: a.pos, topic: a.topic });
}

const byPos = added.reduce((m, a) => ((m[a.pos] = (m[a.pos] || 0) + 1), m), {});
console.log(`israel_support stance pass — ${ADDS.length} card(s) targeted`);
for (const p of ["support", "mixed", "oppose"]) {
  if (byPos[p]) console.log(`  ${String(byPos[p]).padStart(3)}  ${p}`);
}
if (skipped.length) console.log(`  ${String(skipped.length).padStart(3)}  already present (no-op)`);
if (missing.length) {
  console.error(`\n! ${missing.length} targeted pid(s) not found in ISSUE_STANCE_DATA — refusing to write:`);
  for (const p of missing) console.error(`  - ${p}`);
  process.exit(1);
}

if (!WRITE) { console.log("\nDry run. Re-run with --write to apply."); process.exit(0); }

const out = [];
for (let i = 0; i < lines.length; i++) {
  if (inserts.has(i)) out.push(...inserts.get(i));
  out.push(lines[i]);
}
fs.writeFileSync(SRC, out.join("\n"), "utf8");
console.log(`\nWrote ${added.length} card(s) to politician-stances.js`);
