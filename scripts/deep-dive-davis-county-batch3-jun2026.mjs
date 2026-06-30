#!/usr/bin/env node
// ---------------------------------------------------------------------------
// PolitiDex — Davis County deep dive, BATCH 3 (June 2026)
//
// Batch 1 deepened the SITTING Davis County state legislators; Batch 2 covered
// the COUNTY & MUNICIPAL tier (Petro, Crofts, Parke, Atkin, Harris, Lee). This
// batch closes the next honest gap: the ACTIVE 2026 LEGISLATIVE CANDIDATES who
// will actually appear on Davis County's November 3, 2026 ballot — the open-seat
// challengers a voter guide most needs but who carried thin stance records and
// ZERO Spotlight/Evidence receipts.
//
// Roster (status verified against June 23, 2026 primary results before inclusion):
//
//   • lili_bitner    — Lili Bitner,  HD17 (R). WON the June 23 primary over Sam
//                       Barlow 70.87%–29.13%; advances to November.            ✓ active
//   • brandon_young  — Brandon Young, HD14 (D). Advanced unopposed from the April
//                       Democratic convention; faces John Taylor in November.   ✓ active
//   • john_taylor    — John Taylor,  HD14 (R). WON the June 23 primary over Kara
//                       Toone 56.26%–43.74%; advances to November.             ✓ active
//   • bob_stevenson  — Bob Stevenson, HD16 (R). WON the June 23 primary over
//                       incumbent Rep. Trevor Lee 66.09%–33.91%; advances.     ✓ active
//
// DELIBERATELY EXCLUDED (lost / no longer in the 2026 cycle — left untouched):
//   • sam_barlow      — lost the HD17 primary to Bitner.
//   • kara_toone      — lost the HD14 primary to Taylor.
//   • adam_sorenson   — eliminated at the HD17 convention.
//   • trevor_lee      — incumbent, lost the HD16 primary to Stevenson.
//   (HD13 — Erik Craythorne (R) / Jeffrey Anderson (D) — left for a later pass:
//    both are filed nominees heading to November, but their stance records were
//    not deep enough to source receipts to this batch's verification bar.)
//
// Honesty rules (matching CONTENT_STYLE.md and the Batch 1/2 deep dives):
//   • Nothing invented. Every receipt carries a real {label,url} `source` that was
//     fetched/confirmed during research (Standard-Examiner, Salt Lake Tribune, KSL,
//     Deseret News, Utah Lt. Governor candidate filings, and each candidate's own
//     campaign site).
//   • Three of the four (Bitner, Young, Taylor) are FIRST-TIME candidates with NO
//     governing record. Their receipts are therefore campaign positions and
//     electoral facts tagged impact:'neutral' — documented standing, never
//     score-inflating "wins." Campaign pledges are labeled as campaign pledges.
//   • Bob Stevenson is the exception: a sitting Davis County commissioner with a
//     genuine governing record, so his receipts ARE impact-tagged — balanced to
//     show BOTH his push for a smaller 9.9% county tax increase AND his deciding
//     vote for the 14.9% hike, a real rhetoric-vs-reality point against his 2026
//     "address rising property taxes" campaign message.
//   • Idempotent & non-destructive: re-fetches the live doc, only adds stance
//     topics that aren't already present, only writes a theme when none exists,
//     never clobbers a profile that already carries impact-tagged Spotlight
//     drivers, and only sets candidacyStatus/Outcome when they are missing.
//     One surgical exception: a known copy-paste bug in Bitner's "Housing
//     Affordability" stance (it described taxes, not housing) is corrected ONLY
//     if its text still exactly matches the buggy string.
//
//   node scripts/deep-dive-davis-county-batch3-jun2026.mjs            # dry run (default)
//   node scripts/deep-dive-davis-county-batch3-jun2026.mjs --apply    # write to Firestore
// ---------------------------------------------------------------------------

const PROJECT = 'politidex-979bd';
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/politicians`;
const APPLY = process.argv.includes('--apply');
const STAMP = '2026-06-30T00:00:00.000Z';

// The exact buggy string in Bitner's Housing Affordability stance (describes
// taxes, not housing). Corrected only if the live value still matches this.
const BITNER_HOUSING_BUG = 'Campaigned on a commitment to oppose unnecessary tax increases.';

// ── Curated, sourced deep-dive data (keyed by Firestore doc id) ──────────────
const DATA = {
  lili_bitner: {
    candidacyStatus: 'active',
    candidacyOutcome:
      'Won the June 23, 2026 Republican primary in House District 17 over Sam Barlow (70.87% to 29.13%); advances to the November 3, 2026 general election.',
    theme:
      "A nearly two-decade Republican delegate and organizer who won the open HD17 primary decisively; with no prior elected office, her record so far is campaign commitments — favoring technology-driven water and Great Salt Lake solutions, opposing one-size-fits-all state housing mandates, and backing parental involvement and local control in education.",
    spotlight: [
      { impact: 'neutral', category: 'voting', date: '2026', tags: ['Notable Actions'],
        headline: 'Won the open HD17 Republican primary decisively, advancing to November',
        facts: "Bitner won the June 23, 2026 Republican primary for the open House District 17 seat (being vacated by retiring Rep. Stewart Barlow), defeating Sam Barlow — the retiring representative's son — 70.87% (4,264 votes) to 29.13% (1,753). Barlow conceded, posting that he 'will not be the next representative for District 17.' With no Democrat filed, the primary winner is the heavy favorite in November.",
        why: 'A first-time candidate’s decisive open-seat primary win is the central fact of her path to the Legislature, shown here as context rather than a governing record to judge.',
        source: { label: 'Standard-Examiner', url: 'https://www.standard.net/news/local/2026/jun/23/election-results-multiple-incumbents-concede-two-davis-county-races-within-a-percent/' } },
      { impact: 'neutral', category: 'voting', date: '2026', tags: ['Notable Actions'],
        headline: 'Dominated the April Davis County GOP convention and also qualified by signature',
        facts: "At the April 18, 2026 Davis County Republican Convention, Bitner secured 84.5% of the second-round delegate vote to Sam Barlow's 15.5%, and had already qualified for the primary ballot by gathering signatures. She has served nearly 20 years as a county and state delegate and as Legislative Chair for House Districts 16 and 17.",
        why: 'Her dual-track ballot access (a dominant convention vote plus a signature filing) documents broad delegate standing heading into the primary.',
        source: { label: 'Standard-Examiner', url: 'https://www.standard.net/news/2026/apr/18/lili-bitner-wins-big-at-davis-county-republican-convention-bob-stevenson-tops-trevor-lee/' } },
      { impact: 'neutral', category: 'rhetoric', date: '2026', tags: ['Public Statements'],
        headline: 'Campaigns against "one-size-fits-all" state housing mandates',
        facts: "In a June 8, 2026 Standard-Examiner profile, Bitner said some Davis County areas have 'not room to build anything more, and yet there are these one-size-fits-all mandates that have been handed down from the state that are forcing housing solutions that I think are actually destructive to the housing market.' She also said first-time-homebuyer credits should be 'extended to all first-time homebuyers rather than just those buying new constructions.' These are campaign positions; she has no legislative voting record.",
        why: 'A specific, on-the-record housing position — local control over state density mandates — that voters can weigh against her eventual votes if elected.',
        source: { label: 'Standard-Examiner', url: 'https://www.standard.net/news/2026/jun/08/lili-bitner-wants-to-bring-her-grit-determination-and-mothers-voice-to-house-district-17-seat/' } },
      { impact: 'neutral', category: 'rhetoric', date: '2026', tags: ['Public Statements'],
        headline: 'Frames Utah’s water and Great Salt Lake challenge as "solvable" with new technology',
        facts: "In the same June 8, 2026 profile, Bitner said: 'We need to take advantage of newer technologies so that we can address a water issue that I think is solvable... there is technology that should allow us to implement strategies that will help us to drastically improve our water situation.' Her campaign site pairs this with 'locally driven solutions that conserve water, protect the Great Salt Lake, [and] preserve access to the outdoors' while respecting private-property rights. Campaign position; no record yet.",
        why: 'It stakes out an optimistic, technology-and-conservation framing on a top Davis County issue, distinct from a regulatory or mandate-driven approach.',
        source: { label: 'Standard-Examiner', url: 'https://www.standard.net/news/2026/jun/08/lili-bitner-wants-to-bring-her-grit-determination-and-mothers-voice-to-house-district-17-seat/' } },
      { impact: 'neutral', category: 'rhetoric', date: '2026', tags: ['Public Statements'],
        headline: 'Campaign pledge: keep taxes low and oppose "unnecessary or irresponsible" increases',
        facts: "Bitner's campaign 'Priorities' page pledges to keep taxes low and state spending responsible — ensuring tax dollars are spent 'wisely and efficiently' and opposing 'unnecessary or irresponsible tax increases' — and to keep government 'accountable and transparent,' with decisions made close to families and local communities. On education she backs 'high standards, parental involvement, and local control,' opposing 'a one-size-fits-all approach from the state or federal government.' These are stated campaign commitments, not a governing record.",
        why: 'It documents the fiscal and education positions at the center of her candidacy directly from her own campaign, clearly marked as pledges rather than enacted policy.',
        source: { label: 'Bitner campaign — Priorities', url: 'https://www.votebitner.com/priorities' } },
    ],
    stances: {
      'K-12 Education & Parental Rights':
        "Campaign position: backs 'high standards, parental involvement, and local control in education,' supporting parents and teachers 'without imposing a one-size-fits-all approach from the state or federal government.' No legislative voting record yet.",
      'Housing & Growth':
        "Campaign position: opposes 'one-size-fits-all' state housing mandates, arguing some built-out Davis County areas have no room to grow and that such mandates are 'destructive to the housing market'; would extend first-time-homebuyer credits to all buyers, not only those purchasing new construction (Standard-Examiner, June 8, 2026).",
    },
  },

  brandon_young: {
    candidacyStatus: 'active',
    candidacyOutcome:
      'Advanced unopposed from the April 2026 Democratic convention for the open House District 14 seat (Clearfield/Syracuse); faces Republican nominee John Taylor in the November 3, 2026 general election.',
    theme:
      "The Democratic nominee for the open HD14 seat and a first-time candidate (a digital-media producer) running on 'Economy. Education. Environment.' — backing sales-tax relief on essentials and a higher minimum wage, opposing private-school vouchers, and championing a Great Salt Lake '2034 Charter' — with no legislative voting record yet.",
    spotlight: [
      { impact: 'neutral', category: 'rhetoric', date: '2026', tags: ['Public Statements'],
        headline: 'Campaign platform: cut sales tax on essentials, expand child tax credits, raise the minimum wage',
        facts: "Young's campaign site frames the economy around 'reduc[ing] the cost of living, protect[ing] wages, and prevent[ing] price exploitation,' including eliminating the sales tax on essential goods and expanding child tax credits. He notes 'the minimum wage has not been increased since 2009' and supports raising it, plus 'tiered tax incentives for businesses that pay higher wages.' These are 2026 campaign pledges; he has no legislative voting record.",
        why: 'It documents the specific cost-of-living and tax mechanisms at the center of his candidacy, drawn directly from his own platform.',
        source: { label: 'Young for House (campaign site)', url: 'https://www.youngforhouse.com/' } },
      { impact: 'neutral', category: 'rhetoric', date: '2026', tags: ['Public Statements'],
        headline: 'Opposes private-school vouchers; backs a 20-student elementary class cap',
        facts: "On education, Young says vouchers 'divert taxpayer dollars away from neighborhood public schools' and that 'no elementary classroom should exceed 20 students without a mandatory additional aide.' He notes Utah per-student spending 'remains well below the national average' and cites the Davis School District's '$10 million lawsuit' in calling for more transparency and accountability. Campaign position; no voting record.",
        why: 'A clear, specific K-12 position — opposition to vouchers and a hard class-size standard — that contrasts with the prevailing direction of recent Utah education policy.',
        source: { label: 'Young for House (campaign site)', url: 'https://www.youngforhouse.com/' } },
      { impact: 'neutral', category: 'rhetoric', date: '2026', tags: ['Public Statements'],
        headline: 'Backs a Great Salt Lake "2034 Charter," water leasing, and tougher air-quality rules',
        facts: "Young calls preservation of the Great Salt Lake 'of utmost importance now more than ever,' supporting a 'Great Salt Lake 2034 Charter,' agricultural water leasing, and restrictions on mineral extraction. On air quality he notes roughly 48% of pollution 'comes from mobile sources' and backs modernizing transportation, expanded transit, and EV incentives; he opposes proposals to 'transfer or sell federal public lands.' Campaign positions; no voting record.",
        why: 'It stakes out a detailed environmental agenda — lake restoration, water leasing, and public-lands protection — that voters can weigh against his eventual votes if elected.',
        source: { label: 'Young for House (campaign site)', url: 'https://www.youngforhouse.com/' } },
      { impact: 'neutral', category: 'rhetoric', date: '2026', tags: ['Public Statements'],
        headline: 'Says housing markets "have failed"; supports rent stabilization and just-cause eviction',
        facts: "Young states 'Housing is a basic need, and the markets have failed to keep housing affordable,' backing rent stabilization and just-cause eviction laws while opposing 'corporate landlords, private equity firms, and large speculative investors' and protecting small-scale landlords. Campaign position; no voting record.",
        why: 'A specific renter-protection and anti-speculation housing stance, distinct from the supply-side approaches favored by several of his Davis County opponents.',
        source: { label: 'Young for House (campaign site)', url: 'https://www.youngforhouse.com/' } },
      { impact: 'neutral', category: 'voting', date: '2026', tags: ['Notable Actions'],
        headline: 'On the November ballot as the HD14 Democratic nominee for an open seat',
        facts: "Young is the filed Democratic candidate for the open House District 14 seat (Clearfield/Syracuse area), which opened when Republican Rep. Karianne Lisonbee chose to run for U.S. Congress rather than seek re-election. Per the Utah Lt. Governor's official 2026 candidate filings he advances to the November 3, 2026 general election, where he faces Republican nominee John Taylor.",
        why: 'It documents his confirmed place on the general-election ballot — the precondition for any future record — shown here as neutral context.',
        source: { label: 'Utah Lt. Governor — 2026 candidate filing (HD14)', url: 'https://vote.utah.gov/2026-candidate-filings/' } },
    ],
    stances: {
      'Transportation & Transit':
        "Campaign position: ties transportation to air quality (about 48% of pollution 'comes from mobile sources'), backing modernized transportation, expanded public transit, improved commuter rail and bus service, and EV incentives. No voting record yet.",
      'Public Lands & Energy':
        "Campaign position: opposes proposals to 'transfer or sell federal public lands' and is cautiously open to nuclear power as a 'reliable, carbon-free source of power' while stressing water-use concerns and oversight. No voting record yet.",
    },
  },

  john_taylor: {
    candidacyStatus: 'active',
    candidacyOutcome:
      'Won the June 23, 2026 Republican primary in House District 14 over Kara Toone (56.26% to 43.74%); advances to the November 3, 2026 general election against Democrat Brandon Young.',
    theme:
      "The HD14 Republican nominee — an Army veteran and first-time candidate recruited by retiring Rep. Karianne Lisonbee — who won the open-seat primary on a 'conservative discernment' platform: treating overspending and inflation as threats to families, resisting state high-density-housing mandates, and taking a cautious, results-only line on Great Salt Lake spending. No governing record yet.",
    spotlight: [
      { impact: 'neutral', category: 'voting', date: '2026', tags: ['Notable Actions'],
        headline: 'Won the open HD14 Republican primary; advances to November',
        facts: "Taylor won the June 23, 2026 Republican primary for the open House District 14 seat 56.26% (1,914 votes) to Kara Toone's 43.74% (1,488); Toone conceded. He had earlier won the Davis County Republican convention endorsement with 78% of the delegate vote. The seat opened when Rep. Karianne Lisonbee chose to run for U.S. Congress. He faces Democrat Brandon Young in November.",
        why: 'A first-time candidate’s open-seat primary win is the central fact of his path to the Legislature, shown as context rather than a governing record.',
        source: { label: 'Standard-Examiner', url: 'https://www.standard.net/news/local/2026/jun/23/election-results-multiple-incumbents-concede-two-davis-county-races-within-a-percent/' } },
      { impact: 'neutral', category: 'rhetoric', date: '2026', tags: ['Public Statements'],
        headline: 'Calls out-of-control spending the root issue; warns seniors could be "priced out"',
        facts: "In a May 19, 2026 Standard-Examiner profile, Taylor said 'everything – everything – stems from out-of-control spending,' citing the federal debt and calling money-printing 'the silent theft.' He spoke against the Davis County property-tax increase, warning seniors on fixed incomes could be 'priced out of their home,' and framed his approach as 'conservative discernment' rooted in 'limited government, smaller government.' Campaign positions; he has no voting record.",
        why: 'It documents his core fiscal message — spending restraint and property-tax skepticism — directly from an on-the-record interview.',
        source: { label: 'Standard-Examiner', url: 'https://www.standard.net/news/2026/may/19/john-taylor-touts-lisonbee-support-conservative-discernment-in-house-district-14-race/' } },
      { impact: 'neutral', category: 'rhetoric', date: '2026', tags: ['Public Statements'],
        headline: 'Calls state high-density-housing mandates "almost a government overreach"',
        facts: "In the same May 19, 2026 profile, Taylor criticized state mandates on high-density housing as 'almost a government overreach,' arguing 'city council members – they know what's best,' and tied housing pressure back to federal spending. He also wants developers of public infrastructure districts to 'disclose up front, maybe even in contract writing, what this district is and the bond.' Campaign positions; no voting record.",
        why: 'A specific local-control housing position and a transparency proposal on infrastructure-district bonding that voters can weigh against his future votes.',
        source: { label: 'Standard-Examiner', url: 'https://www.standard.net/news/2026/may/19/john-taylor-touts-lisonbee-support-conservative-discernment-in-house-district-14-race/' } },
      { impact: 'neutral', category: 'rhetoric', date: '2026', tags: ['Public Statements'],
        headline: 'Takes a cautious, "meaningful benefit only" line on Great Salt Lake spending',
        facts: "On the Great Salt Lake, Taylor cited the poor snow year and arsenic-dust risk but said: 'I don't want to throw a bunch of money at an environmental issue unless it goes to real, meaningful benefit,' wanting funds that 'actually help fill up the lake or cover the arsenic threat.' Campaign position; no voting record.",
        why: 'It distinguishes his results-and-cost-conditioned approach to lake spending from broader restoration commitments — a contrast voters can track.',
        source: { label: 'Standard-Examiner', url: 'https://www.standard.net/news/2026/may/19/john-taylor-touts-lisonbee-support-conservative-discernment-in-house-district-14-race/' } },
      { impact: 'neutral', category: 'rhetoric', date: '2026', tags: ['Public Statements'],
        headline: 'Split with his primary opponent over who should draw Utah’s political boundaries',
        facts: "A June 9, 2026 Salt Lake Tribune report on the HD14 Republican primary described Taylor and Kara Toone as split on redistricting: Taylor 'worries about the voice of the majority getting lost in the fray,' while Toone favored lawmakers listening to voters on redistricting policy. Taylor was recruited into the race by retiring Rep. Lisonbee, who he says viewed him as 'a principled conservative.' Campaign positions; no voting record.",
        why: 'Redistricting is a live Utah governance fight, and his stated wariness of diluting majority voice is a documented position heading into the general election.',
        source: { label: 'Salt Lake Tribune', url: 'https://www.sltrib.com/news/politics/2026/06/09/kara-toone-john-taylor-running/' } },
    ],
    stances: {
      'Great Salt Lake & Water':
        "Campaign position: supports addressing the Great Salt Lake and arsenic-dust risk but cautiously — 'I don't want to throw a bunch of money at an environmental issue unless it goes to real, meaningful benefit,' wanting spending that 'actually help[s] fill up the lake or cover the arsenic threat' (Standard-Examiner, May 19, 2026). No voting record yet.",
      'Redistricting & Representation':
        "Campaign position: on who should draw Utah's political boundaries, Taylor 'worries about the voice of the majority getting lost in the fray,' a stance that split him from his primary opponent (Salt Lake Tribune, June 9, 2026).",
    },
  },

  bob_stevenson: {
    // candidacyStatus / candidacyOutcome already set on the live doc — left as-is.
    theme:
      "A sitting Davis County commissioner, former Layton mayor and city councilman who unseated incumbent Rep. Trevor Lee in the HD16 primary. Unlike the open-seat newcomers, he has a real fiscal record — he pushed for a smaller 9.9% county property-tax increase backed by reserves, then cast the deciding vote for the 14.9% hike when his proposal failed, a tension worth weighing against his 2026 tax-relief message.",
    spotlight: [
      { impact: 'positive', category: 'voting', date: '2025', tags: ['Notable Actions', 'Consistency'],
        headline: 'Pushed for a smaller 9.9% county tax increase backed by reserves and "turnback"',
        facts: "Ahead of the December 2025 vote, Stevenson argued Davis County could limit its property-tax increase to no more than about 9.9% by also tapping reserves, contending the county 'will be more than healthy for at least the next two years before we have to look at anything else.' He cited a 'very hefty, very healthy fund balance' of roughly $30 million and an average annual budget 'turnback' of $6 million to $7 million (budgeted money not spent) as cushion against a larger hike.",
        why: "It documents an actual governing position — seeking the smallest viable increase using existing reserves — consistent with the fiscal-restraint message of his House campaign.",
        source: { label: 'Deseret News', url: 'https://www.deseret.com/utah/2025/11/08/davis-county-leaders-still-debating-proposed-30-property-tax-hike-as-2026-budget-talks-continue/' } },
      { impact: 'negative', category: 'voting', date: '2025', tags: ['Notable Actions', 'Rhetoric vs Reality'],
        headline: "Cast the deciding vote for Davis County's first property-tax hike since 2017",
        facts: "On December 2, 2025, after Stevenson's 9.9% proposal and Commissioner John Crofts's motion both failed, Chair Lorene Kamalu moved to adopt a 14.9% increase and Stevenson voted with her to pass it 2-1 over Crofts's objection — the county's first property-tax increase since 2017, raising about $6 million. Nearly 300 residents had turned out in opposition during a hearing that ran more than two hours. The original October proposal had floated a hike of up to 30%.",
        why: "His yes vote on a 14.9% increase is a concrete fiscal action that voters can weigh against his 2026 campaign pledge to 'address rising property taxes,' even though he had sought a smaller number first.",
        source: { label: 'KSL', url: 'https://www.ksl.com/article/51413684/davis-county-commission-oks-149-property-tax-increase' } },
      { impact: 'neutral', category: 'voting', date: '2026', tags: ['Notable Actions'],
        headline: 'Unseated incumbent Rep. Trevor Lee in the HD16 Republican primary',
        facts: "Stevenson won the June 23, 2026 Republican primary for House District 16 (Layton area) 66.09% (3,029 votes) to incumbent Rep. Trevor Lee's 33.91% (1,554); Lee conceded, thanking supporters for their 'conservative vision for a stronger Utah.' Stevenson had also topped Lee at the April 18 Davis County Republican convention. With no Democrat filed, the primary winner is the heavy favorite in November.",
        why: 'A sitting commissioner defeating a two-term incumbent legislator in a primary is the consequential fact of his move from county to state office, shown as neutral context.',
        source: { label: 'Standard-Examiner', url: 'https://www.standard.net/news/local/2026/jun/23/election-results-multiple-incumbents-concede-two-davis-county-races-within-a-percent/' } },
      { impact: 'neutral', category: 'transparency', date: '2025', tags: ['Public Statements'],
        headline: 'Anchored the county tax debate in specific budget figures',
        facts: "Through the fall 2025 budget fight, Stevenson tied his position to concrete numbers — the roughly $30 million fund balance and the $6–$7 million in annual budget turnback — arguing those cushions justified a smaller increase than the 14.9% adopted or the up-to-30% first floated. Davis County leaders said the increase was driven by inflation and rising service demand, including public-safety wages.",
        why: 'He framed the tradeoffs in checkable budget terms rather than slogans, giving residents a documented basis to judge the eventual outcome.',
        source: { label: 'Deseret News', url: 'https://www.deseret.com/utah/2025/12/03/davis-county-commission-oks-149-property-tax-increase/' } },
    ],
    stances: {
      'County Budget & Property-Tax Vote (Record)':
        "Governing record: as a Davis County commissioner, Stevenson argued the 2026 budget could be balanced with a roughly 9.9% property-tax increase plus reserves — citing a ~$30M fund balance and $6–$7M in annual 'turnback' — but voted with Chair Kamalu to pass the larger 14.9% increase 2-1 on Dec. 2, 2025 when his smaller proposal failed (KSL; Deseret News). It is the clearest fiscal action behind his 2026 'address rising property taxes' campaign message.",
    },
  },
};

// ── Firestore value encoder / decoder ───────────────────────────────────────
function enc(v) {
  if (v === null || v === undefined) return { nullValue: null };
  if (typeof v === 'string') return { stringValue: v };
  if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(enc) } };
  if (typeof v === 'object') { const f = {}; for (const [k, val] of Object.entries(v)) f[k] = enc(val); return { mapValue: { fields: f } }; }
  throw new Error('cannot encode value: ' + String(v));
}
function dec(v) {
  if (v.stringValue !== undefined) return v.stringValue;
  if (v.integerValue !== undefined) return parseInt(v.integerValue, 10);
  if (v.doubleValue !== undefined) return v.doubleValue;
  if (v.booleanValue !== undefined) return v.booleanValue;
  if (v.nullValue !== undefined) return null;
  if (v.arrayValue !== undefined) return (v.arrayValue.values || []).map(dec);
  if (v.mapValue !== undefined) { const o = {}; for (const [k, val] of Object.entries(v.mapValue.fields || {})) o[k] = dec(val); return o; }
  return null;
}

// ── Firestore I/O ───────────────────────────────────────────────────────────
async function getDoc(id) {
  const r = await fetch(`${BASE}/${id}`);
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(`fetch ${id}: HTTP ${r.status}`);
  const j = await r.json();
  const o = {};
  for (const [k, v] of Object.entries(j.fields || {})) o[k] = dec(v);
  return o;
}
async function patch(id, fields) {
  const qs = Object.keys(fields).map((m) => 'updateMask.fieldPaths=' + encodeURIComponent(m)).join('&');
  const body = { fields: {} };
  for (const [k, v] of Object.entries(fields)) body.fields[k] = enc(v);
  const r = await fetch(`${BASE}/${id}?${qs}`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`patch ${id}: HTTP ${r.status} — ${(await r.text()).slice(0, 200)}`);
}

// Whether a doc already carries impact-tagged Spotlight drivers (never clobber).
function hasDrivers(doc) {
  const sl = Array.isArray(doc.spotlight) ? doc.spotlight : [];
  return sl.some((it) => it && (it.impact === 'positive' || it.impact === 'negative'));
}

// ── Main ────────────────────────────────────────────────────────────────────
(async () => {
  console.log(`PolitiDex — Davis County deep dive (batch 3: active 2026 legislative candidates)  [${APPLY ? 'APPLY' : 'DRY RUN'}]\n`);
  let touched = 0, missing = 0, skippedDrivers = 0;
  let totSpot = 0, totStance = 0, totStatus = 0;

  for (const [id, plan] of Object.entries(DATA)) {
    let doc;
    try { doc = await getDoc(id); } catch (e) { console.log(`  ✗ ${id}: ${e.message}`); missing++; continue; }
    if (!doc) { console.log(`  – ${id}: not in Firestore — skipped`); missing++; continue; }

    const fields = { updatedAt: STAMP };

    // 1) Spotlight receipts (only if none yet) + theme
    let addedSpot = 0;
    if (hasDrivers(doc)) {
      console.log(`  • ${id} (${doc.name}): already has Spotlight drivers — leaving spotlight untouched`);
      skippedDrivers++;
    } else if (plan.spotlight && plan.spotlight.length) {
      const existing = Array.isArray(doc.spotlight) ? doc.spotlight : [];
      fields.spotlight = plan.spotlight.concat(existing);
      addedSpot = plan.spotlight.length;
      if (plan.theme && !(typeof doc.spotlightTheme === 'string' && doc.spotlightTheme.trim())) {
        fields.spotlightTheme = plan.theme;
      }
    }

    // 2) Issue positions — merge new topics, never overwrite existing…
    let addedStance = 0;
    const stances = (doc.stances && typeof doc.stances === 'object' && !Array.isArray(doc.stances)) ? { ...doc.stances } : {};
    for (const [topic, text] of Object.entries(plan.stances || {})) {
      if (!(topic in stances)) { stances[topic] = text; addedStance++; }
    }
    // …with one surgical correction: Bitner's mislabeled Housing Affordability
    // stance (it described taxes). Fixed only if it still matches the known bug.
    let fixedStance = 0;
    if (id === 'lili_bitner' && stances['Housing Affordability'] === BITNER_HOUSING_BUG) {
      stances['Housing Affordability'] =
        "Campaign position: opposes one-size-fits-all state housing mandates, favoring local control and extending first-time-homebuyer credits to all buyers; no legislative voting record yet.";
      fixedStance = 1;
    }
    if (addedStance || fixedStance) fields.stances = stances;

    // 3) Candidacy status / outcome — only set when missing (never overwrite).
    let setStatus = 0;
    if (plan.candidacyStatus && doc.candidacyStatus !== 'active') {
      fields.candidacyStatus = plan.candidacyStatus; setStatus = 1;
    }
    if (plan.candidacyOutcome && !(typeof doc.candidacyOutcome === 'string' && doc.candidacyOutcome.trim())) {
      fields.candidacyOutcome = plan.candidacyOutcome; setStatus = 1;
    }

    totSpot += addedSpot; totStance += (addedStance + fixedStance); totStatus += setStatus;
    console.log(`  ${APPLY ? '✎' : '→'} ${id} (${doc.name}): +${addedSpot} receipt(s), +${addedStance} stance(s)${fixedStance ? ', 1 stance corrected' : ''}${setStatus ? ', candidacy status/outcome set' : ''}`);

    // Only write if something actually changed beyond the timestamp
    if (Object.keys(fields).length > 1) {
      if (APPLY) await patch(id, fields);
      touched++;
    }
  }

  console.log(`\n${APPLY ? 'Applied' : 'Would apply'} to ${touched} profile(s): ${totSpot} receipt(s), ${totStance} stance change(s), ${totStatus} candidacy field-set(s).`);
  console.log(`(${skippedDrivers} already had spotlight drivers; ${missing} not found.)`);
  if (!APPLY) console.log('\nRe-run with --apply to write to Firestore.');
})();
