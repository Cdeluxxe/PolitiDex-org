#!/usr/bin/env node
// ---------------------------------------------------------------------------
// PolitiDex — June 2026 evidence pass, WAVE 5
// X-POST evidence (made a real, balanced source) + continued FLOOR-VIDEO
// backfill of thin / rural / single-county sitting Utah legislators.
//
// Same end-to-end verification discipline as wave 4, re-run live this pass:
//
//   1) X POSTS as a first-class evidence source.
//      Every X-post item was verified the same way:
//        • The authoring account was discovered through the Wayback CDX index of
//          the account's own status timeline (twitter.com/<handle>/status/*),
//          which yields REAL status ids the account actually published.
//        • Each id was then re-fetched from the public Twitter syndication
//          endpoint (https://cdn.syndication.twimg.com/tweet-result?id=<id>),
//          which returns the post's EXACT text, created_at date, and the
//          authoring account's screen_name and display name WITHOUT login.
//        • An item is used ONLY when the verified screen_name/display name is the
//          legislator's own account, the post is NOT a retweet or reply, its text
//          is COMPLETE (not Twitter-truncated with a trailing "…"), and it states
//          a substantive position or action on a specific issue. Memes, generic
//          announcements, and procedural one-liners were rejected.
//        • Where a post names a bill, the bill's own primary-sponsor record was
//          re-pulled (le.utah.gov/data/<session>/<bill>.json) to confirm the
//          legislator actually sponsored it before the post was used.
//      Honesty note: this channel is genuinely hard. The Wayback archive of
//      X/Twitter is heaviest BEFORE 2023, so most usable posts are dated; several
//      sitting members have no findable X account, an Instagram-only presence
//      (e.g. Sen. Plumb), or a timeline of truncated/national content that fails
//      CONTENT_STYLE. Only posts that cleared every check were used — three
//      legislators in this wave (Thurston, McCay, Blouin). Two of them
//      (Thurston, McCay) ALSO receive a floor-video item below, so a single
//      legislator's record is now backed by two independent source types on two
//      different issues — exactly the connected, multi-source picture this layer
//      is being built toward.
//
//   2) FLOOR VIDEO for the remaining thin profiles (same method as waves 1–4).
//      Each item is the member's OWN recorded floor presentation of a bill they
//      chief-sponsored that became law:
//        • Bill record  : https://le.utah.gov/data/2025GS/<bill>.json — verified
//          primeSponsor, short title, verbatim highlightedProvisions (the basis
//          for each `facts` paragraph), final action (only "Governor Signed"
//          bills are framed as enacted), and the floorDebateList of video
//          markers. The presenting member's own segment is the floorDebateList
//          entry whose chamber matches the member and whose description ends in
//          the member's surname.
//        • Floor video  : the marker's archive page
//          (floorArchive.jsp?markerID=<id>), whose own marker `data-offset`
//          (seconds → mm:ss) is the EXACT seek point. Every timestamp below was
//          extracted from that page this pass and the extractor was re-validated
//          against the known value marker 129768 → 1764s → 29:24 (and the
//          wave-4 value marker 131177 → 1588s → 26:28).
//
// CONTENT_STYLE rules (all waves): every item is about the INDIVIDUAL's own
// words, bill and recorded action — never their party. No party-grouping
// language; signed status is a plain fact from the bill's own action history.
// Every item carries an ISSUE_MAP `issueKey` (validated against the live
// vocabulary in index.html) chosen to match the member's own documented
// keyIssues, so the Spotlight item lands on the same issue as their positions
// and promises.
//
// Forward-looking evidence-view fields (ignored by the current render):
//   • `sourceType`     : 'official_floor_video' | 'x_post' — lets a future
//                        connected view group evidence by kind.
//   • `media`          : the spoken/posted proof ({type, url, timestamp|date,
//                        quote, label}), kept separate from `source` (the
//                        visible, linked citation) so stance + words + promise +
//                        follow-through can be shown side by side.
//
// Idempotent: each member's live `spotlight` array is re-fetched and an item is
// appended ONLY if no existing item shares its headline.
//
//   node scripts/spotlight-evidence-x-and-video-jun2026-wave5.mjs            # dry run
//   node scripts/spotlight-evidence-x-and-video-jun2026-wave5.mjs --apply    # write
// ---------------------------------------------------------------------------

const PROJECT = 'politidex-979bd';
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/politicians`;
const APPLY = process.argv.includes('--apply');
const STAMP = '2026-06-20T00:00:00.000Z';

// ── Firestore value encoder / decoder ──────────────────────────────────────
function enc(v) {
  if (v === null || v === undefined) return { nullValue: null };
  if (typeof v === 'string') return { stringValue: v };
  if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(enc) } };
  if (typeof v === 'object') {
    const fields = {};
    for (const [k, val] of Object.entries(v)) fields[k] = enc(val);
    return { mapValue: { fields } };
  }
  throw new Error('cannot encode value: ' + String(v));
}
function dec(v) {
  if (v.stringValue !== undefined) return v.stringValue;
  if (v.integerValue !== undefined) return parseInt(v.integerValue, 10);
  if (v.doubleValue !== undefined) return v.doubleValue;
  if (v.booleanValue !== undefined) return v.booleanValue;
  if (v.nullValue !== undefined) return null;
  if (v.timestampValue !== undefined) return v.timestampValue;
  if (v.arrayValue !== undefined) return (v.arrayValue.values || []).map(dec);
  if (v.mapValue !== undefined) {
    const o = {};
    for (const [k, val] of Object.entries(v.mapValue.fields || {})) o[k] = dec(val);
    return o;
  }
  return null;
}

// ── authoring helpers ───────────────────────────────────────────────────────
const floor25 = (id) => `https://le.utah.gov/av/floorArchive.jsp?markerID=${id}`;
const bill = (yr, num) => `https://le.utah.gov/~${yr}/bills/static/${num}.html`;
const xurl = (h, id) => `https://x.com/${h}/status/${id}`;

// Floor-video Spotlight item (member's own presentation of a signed bill).
function vidItem({ issueKey, headline, facts, why, billNum, ts, day, chamber, marker, impact = 'positive', tags }) {
  return {
    date: '2025', impact, category: 'voting', issueKey,
    sourceType: 'official_floor_video',
    tags: tags || ['Notable Actions', 'Public Statements'],
    headline, facts, why,
    source: { label: `${billNum} (2025) — official bill record`, url: bill('2025', billNum.replace(/(\D+)(\d+)/, (_, a, b) => a + b.padStart(4, '0'))) },
    media: {
      type: 'video', timestamp: ts, url: floor25(marker),
      label: `Official Utah ${chamber} floor video — Day ${day}, 2025 General Session`,
    },
  };
}

// X-post Spotlight item (verified via the syndication endpoint).
function xItem({ issueKey, handle, name, statusId, date, dateLabel, accountLabel, quote, headline, facts, why, impact = 'positive', tags }) {
  return {
    date: date.slice(0, 4), impact, category: 'rhetoric', issueKey,
    sourceType: 'x_post',
    tags: tags || ['Public Statements', 'Consistency'],
    headline, facts, why,
    source: { label: `X post — @${handle}, ${dateLabel}`, url: xurl(handle, statusId) },
    media: {
      type: 'x_post', url: xurl(handle, statusId), date,
      label: `${accountLabel || 'X post'} by ${name} (@${handle}) — ${dateLabel}`,
      quote,
    },
  };
}

// ── The plan: Firestore id → [spotlight items] ──────────────────────────────
const PLAN = {

  // ===== Norm Thurston — House District 62 (Provo) — X + video ===============
  // Two source types on one thin profile, two issues.
  nthurston: [
    xItem({ issueKey: 'healthcare', handle: 'NormThurston', name: 'Norm Thurston', accountLabel: 'X post',
      statusId: '1487106089434845186', date: '2022-01-28', dateLabel: 'Jan 28, 2022',
      quote: "Chatted with the Utah Nurses Association about important legislation that I am sponsoring, HB 176, which brings together a variety of interested groups to better create policy decisions for Utah’s health workforce!",
      headline: 'Posted on X that his Utah Health Workforce Act (HB176) would "better create policy decisions for Utah\'s health workforce"',
      facts: "On January 28, 2022, Thurston wrote on his X account (@NormThurston): “Chatted with the Utah Nurses Association about important legislation that I am sponsoring, HB 176, which brings together a variety of interested groups to better create policy decisions for Utah’s health workforce!” HB176 (2022), the Utah Health Workforce Act — confirmed his chief-sponsored bill in the official bill record — created the Utah Health Workforce Advisory Council and a Health Workforce Information Center to guide state workforce policy, and was signed into law.",
      why: "Health-workforce expansion is a keyissue his profile names, and this is his own dated statement of the position behind a bill he authored and saw enacted. Paired with his floor-video item below on election records, the same legislator's record is now anchored by two independent source types on two different issues." }),
    vidItem({ issueKey: 'election_integrity', billNum: 'HB263', day: 42, chamber: 'House', ts: '1:05:06', marker: 131255, tags: ['Notable Actions', 'Consistency'],
      headline: 'Presented his election-records transparency bill on the House floor (video at 1:05:06)',
      facts: "Thurston chief-sponsored HB263 (2025), Election Record Amendments, making the recorded video of ballot processing a public record under GRAMA, requiring election officers to retain chain-of-custody documentation, and creating a structured process for governmental entities to review electronic copies of election material. The official House floor video opens to his presentation on Day 42 of the 2025 session at 1:05:06; the bill was signed into law.",
      why: "Election integrity and records is a keyissue his profile names, and opening ballot-processing video and tightening records retention is a recorded, enacted action in his own words — the spoken-word complement to his X statement on health workforce." }),
  ],

  // ===== Dan McCay — Senate District 18 (Salt Lake County) — X + video =======
  dmccay: [
    xItem({ issueKey: 'lower_taxes', handle: 'danmccay', name: 'Daniel McCay', accountLabel: 'X post',
      statusId: '1488905056237850627', date: '2022-02-02', dateLabel: 'Feb 2, 2022',
      quote: "We passed more than a $160 million tax cut for all Utahns. SB 59 State Income Tax Rate Reduction reduces the income tax from 4.95% to 4.85%.",
      headline: 'Posted on X celebrating his income-tax cut (SB59), reducing the rate from 4.95% to 4.85%',
      facts: "On February 2, 2022, McCay wrote on his X account (@danmccay): “We passed more than a $160 million tax cut for all Utahns. SB 59 State Income Tax Rate Reduction reduces the income tax from 4.95% to 4.85%.” SB59 (2022), Tax Amendments — confirmed his chief-sponsored bill in the official bill record — cut the individual income-tax rate from 4.95% to 4.85% and expanded the Social Security benefits tax credit, and was signed into law.",
      why: "Income-tax reduction is the keyissue his profile leads with, and this is his own dated post documenting the enacted bill behind it. Together with his floor-video item below on election fundraising, his record now shows two verifiable source types on two of his named issues." }),
    vidItem({ issueKey: 'election_integrity', billNum: 'SB18', day: 1, chamber: 'Senate', ts: '25:37', marker: 128531, tags: ['Notable Actions', 'Consistency'],
      headline: 'Carried his election-fundraising integrity bill on the Senate floor (video at 25:37)',
      facts: "McCay chief-sponsored SB18 (2025), Election Fundraising Amendments, making it a crime to make a federal campaign contribution with the intent to influence — or reward — the governor or a state official for an official action, while exempting ordinary federal contributions from the in-session contribution ban. The official Senate floor video opens to his presentation on Day 1 of the 2025 session at 25:37; the bill was signed into law.",
      why: "Election integrity is a keyissue his profile names, and criminalizing pay-to-play federal contributions to state officials is a recorded, enacted action in his own words — the spoken-word complement to his X statement on the income-tax cut." }),
  ],

  // ===== Nate Blouin — Senate District 13 (Salt Lake County) — X-POST only ===
  // No chief-sponsored 2025 bill was signed into law, so the clearest spoken-word
  // evidence is his own dated post; labeled honestly as a campaign-account post.
  nate_blouin: [
    xItem({ issueKey: 'enviro_energy', handle: 'NateForUtah', name: 'Nate Blouin', accountLabel: 'Campaign X post',
      statusId: '1534562192783159297', date: '2022-06-08', dateLabel: 'Jun 8, 2022',
      quote: "Small changes like a more fair permit fee can make all the difference for getting new renewable energy projects off the ground. I'm glad the @slco_council approved the discount and I'll look for similar solutions at the state level.",
      headline: 'Posted on X that he would "look for similar solutions at the state level" to speed renewable-energy projects',
      facts: "On June 8, 2022, while campaigning for the Senate seat he now holds, Blouin wrote on his campaign X account (@NateForUtah): “Small changes like a more fair permit fee can make all the difference for getting new renewable energy projects off the ground. I’m glad the @slco_council approved the discount and I’ll look for similar solutions at the state level.” The verified account name and screen name confirm the post is his own.",
      why: "Clean and renewable energy is the keyissue his profile leads with. With no chief-sponsored 2025 bill signed into law, this dated post is the clearest spoken-word evidence of the state-level renewable-energy position his profile documents — and it is labeled plainly as a campaign-account statement so the source type is unmistakable." }),
  ],

  // ===== Ann Millner — Senate District 5 (Weber/Davis/Morgan) — was 2 ========
  amillner: [
    vidItem({ issueKey: 'econ_workers', billNum: 'SB17', day: 1, chamber: 'Senate', ts: '18:23', marker: 128528,
      headline: 'Presented her military-family licensure and tuition bill on the Senate floor (video at 18:23)',
      facts: "Millner chief-sponsored SB17 (2025), Services for Department of Defense Civilian Employees, exempting certain Department of Defense employees and their spouses who hold a valid out-of-state license from Utah occupational and professional licensure, granting in-state tuition for those families, and addressing K-12 enrollment requirements for their children. The official Senate floor video opens to her presentation on Day 1 of the 2025 session at 18:23; the bill was signed into law.",
      why: "Workforce development is a keyissue her profile names, and clearing licensure and tuition barriers so defense-connected families can work and study in Utah is a recorded, enacted action in her own words on a previously thin profile." }),
  ],

  // ===== Andrew Stoddard — House District 40 (Murray) — was 2 ================
  andrew_stoddard: [
    vidItem({ issueKey: 'justice_reform', billNum: 'HB222', day: 22, chamber: 'House', ts: '50:02', marker: 129547,
      headline: 'Presented his traffic-accident evidence access bill on the House floor (video at 50:02)',
      facts: "Stoddard chief-sponsored HB222 (2025), Access to Traffic Accident Evidence, providing for disclosure of certain unredacted accident records to an attorney representing a person involved in the accident and defining liability if a protected record is unlawfully shared publicly. The official House floor video opens to his presentation on Day 22 of the 2025 session at 50:02; the bill was signed into law.",
      why: "Consumer and tort reform is a keyissue his profile names, and giving accident victims' attorneys lawful access to the evidence they need is a recorded, enacted action in his own words." }),
  ],

  // ===== Ashlee Matthews — House District 37 (Kearns) — was 2 ================
  ashlee_matthews: [
    vidItem({ issueKey: 'enviro_balance', billNum: 'HB251', day: 22, chamber: 'House', ts: '1:05:01', marker: 129588,
      headline: 'Presented her bill making the state pollinator habitat program permanent (video at 1:05:01)',
      facts: "Matthews chief-sponsored HB251 (2025), Pollinator Program Amendments, renaming the pollinator pilot program the pollinator habitat program, repealing its scheduled sunset, and making the program permanent. The official House floor video opens to her presentation on Day 22 of the 2025 session at 1:05:01; the bill was signed into law.",
      why: "Pollinator habitat and environment is a keyissue her profile names, and making the habitat program permanent is a recorded, enacted follow-through in her own words." }),
    vidItem({ issueKey: 'transit', billNum: 'HB161', day: 15, chamber: 'House', ts: '1:07:08', marker: 129110, tags: ['Notable Actions', 'Consistency'],
      headline: 'Floor-sponsored her student-transportation eligibility bill (video at 1:07:08)',
      facts: "Matthews chief-sponsored HB161 (2025), School Bus Route Amendments, amending student eligibility for state-supported transportation. The official House floor video opens to her presentation on Day 15 of the 2025 session at 1:07:08; the bill was signed into law.",
      why: "Transportation and transit safety is a keyissue her profile names, and adjusting who qualifies for school-bus service is a recorded, enacted action backing it." }),
  ],

  // ===== Calvin Roberts — House District 46 (Utah County) — was 2 ============
  calvin_roberts: [
    vidItem({ issueKey: 'transit', billNum: 'HB471', day: 31, chamber: 'House', ts: '15:39', marker: 130368,
      headline: 'Presented his transit-vehicle procurement bill on the House floor (video at 15:39)',
      facts: "Roberts chief-sponsored HB471 (2025), Transportation Procurement Amendments, authorizing the Department of Transportation to use cooperative purchasing agreements to procure transit vehicles. The official House floor video opens to his presentation on Day 31 of the 2025 session at 15:39; the bill was signed into law.",
      why: "Transportation procurement is the keyissue his profile names, and letting the state buy transit vehicles through cooperative agreements is a recorded, enacted action in his own words." }),
  ],

  // ===== Evan Vickers — Senate District 28 (Iron/Washington, rural) — was 2 ==
  evickers: [
    vidItem({ issueKey: 'water', billNum: 'SB33', day: 1, chamber: 'Senate', ts: '50:28', marker: 128545,
      headline: 'Presented his water-rights recording bill on the Senate floor (video at 50:28)',
      facts: "Vickers chief-sponsored SB33 (2025), Water Rights Recording Amendments, allowing certain water-rights signatures to be made by facsimile or electronic means. The official Senate floor video opens to his presentation on Day 1 of the 2025 session at 50:28; the bill was signed into law.",
      why: "Water rights is a keyissue this southern-Utah member's profile names, and modernizing how water-rights filings are signed and recorded is a recorded, enacted action in his own words." }),
  ],

  // ===== Heidi Balderree — Senate District 22 (Salt Lake County) — was 2 ====
  heidi_balderree: [
    vidItem({ issueKey: 'public_schools', billNum: 'SB1', day: 9, chamber: 'Senate', ts: '18:18', marker: 128834,
      headline: 'Carried the public-education base budget on the Senate floor (video at 18:18)',
      facts: "Balderree chief-sponsored SB1 (2025), Public Education Base Budget Amendments, appropriating funds for school districts, charter schools and state education agencies and setting the value of the weighted pupil unit at $4,674 for fiscal year 2025-2026. The official Senate floor video opens to her presentation on Day 9 of the 2025 session at 18:18; the bill was signed into law.",
      why: "Public-education funding is a keyissue her profile names, and chief-sponsoring the base budget that sets per-pupil funding is a recorded, enacted action in her own words." }),
    vidItem({ issueKey: 'property_rights', billNum: 'SB55', day: 3, chamber: 'Senate', ts: '39:29', marker: 128634, tags: ['Notable Actions', 'Consistency'],
      headline: 'Presented her unauthorized-use of real property bill on the Senate floor (video at 39:29)',
      facts: "Balderree chief-sponsored SB55 (2025), Unauthorized Use of Real Property Amendments, addressing remedies and procedures when a person occupies or uses real property without authorization. The official Senate floor video opens to her presentation on Day 3 of the 2025 session at 39:29; the bill was signed into law.",
      why: "Property rights and taxpayer protections is a keyissue her profile names, and strengthening owners' options against unauthorized use of their property is a recorded, enacted follow-through." }),
  ],

  // ===== Jennifer Plumb — Senate District 9 (Salt Lake City) — was 2 ========
  jennifer_plumb: [
    vidItem({ issueKey: 'health_mental', billNum: 'SB115', day: 18, chamber: 'Senate', ts: '33:35', marker: 129363,
      headline: 'Presented her substance-use screening bill for jails on the Senate floor (video at 33:35)',
      facts: "Plumb chief-sponsored SB115 (2025), Substance Use Disorder Revisions, requiring state correctional facilities and county jails to screen inmates for substance use disorders, report screening data, and use the results to guide treatment and programming decisions. The official Senate floor video opens to her presentation on Day 18 of the 2025 session at 33:35; the bill was signed into law.",
      why: "Substance-use disorder and harm reduction is the keyissue her profile leads with, and requiring jails to screen for and act on addiction is a recorded, enacted action in her own words — the area her work as a physician centers on." }),
  ],

  // ===== Karen Kwan — Senate District 12 (Salt Lake County) — was 2 =========
  karen_kwan: [
    vidItem({ issueKey: 'back_police', billNum: 'SB144', day: 35, chamber: 'Senate', ts: '1:12:23', marker: 130570,
      headline: 'Presented her child sexual-exploitation penalties bill on the Senate floor (video at 1:12:23)',
      facts: "Kwan chief-sponsored SB144 (2025), Sexual Crimes Amendments, expanding the definition of child sexual abuse material, changing the mental state required for sexual-exploitation offenses to include accessing such material with intent to view, and providing a narrow safe-harbor for employees who must view it within the scope of their work. The official Senate floor video opens to her presentation on Day 35 of the 2025 session at 1:12:23; the bill was signed into law.",
      why: "Child protection and public safety is a keyissue her profile names, and closing gaps in the state's child-exploitation statutes is a recorded, enacted action in her own words." }),
  ],

  // ===== Karen M. Peterson — House District 13 (Davis County) — was 2 =======
  karen_m_peterson: [
    vidItem({ issueKey: 'edu_college_cost', billNum: 'HB1', day: 8, chamber: 'House', ts: '14:31', marker: 128785,
      headline: 'Carried the higher-education base budget on the House floor (video at 14:31)',
      facts: "Peterson chief-sponsored HB1 (2025), Higher Education Base Budget, appropriating funds for the support of Utah's higher-education agencies and institutions and estimating the total higher-education budgets for the year. The official House floor video opens to her presentation on Day 8 of the 2025 session at 14:31; the bill was signed into law.",
      why: "Higher-education funding and reform is the keyissue her profile leads with, and chief-sponsoring the base budget that funds the state's colleges and universities is a recorded, enacted action in her own words." }),
  ],

  // ===== Kathleen Riebe — Senate District 15 (Salt Lake County) — was 2 =====
  kriebe: [
    vidItem({ issueKey: 'healthcare', billNum: 'SB229', day: 28, chamber: 'Senate', ts: '1:43:48', marker: 129939,
      headline: 'Presented her organ-donor registry bill on the Senate floor (video at 1:43:48)',
      facts: "Riebe chief-sponsored SB229 (2025), Organ Donor Amendments, requiring that information about the option to register as an organ donor, and instructions for reaching a donor registry, be provided with individual income-tax booklets. The official Senate floor video opens to her presentation on Day 28 of the 2025 session at 1:43:48; the bill was signed into law.",
      why: "Organ donation and public health is a keyissue her profile names, and putting donor-registration information in front of every income-tax filer is a recorded, enacted action in her own words." }),
  ],

  // ===== Luz Escamilla — Senate District 10 (Salt Lake City) — was 2 ========
  lescamilla: [
    vidItem({ issueKey: 'public_schools', billNum: 'SB170', day: 22, chamber: 'Senate', ts: '52:08', marker: 129587,
      headline: 'Presented her school physical-restraint standards bill on the Senate floor (video at 52:08)',
      facts: "Escamilla chief-sponsored SB170 (2025), School Discipline Amendments, consolidating school physical-intervention law into a single section, setting standards for the use of physical restraint and seclusion in schools, and requiring local education agencies to collect and report data on incidents of student confinement. The official Senate floor video opens to her presentation on Day 22 of the 2025 session at 52:08; the bill was signed into law.",
      why: "Education access and student protection are keyissues her profile names, and setting enforceable limits on restraint and seclusion in schools is a recorded, enacted action in her own words." }),
    vidItem({ issueKey: 'healthcare', billNum: 'SB284', day: 35, chamber: 'Senate', ts: '1:02:14', marker: 130566, tags: ['Notable Actions', 'Consistency'],
      headline: 'Presented her Medicaid doula-coverage bill on the Senate floor (video at 1:02:14)',
      facts: "Escamilla chief-sponsored SB284 (2025), Medicaid Doula Services, requiring the Department of Health and Human Services to seek a Medicaid state plan amendment to cover doula services and to set training and registration requirements for doulas serving Medicaid enrollees. The official Senate floor video opens to her presentation on Day 35 of the 2025 session at 1:02:14; the bill was signed into law.",
      why: "Healthcare access and women's health are keyissues her profile names, and adding doula services to Medicaid is a recorded, enacted follow-through in her own words." }),
  ],

  // ===== Melissa Ballard — House District 20 (Davis County) — was 2 =========
  mballard: [
    vidItem({ issueKey: 'gov_waste', billNum: 'HB317', day: 22, chamber: 'House', ts: '1:32:04', marker: 129601,
      headline: 'Presented her government-efficiency incentives bill on the House floor (video at 1:32:04)',
      facts: "Ballard chief-sponsored HB317 (2025), Executive Agency Innovation Incentives, revising how certain funds may be treated as nonlapsing and directing the Governor's Office of Planning and Budget to identify, reward, and measure cost- and time-saving efficiency improvements by state agencies and employees. The official House floor video opens to her presentation on Day 22 of the 2025 session at 1:32:04; the bill was signed into law.",
      why: "Government efficiency and transparency is a keyissue her profile names, and building rewards for measurable agency savings is a recorded, enacted action in her own words." }),
  ],

  // ===== Steve Eliason — House District 43 (Sandy) — was 2 ===================
  seliason: [
    vidItem({ issueKey: 'health_mental', billNum: 'HB39', day: 29, chamber: 'House', ts: '51:40', marker: 130040,
      headline: 'Presented his correctional mental-health care bill on the House floor (video at 51:40)',
      facts: "Eliason chief-sponsored HB39 (2025), Correctional Health Amendments, requiring the Department of Health and Human Services to contract for telehealth psychiatric consultation for staff caring for inmates, to staff correctional psychiatry, and to help connect offenders to community-based services after assessment. The official House floor video opens to his presentation on Day 29 of the 2025 session at 51:40; the bill was signed into law.",
      why: "Correctional and behavioral-health care is a keyissue his profile names, and strengthening psychiatric care inside corrections and the handoff to community services is a recorded, enacted action in his own words." }),
  ],

};

// ── apply ───────────────────────────────────────────────────────────────────
function hk(s) { return String(s || '').toLowerCase().replace(/\s+/g, ' ').trim().slice(0, 70); }

async function getDoc(id) {
  const r = await fetch(`${BASE}/${id}`);
  if (!r.ok) return null;
  const j = await r.json();
  const o = {};
  for (const [k, val] of Object.entries(j.fields || {})) o[k] = dec(val);
  o.__fields = j.fields || {};
  return o;
}

async function patchSpotlight(id, fields, spotlight) {
  fields.spotlight = enc(spotlight);
  fields.updatedAt = enc(STAMP);
  const url = `${BASE}/${id}?` +
    Object.keys(fields).map(k => 'updateMask.fieldPaths=' + encodeURIComponent(k)).join('&');
  const r = await fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields }),
  });
  if (!r.ok) throw new Error(`PATCH ${id} -> ${r.status} ${await r.text()}`);
}

let totalNew = 0, totalLeg = 0, vid = 0, xp = 0;
const issueTally = {};
const legWithX = new Set();

for (const [id, items] of Object.entries(PLAN)) {
  const doc = await getDoc(id);
  if (!doc) { console.log(`!! MISSING doc: ${id}`); continue; }
  const existing = Array.isArray(doc.spotlight) ? doc.spotlight : [];
  const seen = new Set(existing.map(s => hk(s.headline || s.title)));
  const toAdd = items.filter(it => !seen.has(hk(it.headline)));
  if (!toAdd.length) { console.log(`= ${id}: nothing new (${existing.length} existing)`); continue; }
  totalLeg++;
  toAdd.forEach(it => {
    totalNew++;
    if (it.sourceType === 'x_post') { xp++; legWithX.add(id); } else vid++;
    if (it.issueKey) issueTally[it.issueKey] = (issueTally[it.issueKey] || 0) + 1;
  });
  const merged = existing.concat(toAdd);
  console.log(`+ ${id} (${doc.name}): +${toAdd.length} [${existing.length} -> ${merged.length}]`);
  toAdd.forEach(it => console.log(`    • [${it.sourceType === 'x_post' ? 'X' : 'video ' + it.media.timestamp}] ${it.headline}  #${it.issueKey}`));
  if (APPLY) {
    await patchSpotlight(id, doc.__fields, merged);
    console.log('    ✓ written');
  }
}

console.log('\n──────── summary ────────');
console.log(`legislators touched   : ${totalLeg}`);
console.log(`new spotlight items   : ${totalNew}`);
console.log(`  official floor video : ${vid}`);
console.log(`  X posts (verified)   : ${xp}  (legislators: ${[...legWithX].join(', ')})`);
console.log('issue tally :', Object.entries(issueTally).sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k}=${n}`).join(', '));
console.log(APPLY ? '\nAPPLIED to Firestore.' : '\nDRY RUN — re-run with --apply to write.');
